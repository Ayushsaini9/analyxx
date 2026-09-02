"""
One-time script: Extract text from all library PDFs and populate library_papers table.

Scans the Supabase `library-papers` bucket, downloads each PDF, extracts text
using PyMuPDF, and upserts into the `library_papers` table.

Usage:
  cd backend
  python extract_library_texts.py              # Full run
  python extract_library_texts.py --dry-run    # Preview only
  python extract_library_texts.py --limit 10   # Process first 10 only
"""

import os
import re
import sys
import time
import argparse
import logging
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

import io
import fitz  # PyMuPDF
import pytesseract
from PIL import Image
from supabase import create_client, ClientOptions
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# ── Config ──
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
DATABASE_URL = os.getenv("SUPABASE_DATABASE_URL", os.getenv("DATABASE_URL"))
BUCKET = "library-papers"

supabase = create_client(
    SUPABASE_URL,
    SUPABASE_SERVICE_KEY,
    options=ClientOptions(storage_client_timeout=300),
)

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
Session = sessionmaker(bind=engine)


def extract_text_from_pdf_bytes(pdf_bytes: bytes) -> str:
    """Extract text from PDF. Falls back to OCR for scanned image PDFs."""
    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        # First try native text extraction
        pages_text = [page.get_text() for page in doc]
        native_text = "\n".join(pages_text).strip()
        if len(native_text) > 50:
            doc.close()
            return native_text
        # Fallback: OCR via pytesseract
        logger.info("  → Native text too short (%d chars), trying OCR...", len(native_text))
        ocr_pages = []
        for page_num, page in enumerate(doc):
            try:
                mat = fitz.Matrix(2.0, 2.0)  # 2x zoom for better OCR
                pix = page.get_pixmap(matrix=mat)
                img = Image.open(io.BytesIO(pix.tobytes("png")))
                page_text = pytesseract.image_to_string(img, lang="eng")
                ocr_pages.append(page_text)
            except Exception as e:
                logger.warning("  OCR failed on page %d: %s", page_num + 1, e)
        doc.close()
        return "\n".join(ocr_pages).strip()
    except Exception as e:
        logger.error("PDF extraction failed: %s", e)
        return ""


def parse_storage_path(path: str):
    """
    Parse a storage path into exam, branch, semester, subject, year.

    Patterns:
      rtu/{branch}/sem-{N}/{Subject}/{year}.pdf
      rtu-1st-year/{Subject}/{year}.pdf
      {exam}/{Subject}/{year}.pdf  (for JEE, NEET, etc.)
    """
    parts = path.replace("\\", "/").split("/")

    if not path.lower().endswith(".pdf"):
        return None

    # Extract year from filename
    # Supports both "2024.pdf" and descriptive names like "2024_jan_27jan_shift1.pdf"
    filename = parts[-1]
    year_match = re.match(r"(\d{4})(?:[_\-.])", filename, re.IGNORECASE)
    if not year_match:
        return None
    year = int(year_match.group(1))

    if path.startswith("rtu-1st-year/"):
        # rtu-1st-year/{Subject}/{year}.pdf
        if len(parts) < 3:
            return None
        subject = parts[1]
        return {
            "exam": "RTU",
            "branch": "1st-year",
            "semester": None,
            "subject": subject,
            "year": year,
        }

    if path.startswith("rtu/"):
        # rtu/{branch}/sem-{N}/{Subject}/{year}.pdf
        if len(parts) < 5:
            return None
        branch = parts[1]
        sem_match = re.match(r"sem-(\d+)", parts[2])
        semester = int(sem_match.group(1)) if sem_match else None
        subject = parts[3]
        return {
            "exam": "RTU",
            "branch": branch,
            "semester": semester,
            "subject": subject,
            "year": year,
        }

    # Generic: {exam}/{Subject}/{year}.pdf
    if len(parts) >= 3:
        exam = parts[0].upper()
        subject = parts[1]
        return {
            "exam": exam,
            "branch": None,
            "semester": None,
            "subject": subject,
            "year": year,
        }

    return None


def list_all_files(bucket: str, prefix: str = "") -> list[str]:
    """Recursively list all files in a Supabase Storage bucket."""
    all_files = []

    try:
        items = supabase.storage.from_(bucket).list(prefix, {"limit": 1000})
    except Exception as e:
        logger.error("Failed to list '%s': %s", prefix, e)
        return []

    for item in items:
        name = item.get("name", "")
        item_id = item.get("id")
        full_path = f"{prefix}/{name}".strip("/") if prefix else name

        if item_id is None:
            # It's a folder — recurse
            sub_files = list_all_files(bucket, full_path)
            all_files.extend(sub_files)
        else:
            # It's a file
            all_files.append(full_path)

    return all_files


def main():
    parser = argparse.ArgumentParser(description="Extract text from library PDFs")
    parser.add_argument("--dry-run", action="store_true", help="Preview only, no DB writes")
    parser.add_argument("--limit", type=int, default=0, help="Process only N files")
    parser.add_argument("--skip-existing", action="store_true", default=True,
                        help="Skip files already in DB (default: true)")
    parser.add_argument("--retry-failed", action="store_true",
                        help="Re-process papers that previously failed extraction")
    args = parser.parse_args()

    logger.info("Scanning bucket: %s", BUCKET)
    all_files = list_all_files(BUCKET)
    pdf_files = [f for f in all_files if f.lower().endswith(".pdf")]
    logger.info("Found %d PDF files", len(pdf_files))

    if args.limit > 0:
        pdf_files = pdf_files[:args.limit]
        logger.info("Limited to %d files", len(pdf_files))

    db = Session()
    stats = {"inserted": 0, "updated": 0, "skipped": 0, "failed": 0}

    try:
        # Get existing paths
        existing_paths = set()
        if args.retry_failed:
            # Only skip successfully extracted ones
            result = db.execute(text("SELECT storage_path FROM library_papers WHERE extraction_status = 'done'"))
            existing_paths = {row[0] for row in result}
            logger.info("Retrying failed — skipping %d already-done entries", len(existing_paths))
        elif args.skip_existing:
            result = db.execute(text("SELECT storage_path FROM library_papers"))
            existing_paths = {row[0] for row in result}
            logger.info("Found %d existing entries in DB", len(existing_paths))

        for i, path in enumerate(pdf_files):
            parsed = parse_storage_path(path)
            if not parsed:
                logger.warning("[%d/%d] Can't parse: %s", i + 1, len(pdf_files), path)
                stats["failed"] += 1
                continue

            if path in existing_paths:
                logger.debug("[%d/%d] Skipping (exists): %s", i + 1, len(pdf_files), path)
                stats["skipped"] += 1
                continue

            logger.info(
                "[%d/%d] Processing: %s → %s / %s / %d",
                i + 1, len(pdf_files), path,
                parsed["exam"], parsed["subject"], parsed["year"],
            )

            if args.dry_run:
                stats["inserted"] += 1
                continue

            # Download PDF
            try:
                pdf_bytes = supabase.storage.from_(BUCKET).download(path)
            except Exception as e:
                logger.error("  Download failed: %s", e)
                stats["failed"] += 1
                continue

            # Extract text
            extracted = extract_text_from_pdf_bytes(pdf_bytes)
            # Strip NUL bytes — PostgreSQL text columns reject \x00
            if extracted:
                extracted = extracted.replace("\x00", "")
            status = "done" if extracted and len(extracted) > 50 else "failed"

            if status == "failed":
                logger.warning("  Text extraction failed or too short (%d chars)", len(extracted))

            # Insert into DB
            try:
                db.execute(
                    text("""
                        INSERT INTO library_papers (exam, subject, year, branch, semester, storage_path, text, extraction_status)
                        VALUES (:exam, :subject, :year, :branch, :semester, :path, :text, :status)
                        ON CONFLICT (storage_path) DO UPDATE SET
                            text = EXCLUDED.text,
                            extraction_status = EXCLUDED.extraction_status
                    """),
                    {
                        "exam": parsed["exam"],
                        "subject": parsed["subject"],
                        "year": parsed["year"],
                        "branch": parsed["branch"],
                        "semester": parsed["semester"],
                        "path": path,
                        "text": extracted if status == "done" else None,
                        "status": status,
                    },
                )
                db.commit()
                stats["inserted"] += 1
                logger.info("  ✅ %s | %d chars extracted", status, len(extracted))
            except Exception as e:
                db.rollback()
                logger.error("  DB insert failed: %s", e)
                stats["failed"] += 1

            # Small delay to avoid rate limiting Supabase Storage
            time.sleep(0.2)

    finally:
        db.close()

    logger.info("\n" + "=" * 50)
    logger.info("DONE! Results:")
    logger.info("  ✅ Inserted/Updated: %d", stats["inserted"])
    logger.info("  ⏭️  Skipped (existing): %d", stats["skipped"])
    logger.info("  ❌ Failed: %d", stats["failed"])


if __name__ == "__main__":
    main()
