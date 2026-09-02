"""
Library router — serves cleaned RTU papers with watermarks removed.

The /clean-pdf endpoint proxies PDFs from Supabase Storage, uses PyMuPDF
to redact the rtuonline.com promotional watermark from the last page,
caches the result, and streams back the clean PDF.
"""

import io
import re
import logging
import os
import urllib.request
import urllib.parse
from functools import lru_cache

import fitz  # PyMuPDF
from fastapi import APIRouter, HTTPException, Query, Request, Response
from fastapi.responses import StreamingResponse

from app.database import supabase, r2_client, R2_BUCKET_NAME, R2_PUBLIC_URL

logger = logging.getLogger(__name__)

router = APIRouter()

LIBRARY_BUCKET = "library-papers"

# ── Watermark detection patterns ──
# Text fragments that identify the rtuonline.com watermark
WATERMARK_PATTERNS = [
    re.compile(r"rtuonline\.com", re.IGNORECASE),
    re.compile(r"whatsapp\s*@\s*\d{10}", re.IGNORECASE),
    re.compile(r"send\s+your\s+old\s+paper", re.IGNORECASE),
    re.compile(r"paytm\s+or\s+google\s+pay", re.IGNORECASE),
    re.compile(r"अपने\s+पुराने\s+पेपर", re.IGNORECASE),
    re.compile(r"रुपये\s+पायें", re.IGNORECASE),
    re.compile(r"get\s+10/?-", re.IGNORECASE),
]

# Maximum PDF size we'll process (30 MB)
MAX_PDF_SIZE = 30 * 1024 * 1024


def _has_watermark(page: fitz.Page) -> bool:
    """Check whether a page contains rtuonline.com watermark text."""
    text = page.get_text()
    return any(pat.search(text) for pat in WATERMARK_PATTERNS)


def _redact_watermark(pdf_bytes: bytes) -> bytes:
    """
    Remove the rtuonline.com watermark from the last page of a PDF.

    Strategy:
    1. Open PDF, check the last page for watermark text.
    2. If found, search for every watermark pattern and redact those regions
       (replace with white rectangles).
    3. Return the modified PDF bytes.
    """
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")

    try:
        if len(doc) == 0:
            return pdf_bytes

        last_page = doc[-1]

        if not _has_watermark(last_page):
            return pdf_bytes

        # Find all text instances matching watermark patterns and redact them
        redaction_added = False
        for pattern in WATERMARK_PATTERNS:
            # Search page text for each pattern
            text_instances = last_page.search_for(pattern.pattern.replace("\\s*", " ").replace("\\s+", " ").replace("\\d{10}", "9300930012").replace("/?-", "/-"))
            if text_instances:
                for rect in text_instances:
                    last_page.add_redact_annot(rect, fill=(1, 1, 1))  # white fill
                    redaction_added = True

        # Also do a brute-force text-block approach: find text blocks in the
        # watermark region (typically the top ~40% or bottom area of the last page)
        page_height = last_page.rect.height
        page_width = last_page.rect.width
        blocks = last_page.get_text("blocks")  # (x0, y0, x1, y1, text, block_no, block_type)

        for block in blocks:
            if block[6] != 0:  # skip image blocks
                continue
            block_text = block[4]
            if any(pat.search(block_text) for pat in WATERMARK_PATTERNS):
                rect = fitz.Rect(block[0], block[1], block[2], block[3])
                last_page.add_redact_annot(rect, fill=(1, 1, 1))
                redaction_added = True

        if redaction_added:
            last_page.apply_redactions()
            logger.info("Watermark redacted from last page")

        # Save to bytes
        out = io.BytesIO()
        doc.save(out, garbage=4, deflate=True)
        return out.getvalue()

    finally:
        doc.close()


# ── LRU cache for processed PDFs ──
# Key = storage path, Value = cleaned PDF bytes
# Cache up to 100 unique papers (~60 MB assuming avg 600 KB each)
@lru_cache(maxsize=100)
def _get_cleaned_pdf(storage_path: str) -> bytes:
    """Fetch a PDF from R2 (via S3 or HTTP public CDN) or Supabase, clean it, and cache."""
    raw_bytes = None

    # 1. Try S3 client (primary)
    if r2_client:
        try:
            logger.info("Downloading %s via R2 S3 client", storage_path)
            response = r2_client.get_object(Bucket=R2_BUCKET_NAME, Key=f"library-papers/{storage_path}")
            raw_bytes = response["Body"].read()
        except Exception as r2_err:
            logger.warning("R2 S3 download failed for %s: %s", storage_path, r2_err)

    # 2. Try HTTP download from R2 Public CDN (robust fallback for SSL/TLS issues in dev)
    if not raw_bytes and R2_PUBLIC_URL:
        try:
            parts = storage_path.split("/")
            encoded_parts = [urllib.parse.quote(part) for part in parts]
            cdn_url = f"{R2_PUBLIC_URL.rstrip('/')}/library-papers/{'/'.join(encoded_parts)}"
            logger.info("Downloading %s via R2 HTTP Public CDN: %s", storage_path, cdn_url)
            req = urllib.request.Request(
                cdn_url,
                headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
            )
            with urllib.request.urlopen(req, timeout=5) as resp:
                raw_bytes = resp.read()
        except Exception as cdn_err:
            logger.warning("R2 HTTP Public CDN download failed for %s: %s", storage_path, cdn_err)

    if not raw_bytes:
        raise HTTPException(status_code=404, detail="Paper not found in storage.")

    if len(raw_bytes) > MAX_PDF_SIZE:
        raise HTTPException(status_code=413, detail="PDF too large to process.")

    # Validate it's actually a PDF
    if not raw_bytes[:4].startswith(b"%PDF"):
        raise HTTPException(status_code=422, detail="File is not a valid PDF.")

    try:
        return _redact_watermark(raw_bytes)
    except Exception as e:
        logger.warning("Watermark removal failed for %s: %s — serving original", storage_path, e)
        # Graceful degradation: serve the original if redaction fails
        return raw_bytes


@router.api_route("/clean-pdf", methods=["GET", "HEAD"])
async def get_clean_pdf(
    request: Request,
    path: str = Query(
        ...,
        description="Storage path inside the library-papers bucket, e.g. rtu-csit/Sem 3/Data Structures And Algorithms 2024.pdf",
    ),
):
    """
    Proxy endpoint that serves RTU papers with the rtuonline.com watermark removed.

    - HEAD requests: lightweight existence check (no download)
    - GET requests: fetch, redact watermark, stream cleaned PDF
    """
    # ── Input validation ──
    path = path.strip()

    # Must be a valid library paper path
    valid_prefixes = ("rtu/", "rtu-", "cbse-", "jee-", "neet/", "upsc-", "cat/", "gate/")
    if not any(path.startswith(p) for p in valid_prefixes):
        raise HTTPException(status_code=400, detail="Only library paper paths are supported.")

    # Must end with .pdf
    if not path.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Path must point to a PDF file.")

    # Block path traversal
    if ".." in path or path.startswith("/"):
        raise HTTPException(status_code=400, detail="Invalid path.")

    # ── HEAD request: lightweight existence check ──
    if request.method == "HEAD":
        try:
            # 1. Try S3 Client
            if r2_client:
                try:
                    r2_client.head_object(Bucket=R2_BUCKET_NAME, Key=f"library-papers/{path}")
                    return Response(status_code=200, headers={"Content-Type": "application/pdf"})
                except Exception:
                    pass

            # 2. Try R2 Public CDN (HTTP HEAD)
            if R2_PUBLIC_URL:
                try:
                    parts = path.split("/")
                    encoded_parts = [urllib.parse.quote(part) for part in parts]
                    cdn_url = f"{R2_PUBLIC_URL.rstrip('/')}/library-papers/{'/'.join(encoded_parts)}"
                    req = urllib.request.Request(
                        cdn_url,
                        method="HEAD",
                        headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
                    )
                    with urllib.request.urlopen(req) as resp:
                        if resp.status == 200:
                            return Response(status_code=200, headers={"Content-Type": "application/pdf"})
                except Exception:
                    pass

            raise HTTPException(status_code=404, detail="Paper not found.")
        except HTTPException:
            raise
        except Exception as e:
            logger.error("HEAD check failed for %s: %s", path, e)
            raise HTTPException(status_code=404, detail="Paper not found.")

    # ── GET request: full download + watermark removal ──
    cleaned_bytes = _get_cleaned_pdf(path)

    return StreamingResponse(
        io.BytesIO(cleaned_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": "inline",
            "Cache-Control": "public, max-age=86400",  # Browser cache 24h
        },
    )


@router.get("/list-papers")
async def list_papers(
    folder: str = Query(
        ...,
        description="Storage folder inside library-papers bucket, e.g. rtu-ce/Sem 3",
    ),
):
    """
    List all PDF files in a given storage folder.
    
    Uses the backend service key so the frontend anon key doesn't need
    list permissions on the storage bucket. Returns a JSON array of filenames.
    
    Fallback chain: R2 S3 API → Supabase Storage → static manifest file.
    """
    folder = folder.strip().rstrip("/")

    # Block path traversal
    if ".." in folder or folder.startswith("/"):
        raise HTTPException(status_code=400, detail="Invalid folder path.")

    # Only allow listing within RTU, CBSE, JEE, NEET folders
    valid_prefixes = ("rtu/", "rtu-", "cbse-", "jee-", "neet", "upsc-", "cat/", "gate")
    if not any(folder.startswith(p) for p in valid_prefixes):
        raise HTTPException(status_code=400, detail="Only library paper folders are supported.")

    try:
        if r2_client:
            try:
                # List objects in R2 under library-papers/{folder}/
                prefix = f"library-papers/{folder}/"
                r2_response = r2_client.list_objects_v2(Bucket=R2_BUCKET_NAME, Prefix=prefix, MaxKeys=500)
                return [
                    {"name": obj["Key"].split("/")[-1]}
                    for obj in r2_response.get("Contents", [])
                    if obj["Key"].endswith(".pdf")
                ]
            except Exception as r2_err:
                logger.warning("R2 list failed for %s: %s — falling back to static manifest", folder, r2_err)
                return _list_from_manifest(folder)
        else:
            logger.warning("R2 client not configured — falling back to static manifest")
            return _list_from_manifest(folder)
    except Exception as e:
        logger.error("Failed to list folder %s: %s", folder, e)
        # Try manifest fallback before giving up
        manifest_result = _list_from_manifest(folder)
        if manifest_result:
            return manifest_result
        raise HTTPException(status_code=500, detail="Failed to list papers.")


def _list_from_manifest(folder: str) -> list:
    """
    Fallback: read paper list from a static JSON manifest file.
    The manifest maps folder paths (e.g. 'rtu-csit/Sem 3') to lists of filenames.
    """
    import json
    manifest_path = os.path.join(os.path.dirname(__file__), "..", "r2_paper_manifest.json")
    try:
        with open(manifest_path) as f:
            manifest = json.load(f)
        files = manifest.get(folder, [])
        if files:
            logger.info("Serving %d papers for %s from static manifest", len(files), folder)
        return [{"name": name} for name in files if name.endswith(".pdf")]
    except Exception as e:
        logger.warning("Manifest fallback failed for %s: %s", folder, e)
        return []
