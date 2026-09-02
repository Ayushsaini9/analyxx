"""
Scrape JEE Mains PYQ papers (2006-2018) from MathonGo and upload to Cloudflare R2.

These years are NOT yet in R2 (2019-2025 already uploaded — 134 papers).
  - 2006-2012: AIEEE era (1 paper/year)
  - 2013-2018: Early JEE Mains (1-2 papers/year)

Strategy:
  1. Crawl MathonGo's JEE Main PYQ listing page (Playwright)
  2. Extract "Download PDF" links for 2006-2018
  3. Follow links.mathongo.com → Google Drive → download PDF
  4. Upload to R2 via Wrangler CLI (bypasses macOS SSL issues)

R2 path: library-papers/jee-mains/Paper/{label}.pdf

Usage:
    python3 scrape_jee_mains_all_years.py                # Scrape + upload 2006-2018
    python3 scrape_jee_mains_all_years.py --dry-run       # Preview only
    python3 scrape_jee_mains_all_years.py --year 2010     # Specific year
    python3 scrape_jee_mains_all_years.py --inventory     # Show R2 + local state
    python3 scrape_jee_mains_all_years.py --skip-upload   # Download only, no R2

Prerequisites:
    pip install playwright requests beautifulsoup4
    playwright install chromium
    npm install -g wrangler  (or npx wrangler)
"""

import os
import re
import sys
import time
import json
import argparse
import subprocess
from pathlib import Path
from typing import Optional, List, Dict
from urllib.parse import urlparse, parse_qs

import requests
from bs4 import BeautifulSoup

try:
    from playwright.sync_api import sync_playwright
    HAS_PLAYWRIGHT = True
except ImportError:
    HAS_PLAYWRIGHT = False

# ── Config ──
BASE_DIR = Path(__file__).parent
DOWNLOAD_DIR = BASE_DIR / "papers_to_upload" / "JEE Mains"
DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)

R2_BUCKET = "analyxx-papers"
R2_PUBLIC_URL = "https://pub-5d418c0acdfa4e9ba673215eb5998a3b.r2.dev"
R2_PREFIX = "library-papers/jee-mains/Paper"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
}

MATHONGO_LISTING = "https://www.mathongo.com/iit-jee/jee-main-previous-year-question-paper/"

# Years we need to scrape (2006-2018 missing from R2)
TARGET_YEARS = list(range(2006, 2019))

# All years for inventory purposes
ALL_YEARS = list(range(2006, 2026))

MONTH_MAP = {
    "jan": "January", "feb": "February", "mar": "March",
    "apr": "April", "may": "May", "jun": "June",
    "jul": "July", "aug": "August", "sep": "September",
    "oct": "October", "nov": "November", "dec": "December",
}


# ════════════════════════════════════════════════════════════
# Google Drive Download
# ════════════════════════════════════════════════════════════

def resolve_redirect(short_url: str) -> Optional[str]:
    """Follow a short URL to get the final download URL."""
    try:
        resp = requests.head(short_url, headers=HEADERS, timeout=15, allow_redirects=True)
        final_url = resp.url

        if "links.mathongo.com" in final_url:
            resp = requests.get(short_url, headers=HEADERS, timeout=15,
                                allow_redirects=True, stream=True)
            final_url = resp.url

        # Extract Google Drive file ID
        drive_match = re.search(r'drive\.google\.com/file/d/([^/]+)', final_url)
        if drive_match:
            file_id = drive_match.group(1)
            return f"https://drive.google.com/uc?export=download&id={file_id}"

        open_match = re.search(r'drive\.google\.com/open\?id=([^&]+)', final_url)
        if open_match:
            file_id = open_match.group(1)
            return f"https://drive.google.com/uc?export=download&id={file_id}"

        if final_url.lower().endswith('.pdf'):
            return final_url

        if 'drive.google.com' in final_url:
            parsed = urlparse(final_url)
            params = parse_qs(parsed.query)
            if 'id' in params:
                return f"https://drive.google.com/uc?export=download&id={params['id'][0]}"

        return final_url
    except Exception as e:
        print(f"       ⚠️  Redirect error: {str(e)[:80]}")
        return None


def download_from_gdrive(url: str, save_path: Path) -> bool:
    """Download a file from Google Drive, handling confirmation pages."""
    if save_path.exists() and save_path.stat().st_size > 5000:
        print(f"    ⏭️  Exists: {save_path.name}")
        return True

    try:
        session = requests.Session()
        session.headers.update(HEADERS)

        resp = session.get(url, timeout=60, stream=True, allow_redirects=True)

        # Handle Google Drive virus scan warning page
        if resp.status_code == 200 and b'confirm=' in resp.content[:5000]:
            confirm_match = re.search(rb'confirm=([0-9A-Za-z_-]+)', resp.content)
            if confirm_match:
                token = confirm_match.group(1).decode()
                resp = session.get(f"{url}&confirm={token}",
                                   timeout=60, stream=True, allow_redirects=True)

        content = resp.content

        # Handle HTML response (file too large warning)
        if content[:5] != b'%PDF-' and b'<html' in content[:500].lower():
            resp = session.get(f"{url}&confirm=t",
                               timeout=60, stream=True, allow_redirects=True)
            content = resp.content

        if content[:5] != b'%PDF-':
            if 'drive.google.com' in url:
                file_id_match = re.search(r'id=([^&]+)', url)
                if file_id_match:
                    fid = file_id_match.group(1)
                    alt_url = f"https://drive.usercontent.google.com/download?id={fid}&export=download&confirm=t"
                    resp = session.get(alt_url, timeout=60, stream=True, allow_redirects=True)
                    content = resp.content

        if content[:5] != b'%PDF-':
            return False
        if len(content) < 5000:
            return False

        save_path.parent.mkdir(parents=True, exist_ok=True)
        with open(save_path, "wb") as f:
            f.write(content)

        print(f"    ✅ {save_path.name} ({len(content):,} bytes)")
        return True

    except Exception as e:
        print(f"    ⚠️  Download error: {str(e)[:80]}")
        return False


def download_pdf(url: str, save_path: Path) -> bool:
    """Download PDF — routes to Google Drive handler if needed."""
    if 'drive.google.com' in url or 'drive.usercontent.google.com' in url:
        return download_from_gdrive(url, save_path)

    if save_path.exists() and save_path.stat().st_size > 5000:
        print(f"    ⏭️  Exists: {save_path.name}")
        return True

    try:
        resp = requests.get(url, headers=HEADERS, timeout=60,
                            stream=True, allow_redirects=True)
        if resp.status_code != 200:
            return False

        content = resp.content
        if content[:5] != b'%PDF-' or len(content) < 5000:
            return False

        save_path.parent.mkdir(parents=True, exist_ok=True)
        with open(save_path, "wb") as f:
            f.write(content)

        print(f"    ✅ {save_path.name} ({len(content):,} bytes)")
        return True

    except Exception as e:
        print(f"    ⚠️  Download error: {str(e)[:80]}")
        return False


# ════════════════════════════════════════════════════════════
# MathonGo Crawler
# ════════════════════════════════════════════════════════════

def crawl_mathongo() -> List[Dict]:
    """Crawl MathonGo's JEE Main PYQ page for download links."""
    print(f"\n  🌐 Crawling MathonGo listing page...")

    if HAS_PLAYWRIGHT:
        papers = _crawl_playwright()
    else:
        papers = _crawl_bs4()

    print(f"  📋 Found {len(papers)} paper links total")
    return papers


def _crawl_playwright() -> List[Dict]:
    """Use Playwright to crawl MathonGo (JS-rendered content)."""
    papers = []
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            try:
                ctx = browser.new_context(user_agent=HEADERS["User-Agent"])
                page = ctx.new_page()
                page.goto(MATHONGO_LISTING, timeout=30000)
                page.wait_for_timeout(5000)

                # Scroll to load all content
                for _ in range(8):
                    page.evaluate("window.scrollBy(0, 1000)")
                    page.wait_for_timeout(500)

                # Extract all download links with context
                data = page.evaluate("""
                    () => {
                        const results = [];

                        // Tables
                        document.querySelectorAll('table').forEach(table => {
                            table.querySelectorAll('tr').forEach(row => {
                                const cells = row.querySelectorAll('td, th');
                                const rowText = row.textContent.trim();
                                row.querySelectorAll('a[href*="links.mathongo.com"], a[href*="drive.google.com"], a[href*="download"]').forEach(link => {
                                    results.push({
                                        href: link.href,
                                        linkText: link.textContent.trim(),
                                        rowText: rowText.substring(0, 500),
                                        cellTexts: Array.from(cells).map(c => c.textContent.trim()),
                                    });
                                });
                            });
                        });

                        // Links outside tables
                        document.querySelectorAll('a[href*="links.mathongo.com"], a[href*="drive.google.com"]').forEach(link => {
                            const parent = link.closest('tr') || link.closest('li') || link.closest('div') || link.parentElement;
                            const parentText = parent ? parent.textContent.trim() : '';
                            const isDuplicate = results.some(r => r.href === link.href);
                            if (!isDuplicate) {
                                results.push({
                                    href: link.href,
                                    linkText: link.textContent.trim(),
                                    rowText: parentText.substring(0, 500),
                                    cellTexts: [],
                                });
                            }
                        });

                        return results;
                    }
                """)

                print(f"     Raw links extracted: {len(data)}")

                for item in data:
                    parsed = _parse_paper_row(item)
                    if parsed:
                        papers.append(parsed)

            finally:
                browser.close()
    except Exception as e:
        print(f"     ⚠️  Playwright error: {str(e)[:100]}")

    return papers


def _crawl_bs4() -> List[Dict]:
    """Fallback: requests + BeautifulSoup (may miss JS-rendered content)."""
    papers = []
    try:
        resp = requests.get(MATHONGO_LISTING, headers=HEADERS, timeout=15)
        if resp.status_code != 200:
            print(f"     ⚠️  HTTP {resp.status_code}")
            return papers

        soup = BeautifulSoup(resp.text, "html.parser")
        for table in soup.find_all("table"):
            for row in table.find_all("tr"):
                cells = row.find_all(["td", "th"])
                row_text = row.get_text(strip=True)
                for a in row.find_all("a", href=True):
                    href = a["href"]
                    if "links.mathongo.com" in href or "drive.google.com" in href:
                        item = {
                            "href": href,
                            "linkText": a.get_text(strip=True),
                            "rowText": row_text[:500],
                            "cellTexts": [c.get_text(strip=True) for c in cells],
                        }
                        parsed = _parse_paper_row(item)
                        if parsed:
                            papers.append(parsed)
    except Exception as e:
        print(f"     ⚠️  Request error: {str(e)[:80]}")

    return papers


def _parse_paper_row(item: Dict) -> Optional[Dict]:
    """Parse a row to extract paper metadata."""
    href = item.get("href", "")
    row_text = item.get("rowText", "").lower()
    cell_texts = item.get("cellTexts", [])

    if not href:
        return None
    if "links.mathongo.com" not in href and "drive.google.com" not in href:
        return None

    # Extract year
    year = None
    year_match = re.search(r'(20[0-2]\d)', row_text)
    if year_match:
        year = int(year_match.group(1))
    if not year:
        return None

    # Extract session/month
    session = None
    for month_abbr in MONTH_MAP:
        if month_abbr in row_text:
            session = month_abbr
            break

    # Extract shift
    shift = None
    shift_match = re.search(r'shift[\s\-_]*(\d)', row_text)
    if shift_match:
        shift = int(shift_match.group(1))
    elif "morning" in row_text or "shift 1" in row_text:
        shift = 1
    elif "evening" in row_text or "afternoon" in row_text or "shift 2" in row_text:
        shift = 2

    # Extract date
    date = None
    date_match = re.search(
        r'(\d{1,2})[\s\-]*(st|nd|rd|th)?[\s\-]*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)',
        row_text,
    )
    if date_match:
        day = int(date_match.group(1))
        month = date_match.group(3)
        date = f"{day:02d}{month}"
        if not session:
            session = month

    # Detect paper type (offline/online for 2013-2018)
    paper_type = None
    if "offline" in row_text:
        paper_type = "offline"
    elif "online" in row_text:
        paper_type = "online"

    label = " ".join(cell_texts[:3]).strip() if cell_texts else row_text[:100]

    return {
        "year": year,
        "session": session,
        "date": date,
        "shift": shift,
        "paper_type": paper_type,
        "short_url": href,
        "label": label,
    }


# ════════════════════════════════════════════════════════════
# R2 Storage Key + Upload
# ════════════════════════════════════════════════════════════

def make_r2_key(paper: Dict) -> str:
    """Generate the R2 storage key for a paper."""
    year = paper["year"]
    session = paper.get("session")
    date = paper.get("date")
    shift = paper.get("shift")
    paper_type = paper.get("paper_type")

    # For 2006-2018: simple year-based naming
    if year <= 2018:
        if paper_type and paper_type == "online":
            return f"{year}_online.pdf"
        elif paper_type and paper_type == "offline":
            return f"{year}_offline.pdf"
        elif session and date and shift:
            return f"{year}_{session}_{date}_shift{shift}.pdf"
        elif session and shift:
            return f"{year}_{session}_shift{shift}.pdf"
        else:
            return f"{year}.pdf"
    else:
        # For 2019+: full naming (matches existing convention)
        parts = [str(year)]
        if session and session != "unknown":
            parts.append(session)
        if date:
            parts.append(date)
        if shift:
            parts.append(f"shift{shift}")
        return "_".join(parts) + ".pdf"


def make_local_filename(paper: Dict) -> str:
    """Generate a local filename for a paper."""
    r2_key = make_r2_key(paper)
    return f"jee_mains_{r2_key}"


def check_r2_exists(r2_key: str) -> bool:
    """Check if a file exists in R2 via public CDN HEAD request."""
    url = f"{R2_PUBLIC_URL}/{R2_PREFIX}/{r2_key}"
    try:
        resp = requests.head(url, timeout=10)
        return resp.status_code == 200
    except:
        return False


def upload_to_r2(local_path: Path, r2_key: str) -> bool:
    """Upload a file to R2 using Wrangler CLI (bypasses SSL issues)."""
    r2_object_path = f"{R2_BUCKET}/{R2_PREFIX}/{r2_key}"
    try:
        result = subprocess.run(
            ["npx", "wrangler", "r2", "object", "put", r2_object_path,
             "--file", str(local_path), "--content-type", "application/pdf",
             "--remote"],
            capture_output=True, text=True, timeout=120,
            cwd=str(BASE_DIR),
        )
        if result.returncode == 0:
            print(f"    ☁️  Uploaded → {R2_PREFIX}/{r2_key}")
            return True
        else:
            stderr = result.stderr.strip()[:200]
            print(f"    ❌ Upload failed: {stderr}")
            return False
    except subprocess.TimeoutExpired:
        print(f"    ❌ Upload timed out")
        return False
    except Exception as e:
        print(f"    ❌ Upload error: {str(e)[:80]}")
        return False


# ════════════════════════════════════════════════════════════
# Main Pipeline
# ════════════════════════════════════════════════════════════

def scrape_and_upload(years: List[int], dry_run: bool = False,
                      skip_existing: bool = True, skip_upload: bool = False) -> int:
    """Scrape papers and upload to R2. Returns count of successfully processed papers."""

    # Step 1: Crawl MathonGo
    all_papers = crawl_mathongo()

    # Filter by requested years
    papers = [p for p in all_papers if p["year"] in years]
    print(f"\n  📋 Papers matching requested years: {len(papers)}")

    # Deduplicate by (year, session, date, shift, paper_type)
    seen = set()
    unique_papers = []
    for paper in papers:
        key = (paper["year"], paper.get("session"), paper.get("date"),
               paper.get("shift"), paper.get("paper_type"))
        if key not in seen:
            seen.add(key)
            unique_papers.append(paper)

    print(f"  📋 After dedup: {len(unique_papers)} unique papers")

    if not unique_papers:
        print(f"  ⚠️  No papers found for years {years}!")
        return 0

    # Group by year
    by_year = {}
    for p in unique_papers:
        by_year.setdefault(p["year"], []).append(p)

    total_success = 0

    for year in sorted(by_year.keys()):
        year_papers = by_year[year]
        print(f"\n{'='*60}")
        print(f"📂 {'AIEEE' if year <= 2012 else 'JEE Mains'} {year} — {len(year_papers)} paper(s)")
        print(f"{'='*60}")

        for paper in year_papers:
            r2_key = make_r2_key(paper)
            local_filename = make_local_filename(paper)
            save_path = DOWNLOAD_DIR / local_filename

            # Check if already in R2
            if skip_existing and check_r2_exists(r2_key):
                print(f"    ⏭️  Already in R2: {r2_key}")
                total_success += 1
                continue

            if dry_run:
                print(f"    🔍 Would download: {local_filename}")
                print(f"       Link: {paper['short_url'][:60]}...")
                print(f"       R2 key: {R2_PREFIX}/{r2_key}")
                total_success += 1
                continue

            print(f"\n    📥 {local_filename}")
            print(f"       Link: {paper['short_url'][:60]}...")

            # Step 2: Resolve short URL
            short_url = paper["short_url"]
            if "links.mathongo.com" in short_url:
                print(f"       Resolving redirect...")
                download_url = resolve_redirect(short_url)
                if not download_url:
                    print(f"    ❌ Could not resolve download URL")
                    continue
            else:
                download_url = short_url

            print(f"       Download URL: {download_url[:60]}...")

            # Step 3: Download
            if not download_pdf(download_url, save_path):
                print(f"    ❌ Download failed for {local_filename}")
                continue

            # Step 4: Upload to R2
            if not skip_upload:
                if upload_to_r2(save_path, r2_key):
                    total_success += 1
                else:
                    print(f"    ⚠️  Upload failed but PDF saved locally")
            else:
                total_success += 1

            time.sleep(1)  # Be polite

    return total_success


def print_inventory():
    """Show current JEE Mains paper inventory (local + R2)."""
    print(f"\n📊 JEE Mains Paper Inventory (Local + R2)")
    print(f"{'='*60}")

    for year in sorted(ALL_YEARS, reverse=True):
        local_files = list(DOWNLOAD_DIR.glob(f"jee_mains_{year}*.pdf"))
        local_count = len(local_files)

        # Check R2 for common patterns
        r2_patterns = [f"{year}.pdf"]
        if year >= 2013 and year <= 2018:
            r2_patterns.extend([f"{year}_offline.pdf", f"{year}_online.pdf"])

        r2_found = []
        for pattern in r2_patterns:
            if check_r2_exists(pattern):
                r2_found.append(pattern)

        # For NTA-era, check a sample
        if year >= 2019:
            for f in local_files[:2]:
                r2_key = f.stem.replace("jee_mains_", "") + ".pdf"
                if check_r2_exists(r2_key):
                    r2_found.append(r2_key)

        r2_icon = "✅" if r2_found else "❌"
        local_icon = "📄" if local_count > 0 else "  "

        era = "AIEEE" if year <= 2012 else "JEE Mains"
        print(f"  {r2_icon} {era} {year}: "
              f"{local_count} local | "
              f"{len(r2_found)} in R2"
              f"{' (' + ', '.join(r2_found[:3]) + ')' if r2_found else ''}")

    print(f"\n  📂 Local: {DOWNLOAD_DIR}")
    print(f"  ☁️  R2: {R2_PUBLIC_URL}/{R2_PREFIX}/")


def main():
    parser = argparse.ArgumentParser(
        description="Scrape JEE Mains Papers (2006-2018) → Cloudflare R2"
    )
    parser.add_argument("--year", type=int, help="Specific year to scrape")
    parser.add_argument("--dry-run", action="store_true", help="Preview only")
    parser.add_argument("--inventory", action="store_true", help="Show inventory")
    parser.add_argument("--skip-existing", action="store_true", default=True,
                        help="Skip papers already in R2 (default: True)")
    parser.add_argument("--no-skip-existing", dest="skip_existing", action="store_false",
                        help="Re-upload even if already in R2")
    parser.add_argument("--skip-upload", action="store_true",
                        help="Download only, don't upload to R2")
    args = parser.parse_args()

    if args.inventory:
        print_inventory()
        return

    years = [args.year] if args.year else TARGET_YEARS

    print(f"\n🚀 JEE Mains Paper Scraper → Cloudflare R2")
    print(f"   Years: {years}")
    print(f"   Mode: {'DRY RUN' if args.dry_run else 'SCRAPE + UPLOAD'}")
    print(f"   Skip existing: {args.skip_existing}")
    print(f"   Upload: {'No' if args.skip_upload else 'Yes (Wrangler CLI)'}")
    print(f"   Output: {DOWNLOAD_DIR}")
    print(f"{'='*60}")

    total = scrape_and_upload(
        years=years,
        dry_run=args.dry_run,
        skip_existing=args.skip_existing,
        skip_upload=args.skip_upload,
    )

    print(f"\n{'='*60}")
    print(f"🎉 {'DRY RUN' if args.dry_run else 'Scraping'} Complete!")
    print(f"   ✅ {total} papers {'would be ' if args.dry_run else ''}processed")
    print(f"   📂 Local: {DOWNLOAD_DIR}")
    print(f"   ☁️  R2: {R2_PUBLIC_URL}/{R2_PREFIX}/")


if __name__ == "__main__":
    main()
