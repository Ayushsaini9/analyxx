"""
Scrape JEE Mains PYQ papers from MathonGo and upload to Supabase.

JEE Mains is NOT categorised by subject — each paper covers Physics, Chemistry,
and Mathematics combined.  Papers are instead identified by:
    year / session (Jan, Apr) / date / shift (1, 2)

Strategy:
  1. Crawl MathonGo's JEE Main PYQ listing page (tables of papers)
  2. Each "Download PDF" link → links.mathongo.com short URL
  3. Follow redirect → Google Drive file page
  4. Extract Drive file ID → direct download via export=download
  5. Save as: jee_mains_{year}_{session}_{date}_shift{N}.pdf

Storage path in Supabase:
    library-papers/jee-mains/Paper/{descriptive_name}.pdf

Usage:
    python scrape_jee_mains_papers.py                   # Download all
    python scrape_jee_mains_papers.py --dry-run          # Preview only
    python scrape_jee_mains_papers.py --year 2024        # Specific year
    python scrape_jee_mains_papers.py --upload           # Download + upload
    python scrape_jee_mains_papers.py --inventory        # Show current papers

Prerequisites:
    pip install playwright requests beautifulsoup4
    playwright install chromium
"""

import os
import re
import sys
import time
import argparse
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

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
}

MATHONGO_LISTING = "https://www.mathongo.com/iit-jee/jee-main-previous-year-question-paper/"

# All known JEE Mains years (NTA era: 2019 onwards, AIEEE before that)
ALL_YEARS = [2025, 2024, 2023, 2022, 2021, 2020, 2019]

MONTH_MAP = {
    "jan": "January", "feb": "February", "mar": "March",
    "apr": "April", "may": "May", "jun": "June",
    "jul": "July", "aug": "August", "sep": "September",
    "oct": "October", "nov": "November", "dec": "December",
}


def resolve_mathongo_link(short_url: str) -> Optional[str]:
    """
    Follow a links.mathongo.com short URL to get the Google Drive file ID.
    Returns a direct download URL or None.
    """
    try:
        # Follow redirect to get Google Drive URL
        resp = requests.head(
            short_url, headers=HEADERS, timeout=15,
            allow_redirects=True,
        )
        final_url = resp.url

        # Try GET if HEAD didn't redirect properly
        if "links.mathongo.com" in final_url:
            resp = requests.get(
                short_url, headers=HEADERS, timeout=15,
                allow_redirects=True, stream=True,
            )
            final_url = resp.url

        # Extract Google Drive file ID
        # Pattern: https://drive.google.com/file/d/FILE_ID/view
        drive_match = re.search(r'drive\.google\.com/file/d/([^/]+)', final_url)
        if drive_match:
            file_id = drive_match.group(1)
            return f"https://drive.google.com/uc?export=download&id={file_id}"

        # Pattern: https://drive.google.com/open?id=FILE_ID
        open_match = re.search(r'drive\.google\.com/open\?id=([^&]+)', final_url)
        if open_match:
            file_id = open_match.group(1)
            return f"https://drive.google.com/uc?export=download&id={file_id}"

        # If it's already a direct PDF URL, return as-is
        if final_url.lower().endswith('.pdf'):
            return final_url

        # Check if the final URL itself is a downloadable URL
        if 'drive.google.com' in final_url:
            parsed = urlparse(final_url)
            params = parse_qs(parsed.query)
            if 'id' in params:
                return f"https://drive.google.com/uc?export=download&id={params['id'][0]}"

        return final_url  # Return whatever we got

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
            # Extract confirmation token
            confirm_match = re.search(
                rb'confirm=([0-9A-Za-z_-]+)',
                resp.content
            )
            if confirm_match:
                token = confirm_match.group(1).decode()
                resp = session.get(
                    f"{url}&confirm={token}",
                    timeout=60, stream=True, allow_redirects=True,
                )

        content = resp.content

        # For Google Drive, the response might be HTML if the file is too large
        # Try the export URL with confirmation
        if content[:5] != b'%PDF-' and b'<html' in content[:500].lower():
            # Try with confirm=t
            resp = session.get(
                f"{url}&confirm=t",
                timeout=60, stream=True, allow_redirects=True,
            )
            content = resp.content

        # Verify it's a PDF
        if content[:5] != b'%PDF-':
            # Last resort: try with export=download and confirm
            if 'drive.google.com' in url:
                file_id_match = re.search(r'id=([^&]+)', url)
                if file_id_match:
                    fid = file_id_match.group(1)
                    alt_url = f"https://drive.usercontent.google.com/download?id={fid}&export=download&confirm=t"
                    resp = session.get(
                        alt_url, timeout=60, stream=True, allow_redirects=True,
                    )
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
        resp = requests.get(
            url, headers=HEADERS, timeout=60,
            stream=True, allow_redirects=True,
        )
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


def crawl_mathongo_listing() -> List[Dict]:
    """
    Crawl MathonGo's JEE Main PYQ listing page.
    Returns list of dicts: {year, session, date, shift, short_url, label}
    """
    papers = []
    print(f"\n  🌐 Crawling MathonGo listing page...")

    if HAS_PLAYWRIGHT:
        papers = _crawl_mathongo_playwright()
    else:
        papers = _crawl_mathongo_bs4()

    print(f"  📋 Found {len(papers)} paper links total")
    return papers


def _crawl_mathongo_playwright() -> List[Dict]:
    """Use Playwright to crawl MathonGo listing page."""
    papers = []

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            try:
                ctx = browser.new_context(user_agent=HEADERS["User-Agent"])
                page = ctx.new_page()

                page.goto(MATHONGO_LISTING, timeout=30000)
                page.wait_for_timeout(5000)

                # Scroll down to load all content
                for _ in range(5):
                    page.evaluate("window.scrollBy(0, 1000)")
                    page.wait_for_timeout(500)

                # Extract table rows with paper info and download links
                data = page.evaluate("""
                    () => {
                        const results = [];

                        // Look for tables or structured content
                        const tables = document.querySelectorAll('table');
                        tables.forEach(table => {
                            const rows = table.querySelectorAll('tr');
                            rows.forEach(row => {
                                const cells = row.querySelectorAll('td, th');
                                const rowText = row.textContent.trim();

                                // Find download links in this row
                                const links = row.querySelectorAll('a[href*="links.mathongo.com"], a[href*="drive.google.com"]');
                                links.forEach(link => {
                                    results.push({
                                        href: link.href,
                                        linkText: link.textContent.trim(),
                                        rowText: rowText.substring(0, 500),
                                        cellTexts: Array.from(cells).map(c => c.textContent.trim()),
                                    });
                                });
                            });
                        });

                        // Also look for links outside tables
                        const allLinks = document.querySelectorAll('a[href*="links.mathongo.com"], a[href*="drive.google.com"]');
                        allLinks.forEach(link => {
                            const parent = link.closest('tr') || link.closest('li') || link.closest('div') || link.parentElement;
                            const parentText = parent ? parent.textContent.trim() : '';

                            // Avoid duplicates from table extraction
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

                # Also grab section headers for year/session context
                sections = page.evaluate("""
                    () => {
                        const headers = [];
                        document.querySelectorAll('h1, h2, h3, h4, h5, h6, th').forEach(h => {
                            headers.push(h.textContent.trim());
                        });
                        return headers;
                    }
                """)

                for item in data:
                    parsed = _parse_mathongo_row(item)
                    if parsed:
                        papers.append(parsed)
            finally:
                browser.close()

    except Exception as e:
        print(f"     ⚠️  Playwright error: {str(e)[:100]}")

    return papers


def _crawl_mathongo_bs4() -> List[Dict]:
    """Fallback: use requests + BeautifulSoup."""
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
                        parsed = _parse_mathongo_row(item)
                        if parsed:
                            papers.append(parsed)

    except Exception as e:
        print(f"     ⚠️  Request error: {str(e)[:80]}")

    return papers


def _parse_mathongo_row(item: Dict) -> Optional[Dict]:
    """
    Parse a MathonGo table row to extract paper metadata.
    Returns dict {year, session, date, shift, short_url, label} or None.
    """
    href = item.get("href", "")
    row_text = item.get("rowText", "").lower()
    cell_texts = item.get("cellTexts", [])

    if not href:
        return None

    # Skip non-download links
    if "links.mathongo.com" not in href and "drive.google.com" not in href:
        return None

    # Extract year (4-digit number)
    year = None
    year_match = re.search(r'(20[1-2]\d)', row_text)
    if year_match:
        year = int(year_match.group(1))
    if not year:
        return None

    # Extract session/month
    session = None
    for month_abbr in ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]:
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

    # Build label from cell texts
    label = " ".join(cell_texts[:3]).strip() if cell_texts else row_text[:100]

    return {
        "year": year,
        "session": session or "unknown",
        "date": date,
        "shift": shift,
        "short_url": href,
        "label": label,
    }


def make_filename(paper: Dict) -> str:
    """
    Generate a canonical filename for a JEE Mains paper.
    Format: jee_mains_{year}_{session}_{date}_shift{N}.pdf
    """
    year = paper["year"]
    session = paper.get("session", "unknown")
    date = paper.get("date")
    shift = paper.get("shift")

    parts = ["jee", "mains", str(year)]

    if session and session != "unknown":
        parts.append(session)

    if date:
        parts.append(date)

    if shift:
        parts.append(f"shift{shift}")

    return "_".join(parts) + ".pdf"


def scrape_all(years: Optional[List[int]] = None, dry_run: bool = False) -> int:
    """Scrape JEE Mains papers. Returns total download count."""
    if years is None:
        years = ALL_YEARS

    # Step 1: Crawl MathonGo listing to get all paper links
    all_papers = crawl_mathongo_listing()

    # Filter by requested years
    papers = [p for p in all_papers if p["year"] in years]
    print(f"\n  📋 Papers matching requested years: {len(papers)}")

    # Deduplicate by (year, session, date, shift)
    seen = set()
    unique_papers = []
    for paper in papers:
        key = (paper["year"], paper.get("session"), paper.get("date"), paper.get("shift"))
        if key not in seen:
            seen.add(key)
            unique_papers.append(paper)

    print(f"  📋 After dedup: {len(unique_papers)} unique papers")

    if not unique_papers:
        print(f"  ⚠️  No papers found!")
        return 0

    # Group by year for display
    by_year = {}
    for p in unique_papers:
        by_year.setdefault(p["year"], []).append(p)

    total_downloaded = 0

    for year in sorted(by_year.keys(), reverse=True):
        year_papers = by_year[year]
        print(f"\n{'='*60}")
        print(f"📂 JEE Mains {year} — {len(year_papers)} papers")
        print(f"{'='*60}")

        for paper in sorted(year_papers, key=lambda p: (p.get("session", ""), p.get("date", ""), p.get("shift", 0))):
            filename = make_filename(paper)
            save_path = DOWNLOAD_DIR / filename

            if dry_run:
                print(f"    🔍 Would download: {filename}")
                print(f"       Link: {paper['short_url'][:60]}...")
                total_downloaded += 1
                continue

            print(f"\n    📥 {filename}")
            print(f"       Link: {paper['short_url'][:60]}...")

            # Step 2: Resolve short URL to get download URL
            short_url = paper["short_url"]
            if "links.mathongo.com" in short_url:
                print(f"       Resolving redirect...")
                download_url = resolve_mathongo_link(short_url)
                if not download_url:
                    print(f"    ❌ Could not resolve download URL")
                    continue
            else:
                download_url = short_url

            print(f"       Download URL: {download_url[:60]}...")

            # Step 3: Download
            if download_pdf(download_url, save_path):
                total_downloaded += 1

            time.sleep(1)  # Be polite

    return total_downloaded


def print_inventory():
    """Show current JEE Mains paper inventory."""
    print(f"\n📊 JEE Mains Paper Inventory")
    print(f"{'='*60}")

    if not DOWNLOAD_DIR.exists():
        print("  No papers found yet.")
        return

    papers_by_year = {}
    for f in sorted(DOWNLOAD_DIR.glob("*.pdf")):
        name = f.stem
        year_match = re.search(r'(\d{4})', name)
        if year_match:
            year = year_match.group(1)
            if year not in papers_by_year:
                papers_by_year[year] = []
            papers_by_year[year].append({
                "filename": f.name,
                "size": f.stat().st_size,
            })

    if not papers_by_year:
        print("  No papers found yet.")
        print(f"\n  💡 Run: python scrape_jee_mains_papers.py")
        return

    total = 0
    for year in sorted(papers_by_year.keys(), reverse=True):
        items = papers_by_year[year]
        total += len(items)
        print(f"\n  📅 {year}: {len(items)} paper(s)")
        for item in items:
            size_kb = item['size'] / 1024
            print(f"     📄 {item['filename']} ({size_kb:.0f} KB)")

    print(f"\n  📊 Total: {total} papers on disk")
    print(f"  📂 Location: {DOWNLOAD_DIR}")

    # Show gaps
    missing = [str(y) for y in ALL_YEARS if str(y) not in papers_by_year]
    if missing:
        print(f"\n  ⚠️  No papers for: {', '.join(missing)}")


def upload_to_supabase():
    """Upload scraped JEE Mains papers to Supabase Storage."""
    try:
        from dotenv import load_dotenv
        load_dotenv(os.path.join(os.path.dirname(__file__), "backend", ".env"))
        from supabase import create_client, ClientOptions

        SUPABASE_URL = os.getenv("SUPABASE_URL")
        SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
        if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
            print("  ❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in environment")
            return
        supabase = create_client(
            SUPABASE_URL,
            SUPABASE_SERVICE_KEY,
            options=ClientOptions(storage_client_timeout=300),
        )

        BUCKET = "library-papers"

        # Ensure bucket exists
        try:
            supabase.storage.create_bucket(BUCKET, options={"public": True})
        except Exception:
            pass

        pdfs = sorted(DOWNLOAD_DIR.glob("*.pdf"))
        if not pdfs:
            print("  No papers to upload.")
            return

        print(f"\n📤 Uploading {len(pdfs)} JEE Mains papers to Supabase...")
        print(f"   Bucket: {BUCKET}")
        print(f"   Pattern: {BUCKET}/jee-mains/Paper/{{label}}.pdf\n")

        success = 0
        for pdf_path in pdfs:
            name = pdf_path.stem

            # Build storage-friendly label
            # jee_mains_2024_jan_27jan_shift1 → "Jan 27 Shift 1 2024"
            label = name.replace("jee_mains_", "")

            # Storage path — since JEE Mains is a combined paper (no subject split),
            # we use "Paper" as the pseudo-subject
            storage_path = f"jee-mains/Paper/{label}.pdf"

            with open(pdf_path, "rb") as f:
                content = f.read()

            try:
                supabase.storage.from_(BUCKET).upload(
                    path=storage_path,
                    file=content,
                    file_options={"content-type": "application/pdf"},
                )
                print(f"  ✅ → {storage_path} ({len(content):,} bytes)")
                success += 1
            except Exception as e:
                if "Duplicate" in str(e) or "already exists" in str(e).lower():
                    print(f"  ℹ️  Already exists → {storage_path}")
                    success += 1
                else:
                    print(f"  ❌ Failed: {e}")

            time.sleep(0.3)

        print(f"\n  🎉 Uploaded {success}/{len(pdfs)} papers")

    except ImportError:
        print("  ❌ Missing dependencies. Run: pip install python-dotenv supabase")
    except Exception as e:
        print(f"  ❌ Upload error: {e}")


def main():
    parser = argparse.ArgumentParser(
        description="Scrape JEE Mains Papers from MathonGo (Google Drive PDFs)"
    )
    parser.add_argument("--year", type=int, help="Specific year to scrape")
    parser.add_argument("--dry-run", action="store_true",
                        help="Preview only, no downloads")
    parser.add_argument("--inventory", action="store_true",
                        help="Show current paper inventory")
    parser.add_argument("--upload", action="store_true",
                        help="Upload to Supabase after downloading")
    args = parser.parse_args()

    if args.inventory:
        print_inventory()
        return

    years = [args.year] if args.year else None

    print(f"\n🚀 JEE Mains Paper Scraper (MathonGo → Google Drive)")
    print(f"   Years: {years or 'ALL (' + ', '.join(map(str, ALL_YEARS)) + ')'}")
    print(f"   Mode: {'DRY RUN' if args.dry_run else 'DOWNLOAD'}")
    print(f"   Output: {DOWNLOAD_DIR}")
    print(f"{'='*60}")

    total = scrape_all(years=years, dry_run=args.dry_run)

    # Summary
    print(f"\n{'='*60}")
    print(f"🎉 {'DRY RUN' if args.dry_run else 'Scraping'} Complete!")
    print(f"   ✅ {total} papers {'would be ' if args.dry_run else ''}downloaded")
    print(f"   📂 Location: {DOWNLOAD_DIR}")

    if total > 0 and not args.dry_run:
        print(f"\n   💡 Next — upload to Supabase:")
        print(f"      python scrape_jee_mains_papers.py --upload")

    if args.upload and total > 0 and not args.dry_run:
        print(f"\n📎 Uploading to Supabase...")
        upload_to_supabase()


if __name__ == "__main__":
    main()
