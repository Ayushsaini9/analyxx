#!/usr/bin/env python3
"""
Scrape RTU B.Tech 1st Year Engineering Mathematics-I papers (2006–2026)
and upload directly to Cloudflare R2. No Supabase storage.

Pipeline:
  1. Audit R2 CDN — check which year papers already exist
  2. Scrape rtuquestionpapers.com — discover PDF links
  3. Check local disk for already-downloaded files
  4. Download missing PDFs
  5. Upload to R2 at: library-papers/rtu-1styear/Sem 1/Engineering Mathematics-I {year}.pdf
  6. Update backend r2_paper_manifest.json

Sources:
  - https://www.rtuquestionpapers.com/btech/*/sem-1  (multiple branch slugs)
  - https://cdn.rtuquestionpapers.com (CDN PDF links)
  - Local files in papers_to_upload/

Usage:
  python scrape_em1_papers.py
"""

import os
import re
import sys
import json
import time
import urllib.parse
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Set, Tuple

import requests
from bs4 import BeautifulSoup

try:
    from playwright.sync_api import sync_playwright
    HAS_PLAYWRIGHT = True
except ImportError:
    HAS_PLAYWRIGHT = False

from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "backend", ".env"))

# ── Config ──
BASE_DIR = Path(__file__).parent
DOWNLOAD_DIR = BASE_DIR / "papers_to_upload" / "RTU_EM1"
DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)

MANIFEST_FILE = DOWNLOAD_DIR / "em1_manifest.json"

R2_CDN_URL = "https://pub-5d418c0acdfa4e9ba673215eb5998a3b.r2.dev/library-papers"
SITE_BASE = "https://www.rtuquestionpapers.com"
CDN_BASE = "https://cdn.rtuquestionpapers.com"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
}

# Year range: past 20 years (RTU established 2006)
MIN_YEAR = 2006
MAX_YEAR = 2026

# R2 storage path config
STORAGE_FOLDER = "rtu-1styear"
SEMESTER = 1
SUBJECT_NAME = "Engineering Mathematics-I"
R2_KEY_PREFIX = "library-papers"

# Patterns for matching Engineering Mathematics-1 in filenames/slugs
EM1_PATTERNS = [
    r'engineering.?mathematics.?1',
    r'engineering.?mathematics.?i(?!\w)',   # EM-I but not EM-II
    r'engineering.?math.?1',
    r'engg.?mathematics.?1',
    r'engg.?math.?1',
    r'\bem[\s_-]?1\b',
    r'mathematics.?1.?(?:1e3101|11n501|1e\d{4})',
]

# Known local paper files (manually uploaded, different naming)
LOCAL_PAPER_DIRS = [
    BASE_DIR / "papers_to_upload" / "Rtu  first year",
    BASE_DIR / "papers_to_upload" / "RTU_ALL_YEARS" / "rtu-1styear" / "sem-1",
]

# Backend manifest to update
BACKEND_MANIFEST_PATH = BASE_DIR / "backend" / "app" / "r2_paper_manifest.json"
WHATSAPP_MANIFEST_PATH = BASE_DIR / "whatsapp-bot" / "src" / "r2_paper_manifest.json"


# ══════════════════════════════════════════════════════════════════════════════
# R2 Audit — check which papers already exist
# ══════════════════════════════════════════════════════════════════════════════

def audit_r2() -> Tuple[Set[int], Set[int]]:
    """HEAD-check R2 CDN for each year. Returns (existing_years, missing_years)."""
    existing = set()
    missing = set()

    print(f"\n📊 Auditing R2 for Engineering Mathematics-I ({MIN_YEAR}–{MAX_YEAR})...\n")

    for year in range(MIN_YEAR, MAX_YEAR + 1):
        path = f"{STORAGE_FOLDER}/Sem {SEMESTER}/{SUBJECT_NAME} {year}.pdf"
        url = f"{R2_CDN_URL}/{urllib.parse.quote(path)}"
        try:
            resp = requests.head(url, timeout=8, allow_redirects=True)
            if resp.status_code == 200:
                existing.add(year)
                print(f"  ✅ {year} — already in R2")
            else:
                missing.add(year)
                print(f"  ❌ {year} — missing (HTTP {resp.status_code})")
        except Exception as e:
            missing.add(year)
            print(f"  ❌ {year} — error: {str(e)[:50]}")

    return existing, missing


# ══════════════════════════════════════════════════════════════════════════════
# Scraping — discover PDF links from the website
# ══════════════════════════════════════════════════════════════════════════════

def is_em1_link(filename: str, link_text: str = "") -> bool:
    """Check if a filename or link text refers to Engineering Mathematics-1."""
    combined = f"{filename} {link_text}".lower()

    # Exclude Engineering Mathematics-2 / II
    if re.search(r'mathematics.?(?:2|ii)\b', combined, re.IGNORECASE):
        return False
    if re.search(r'\bem[\s_-]?2\b', combined, re.IGNORECASE):
        return False

    # Must be semester 1
    sem_match = re.search(r'-(\d+)-sem-', filename, re.IGNORECASE)
    if sem_match:
        sem = int(sem_match.group(1))
        if sem != 1:
            return False

    for pattern in EM1_PATTERNS:
        if re.search(pattern, combined, re.IGNORECASE):
            return True

    return False


def extract_year_from_filename(filename: str) -> Optional[int]:
    """Extract year from PDF filename."""
    # Pattern: -YYYY.pdf or _YYYY.pdf
    match = re.search(r'[-_](\d{4})(?:\(\d\))?\.pdf$', filename, re.IGNORECASE)
    if match:
        year = int(match.group(1))
        if MIN_YEAR <= year <= MAX_YEAR:
            return year

    # Pattern: YYYY in filename
    match = re.search(r'(\d{4})', filename)
    if match:
        year = int(match.group(1))
        if MIN_YEAR <= year <= MAX_YEAR:
            return year

    return None


def crawl_semester_page(branch_slug: str) -> List[dict]:
    """Crawl a single semester page for EM-1 PDF links."""
    url = f"{SITE_BASE}/btech/{branch_slug}/sem-1"
    papers = []

    try:
        resp = requests.get(url, headers=HEADERS, timeout=15)
        if resp.status_code != 200:
            return papers

        soup = BeautifulSoup(resp.text, "html.parser")
        for a in soup.find_all("a", href=True):
            href = a["href"]
            if ".pdf" not in href.lower():
                continue

            if not href.startswith("http"):
                href = urllib.parse.urljoin(url, href)

            filename = href.split("/")[-1]
            link_text = a.get_text(strip=True)

            if is_em1_link(filename, link_text):
                year = extract_year_from_filename(filename)
                if year:
                    papers.append({
                        "year": year,
                        "url": href,
                        "filename": filename,
                        "source": f"rtuquestionpapers.com/{branch_slug}",
                    })

    except Exception as e:
        print(f"     ⚠️  Error crawling {branch_slug}: {str(e)[:80]}")

    # Playwright fallback for JS-rendered pages
    if not papers and HAS_PLAYWRIGHT:
        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                ctx = browser.new_context(user_agent=HEADERS["User-Agent"])
                page = ctx.new_page()
                page.goto(url, timeout=20000)
                page.wait_for_timeout(3000)
                links = page.evaluate("""
                    () => {
                        const results = [];
                        document.querySelectorAll('a[href]').forEach(a => {
                            const href = a.href || '';
                            if (href.toLowerCase().includes('.pdf')) {
                                results.push({ href, text: a.textContent.trim() });
                            }
                        });
                        return results;
                    }
                """)
                browser.close()

                for link in links:
                    href = link["href"]
                    filename = href.split("/")[-1]
                    if is_em1_link(filename, link.get("text", "")):
                        year = extract_year_from_filename(filename)
                        if year:
                            papers.append({
                                "year": year,
                                "url": href,
                                "filename": filename,
                                "source": f"playwright/{branch_slug}",
                            })
        except Exception as e:
            print(f"     ⚠️  Playwright error: {str(e)[:80]}")

    return papers


def try_direct_cdn_urls(missing_years: Set[int]) -> List[dict]:
    """
    Try constructing CDN URLs directly for missing years.
    Known patterns from rtuquestionpapers.com CDN.
    """
    papers = []
    # Known URL patterns for Engineering Mathematics-1 on the CDN
    url_patterns = [
        # 2018+ scheme: 1e3101
        "btech-1-sem-engineering-mathematics-1-1e3101-{year}.pdf",
        # Older scheme: 11n501
        "btech-1-sem-engineering-mathematics-1-11n501-{year}.pdf",
        "btech-1-sem-engineering-mathematics-1-11n501-may-{year}.pdf",
        # Even older scheme codes
        "btech-1-sem-engineering-mathematics-1-1e1451-{year}.pdf",
        "btech-1-sem-engineering-mathematics-1-1e1621-{year}.pdf",
        "btech-1-sem-mathematics-1-1e1451-{year}.pdf",
        "btech-1-sem-mathematics-1-1e2071-{year}.pdf",
        # Generic patterns
        "btech-1-sem-engineering-mathematics-i-{year}.pdf",
        "btech-1-sem-engineering-mathematics-1-{year}.pdf",
        # Jan/Jun/Dec variants
        "btech-1-sem-engineering-mathematics-1-1e3101-jan-{year}.pdf",
        "btech-1-sem-engineering-mathematics-1-1e3101-jun-{year}.pdf",
        "btech-1-sem-engineering-mathematics-1-1e3101-dec-{year}.pdf",
        "btech-1-sem-engineering-mathematics-1-11n501-jan-{year}.pdf",
        "btech-1-sem-engineering-mathematics-1-11n501-jun-{year}.pdf",
        "btech-1-sem-engineering-mathematics-1-11n501-dec-{year}.pdf",
    ]

    for year in sorted(missing_years):
        for pattern in url_patterns:
            filename = pattern.format(year=year)
            url = f"{CDN_BASE}/{filename}"
            try:
                resp = requests.head(url, headers=HEADERS, timeout=8, allow_redirects=True)
                if resp.status_code == 200:
                    # Verify it's actually a PDF
                    content_type = resp.headers.get("content-type", "")
                    content_length = int(resp.headers.get("content-length", 0))
                    if content_length > 5000:
                        papers.append({
                            "year": year,
                            "url": url,
                            "filename": filename,
                            "source": "direct-cdn",
                        })
                        print(f"  🎯 {year} — found via CDN: {filename}")
                        break  # Found for this year, move to next
            except Exception:
                continue

    return papers


def scrape_all_sources(missing_years: Set[int]) -> Dict[int, dict]:
    """Scrape all sources and return best paper per year."""
    papers_by_year: Dict[int, dict] = {}

    # Source 1: Crawl website with multiple branch slugs (1st year is common)
    print(f"\n🕷️  Scraping rtuquestionpapers.com for EM-1 papers...\n")
    branch_slugs = [
        "COMMON", "first-year", "1st-year",
        "computer-science", "cs-it", "cs",
        "civil", "mechanical", "electrical",
    ]

    for slug in branch_slugs:
        print(f"  🌐 Trying: /btech/{slug}/sem-1")
        papers = crawl_semester_page(slug)
        if papers:
            print(f"     Found {len(papers)} EM-1 papers")
            for p in papers:
                year = p["year"]
                if year in missing_years and year not in papers_by_year:
                    papers_by_year[year] = p
            break  # 1st year is common across branches, one successful crawl is enough
        time.sleep(0.5)

    # Source 2: Direct CDN URL probing for still-missing years
    still_missing = missing_years - set(papers_by_year.keys())
    if still_missing:
        print(f"\n🔍 Probing CDN directly for {len(still_missing)} missing years: {sorted(still_missing)}")
        cdn_papers = try_direct_cdn_urls(still_missing)
        for p in cdn_papers:
            year = p["year"]
            if year not in papers_by_year:
                papers_by_year[year] = p

    return papers_by_year


# ══════════════════════════════════════════════════════════════════════════════
# Local file discovery — check for already-downloaded papers
# ══════════════════════════════════════════════════════════════════════════════

def find_local_papers(missing_years: Set[int]) -> Dict[int, Path]:
    """Search local directories for EM-1 papers that match missing years."""
    found: Dict[int, Path] = {}

    print(f"\n📂 Searching local disk for EM-1 papers...\n")

    for search_dir in LOCAL_PAPER_DIRS:
        if not search_dir.exists():
            continue

        for f in search_dir.iterdir():
            if not f.is_file() or not f.name.lower().endswith(".pdf"):
                continue

            # Check if it's an EM-1 paper
            if is_em1_link(f.name, ""):
                year = extract_year_from_filename(f.name)
                if year and year in missing_years and year not in found:
                    # Validate PDF
                    if f.stat().st_size > 5000:
                        with open(f, "rb") as fh:
                            if fh.read(5) == b'%PDF-':
                                found[year] = f
                                print(f"  📄 {year} — found locally: {f.name}")

    # Also check the download dir itself
    for f in DOWNLOAD_DIR.iterdir():
        if f.is_file() and f.name.lower().endswith(".pdf"):
            if is_em1_link(f.name, ""):
                year = extract_year_from_filename(f.name)
                if year and year in missing_years and year not in found:
                    if f.stat().st_size > 5000:
                        with open(f, "rb") as fh:
                            if fh.read(5) == b'%PDF-':
                                found[year] = f
                                print(f"  📄 {year} — found locally: {f.name}")

    return found


# ══════════════════════════════════════════════════════════════════════════════
# Download PDFs
# ══════════════════════════════════════════════════════════════════════════════

def download_pdf(url: str, save_path: Path) -> bool:
    """Download a PDF with validation."""
    if save_path.exists() and save_path.stat().st_size > 5000:
        return True

    try:
        resp = requests.get(url, headers=HEADERS, timeout=60, stream=True, allow_redirects=True)
        if resp.status_code != 200:
            return False

        content = resp.content
        if not content[:5] == b'%PDF-':
            return False
        if len(content) < 5000:
            return False

        save_path.parent.mkdir(parents=True, exist_ok=True)
        with open(save_path, "wb") as f:
            f.write(content)

        return True
    except Exception as e:
        print(f"    ⚠️  Download error: {str(e)[:60]}")
        return False


# ══════════════════════════════════════════════════════════════════════════════
# Upload to R2 (Direct — NO Supabase)
# ══════════════════════════════════════════════════════════════════════════════

def get_r2_client():
    """Create boto3 R2 client."""
    import boto3
    from botocore.config import Config

    endpoint = os.getenv("R2_ENDPOINT_URL")
    access_key = os.getenv("R2_ACCESS_KEY_ID")
    secret_key = os.getenv("R2_SECRET_ACCESS_KEY")

    if not all([endpoint, access_key, secret_key]):
        print("❌ R2 credentials not found in backend/.env")
        print("   Required: R2_ENDPOINT_URL, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY")
        sys.exit(1)

    return boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        config=Config(signature_version="s3v4"),
        region_name="auto",
    )


def upload_to_r2(r2_client, local_path: Path, year: int, max_retries: int = 3) -> bool:
    """Upload a single EM-1 PDF to R2."""
    bucket = os.getenv("R2_BUCKET_NAME", "analyxx-papers")
    storage_path = f"{STORAGE_FOLDER}/Sem {SEMESTER}/{SUBJECT_NAME} {year}.pdf"
    r2_key = f"{R2_KEY_PREFIX}/{storage_path}"

    for attempt in range(1, max_retries + 1):
        try:
            with open(local_path, "rb") as f:
                r2_client.put_object(
                    Bucket=bucket,
                    Key=r2_key,
                    Body=f.read(),
                    ContentType="application/pdf",
                )
            return True
        except Exception as e:
            if attempt < max_retries:
                print(f"    ⚠️  R2 attempt {attempt}/{max_retries}: {str(e)[:60]}")
                time.sleep(3)
            else:
                print(f"    ❌ R2 upload failed after {max_retries} attempts: {str(e)[:80]}")
                return False


# ══════════════════════════════════════════════════════════════════════════════
# Update backend manifest
# ══════════════════════════════════════════════════════════════════════════════

def update_manifests(all_years_in_r2: Set[int]):
    """Update the backend and WhatsApp bot r2_paper_manifest.json files."""
    manifest_key = f"{STORAGE_FOLDER}/Sem {SEMESTER}"

    for manifest_path in [BACKEND_MANIFEST_PATH, WHATSAPP_MANIFEST_PATH]:
        if not manifest_path.exists():
            print(f"  ⚠️  Manifest not found: {manifest_path}")
            continue

        try:
            with open(manifest_path, "r") as f:
                manifest = json.load(f)

            # Build the expected filenames
            expected_files = sorted(
                [f"{SUBJECT_NAME} {year}.pdf" for year in sorted(all_years_in_r2)],
                key=lambda x: x  # alphabetical = chronological since YYYY is at end
            )

            # Get existing files for this folder
            existing_files = manifest.get(manifest_key, [])

            # Merge: keep existing non-EM1 files, replace EM1 entries
            non_em1_files = [
                f for f in existing_files
                if not f.lower().startswith("engineering mathematics-i")
                and not f.lower().startswith("engineering mathematics i")
            ]
            merged = sorted(set(non_em1_files + expected_files))
            manifest[manifest_key] = merged

            with open(manifest_path, "w") as f:
                json.dump(manifest, f, indent=2)

            print(f"  ✅ Updated: {manifest_path.name} ({len(expected_files)} EM-1 entries)")

        except Exception as e:
            print(f"  ❌ Error updating {manifest_path.name}: {str(e)[:80]}")


# ══════════════════════════════════════════════════════════════════════════════
# Main
# ══════════════════════════════════════════════════════════════════════════════

def main():
    print(f"\n{'='*70}")
    print(f"🚀 RTU Engineering Mathematics-I Paper Scraper → Cloudflare R2")
    print(f"   Subject:     {SUBJECT_NAME}")
    print(f"   Semester:    {SEMESTER}")
    print(f"   Year range:  {MIN_YEAR}–{MAX_YEAR} (past 20 years)")
    print(f"   Storage:     Cloudflare R2 (direct, no Supabase)")
    print(f"   R2 path:     {R2_KEY_PREFIX}/{STORAGE_FOLDER}/Sem {SEMESTER}/")
    print(f"{'='*70}")

    # ── Step 1: Audit R2 ──
    existing_years, missing_years = audit_r2()
    print(f"\n{'='*70}")
    print(f"📊 R2 Audit Results:")
    print(f"   ✅ Already in R2: {len(existing_years)} papers — years {sorted(existing_years)}")
    print(f"   ❌ Missing:       {len(missing_years)} papers — years {sorted(missing_years)}")
    print(f"{'='*70}")

    if not missing_years:
        print(f"\n🎉 All {MAX_YEAR - MIN_YEAR + 1} years are already in R2! Nothing to do.")
        update_manifests(existing_years)
        return

    # ── Step 2: Find papers on local disk ──
    local_papers = find_local_papers(missing_years)
    still_missing = missing_years - set(local_papers.keys())

    # ── Step 3: Scrape web for remaining missing years ──
    scraped_papers: Dict[int, dict] = {}
    if still_missing:
        scraped_papers = scrape_all_sources(still_missing)
        still_missing = still_missing - set(scraped_papers.keys())

    # ── Summary before download/upload ──
    print(f"\n{'='*70}")
    print(f"📋 Action Plan:")
    if local_papers:
        print(f"   📂 Upload from local disk: {len(local_papers)} papers — years {sorted(local_papers.keys())}")
    if scraped_papers:
        print(f"   ⬇️  Download + upload:      {len(scraped_papers)} papers — years {sorted(scraped_papers.keys())}")
    if still_missing:
        print(f"   ❓ Could not find:          {len(still_missing)} papers — years {sorted(still_missing)}")
        print(f"      (RTU may not have conducted exams in these years, or papers aren't available online)")
    print(f"{'='*70}")

    total_to_process = len(local_papers) + len(scraped_papers)
    if total_to_process == 0:
        print(f"\n⚠️  No new papers to upload. The remaining years may not have papers available online.")
        update_manifests(existing_years)
        return

    # ── Step 4: Download scraped papers ──
    downloaded_papers: Dict[int, Path] = {}
    if scraped_papers:
        print(f"\n📥 Downloading {len(scraped_papers)} papers...\n")
        for year in sorted(scraped_papers.keys()):
            paper = scraped_papers[year]
            local_path = DOWNLOAD_DIR / f"engineering-mathematics-i-{year}.pdf"
            print(f"  ⬇️  {year} — {paper['filename'][:60]}...", end=" ")

            if download_pdf(paper["url"], local_path):
                size = local_path.stat().st_size
                print(f"✅ ({size:,} bytes)")
                downloaded_papers[year] = local_path
            else:
                print("❌ Failed")

            time.sleep(0.5)

    # Merge local + downloaded
    all_to_upload: Dict[int, Path] = {}
    all_to_upload.update(local_papers)
    all_to_upload.update(downloaded_papers)

    if not all_to_upload:
        print(f"\n⚠️  No papers successfully obtained for upload.")
        update_manifests(existing_years)
        return

    # ── Step 5: Upload to R2 ──
    print(f"\n☁️  Uploading {len(all_to_upload)} papers to Cloudflare R2...\n")
    r2 = get_r2_client()
    uploaded_years: Set[int] = set()
    failed_years: Set[int] = set()

    for i, (year, local_path) in enumerate(sorted(all_to_upload.items()), 1):
        storage_path = f"{STORAGE_FOLDER}/Sem {SEMESTER}/{SUBJECT_NAME} {year}.pdf"
        print(f"  [{i}/{len(all_to_upload)}] 📤 {storage_path}...", end=" ")

        if upload_to_r2(r2, local_path, year):
            print("✅")
            uploaded_years.add(year)
        else:
            print("❌")
            failed_years.add(year)

        time.sleep(0.3)

    # ── Step 6: Update manifests ──
    print(f"\n📝 Updating manifests...\n")
    all_in_r2 = existing_years | uploaded_years
    update_manifests(all_in_r2)

    # ── Save scrape manifest for records ──
    manifest = {
        "timestamp": datetime.now().isoformat(),
        "subject": SUBJECT_NAME,
        "semester": SEMESTER,
        "year_range": f"{MIN_YEAR}-{MAX_YEAR}",
        "already_in_r2": sorted(existing_years),
        "newly_uploaded": sorted(uploaded_years),
        "failed_uploads": sorted(failed_years),
        "not_found_online": sorted(still_missing - uploaded_years),
        "papers": [
            {
                "year": year,
                "local_path": str(all_to_upload.get(year, "")),
                "storage_path": f"{STORAGE_FOLDER}/Sem {SEMESTER}/{SUBJECT_NAME} {year}.pdf",
                "source": scraped_papers[year]["source"] if year in scraped_papers else "local-disk",
            }
            for year in sorted(all_to_upload.keys())
        ],
    }
    with open(MANIFEST_FILE, "w") as f:
        json.dump(manifest, f, indent=2)

    # ── Final Summary ──
    print(f"\n{'='*70}")
    print(f"🎉 Engineering Mathematics-I Scrape Complete!")
    print(f"{'='*70}")
    print(f"   📊 Total in R2 now:   {len(all_in_r2)} papers")
    print(f"   ✅ Already existed:    {len(existing_years)} papers ({sorted(existing_years)})")
    print(f"   📤 Newly uploaded:     {len(uploaded_years)} papers ({sorted(uploaded_years)})")
    if failed_years:
        print(f"   ❌ Failed uploads:     {len(failed_years)} papers ({sorted(failed_years)})")
    if still_missing - uploaded_years:
        unfound = sorted(still_missing - uploaded_years)
        print(f"   ❓ Not available:      {len(unfound)} years ({unfound})")
    print(f"")
    print(f"   📂 Downloads:  {DOWNLOAD_DIR}")
    print(f"   📋 Manifest:   {MANIFEST_FILE}")
    print(f"   🌐 R2 CDN:     {R2_CDN_URL}/{STORAGE_FOLDER}/Sem {SEMESTER}/")
    print(f"{'='*70}")


if __name__ == "__main__":
    main()
