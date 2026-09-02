"""
Scrape RTU PYQ papers from rtuquestionpapers.com

This site has a CDN with predictable PDF URLs:
  https://cdn.rtuquestionpapers.com/btech-{branch-slug}-{sem}-sem-{subject-slug}-{code}-{year}.pdf

Strategy:
  1. Crawl semester pages to discover subject slugs and codes
  2. Download all PDFs
  3. Save to existing folder structure for branded PDF pipeline

Usage:
  python scrape_rtu_papers.py --branch cs --even-semesters
  python scrape_rtu_papers.py --branch all --even-semesters
  python scrape_rtu_papers.py --branch cs --semester 4
  python scrape_rtu_papers.py --list-missing

Prerequisites:
  pip install playwright requests beautifulsoup4
  playwright install chromium
"""
import os, re, sys, time, argparse
from pathlib import Path
from urllib.parse import urljoin, quote, unquote

import requests
from bs4 import BeautifulSoup

try:
    from playwright.sync_api import sync_playwright
    HAS_PLAYWRIGHT = True
except ImportError:
    HAS_PLAYWRIGHT = False

# ── Config ──
BASE_DIR = Path(__file__).parent
DOWNLOAD_DIR = BASE_DIR / "papers_to_upload" / "RTU ALL PAPERS"
DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
}

# Branch mapping: our ID → (folder name, site slug)
BRANCHES = {
    "cs":         ("CS:IT RTU ",  "computer-science"),
    "civil":      ("CE RTU",      "civil"),
    "mechanical": ("ME RTU",      "mechanical"),
    "electrical": ("EE:EC RTU ",  "electrical"),
}

SITE_BASE = "https://www.rtuquestionpapers.com"
CDN_BASE = "https://cdn.rtuquestionpapers.com"


def download_pdf(url: str, save_path: Path) -> bool:
    """Download PDF with validation."""
    if save_path.exists() and save_path.stat().st_size > 5000:
        print(f"    ⏭️  Exists: {save_path.name}")
        return True

    try:
        resp = requests.get(url, headers=HEADERS, timeout=60, stream=True, allow_redirects=True)
        if resp.status_code != 200:
            return False

        save_path.parent.mkdir(parents=True, exist_ok=True)
        content = resp.content

        # Verify PDF
        if not content[:5] == b'%PDF-':
            return False
        if len(content) < 5000:
            return False

        with open(save_path, "wb") as f:
            f.write(content)

        print(f"    ✅ {save_path.name} ({len(content):,} bytes)")
        return True

    except Exception as e:
        return False


def crawl_semester_page(branch_slug: str, semester: int) -> list:
    """
    Crawl rtuquestionpapers.com semester page to discover all PDF links.
    Returns list of (subject_name, year, pdf_url, filename)
    """
    url = f"{SITE_BASE}/btech/{branch_slug}/sem-{semester}"
    print(f"\n  🌐 Crawling: {url}")

    papers = []

    if HAS_PLAYWRIGHT:
        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                ctx = browser.new_context(user_agent=HEADERS["User-Agent"])
                page = ctx.new_page()
                page.goto(url, timeout=20000)
                page.wait_for_timeout(3000)

                # Extract all PDF links from the page
                links = page.evaluate("""
                    () => {
                        const results = [];
                        document.querySelectorAll('a[href]').forEach(a => {
                            const href = a.href || '';
                            if (href.toLowerCase().includes('.pdf')) {
                                results.push({
                                    href: href,
                                    text: a.textContent.trim()
                                });
                            }
                        });
                        return results;
                    }
                """)

                for link in links:
                    href = link["href"]
                    text = link["text"]

                    # Parse the URL to extract subject and year
                    # Pattern: btech-cs-it-4-sem-subject-name-code-2025.pdf
                    filename = href.split("/")[-1]
                    year_match = re.search(r'-(\d{4})\.pdf$', filename, re.IGNORECASE)
                    if not year_match:
                        continue

                    year = int(year_match.group(1))

                    # Extract subject name from URL or link text
                    # Remove prefix like "btech-cs-it-4-sem-" and suffix "-code-year.pdf"
                    name_part = re.sub(r'^btech-[\w-]+-\d+-sem-', '', filename, flags=re.IGNORECASE)
                    name_part = re.sub(r'-\w{2,7}\d{3,5}-\d{4}\.pdf$', '', name_part, flags=re.IGNORECASE)
                    name_part = re.sub(r'-\d{4}\.pdf$', '', name_part, flags=re.IGNORECASE)

                    # Convert slug to title
                    subject_name = name_part.replace('-', ' ').strip().title()

                    if subject_name and year >= 2018:
                        papers.append((subject_name, year, href, filename))

                browser.close()
                print(f"     Found {len(papers)} papers on page")

        except Exception as e:
            print(f"     ⚠️  Playwright error: {str(e)[:80]}")

    # Fallback: try requests + BeautifulSoup
    if not papers:
        try:
            resp = requests.get(url, headers=HEADERS, timeout=15)
            if resp.status_code == 200:
                soup = BeautifulSoup(resp.text, "html.parser")
                for a in soup.find_all("a", href=True):
                    href = a["href"]
                    if ".pdf" in href.lower():
                        if not href.startswith("http"):
                            href = urljoin(url, href)
                        filename = href.split("/")[-1]
                        year_match = re.search(r'-(\d{4})\.pdf$', filename, re.IGNORECASE)
                        if year_match:
                            year = int(year_match.group(1))
                            name_part = re.sub(r'^btech-[\w-]+-\d+-sem-', '', filename, re.IGNORECASE)
                            name_part = re.sub(r'-\w{2,7}\d{3,5}-\d{4}\.pdf$', '', name_part, re.IGNORECASE)
                            name_part = re.sub(r'-\d{4}\.pdf$', '', name_part, re.IGNORECASE)
                            subject_name = name_part.replace('-', ' ').strip().title()
                            if subject_name and year >= 2018:
                                papers.append((subject_name, year, href, filename))
                print(f"     Found {len(papers)} papers (BS4 fallback)")
        except Exception as e:
            print(f"     ⚠️  Request error: {str(e)[:80]}")

    return papers


def also_try_rtuonline(branch: str, semester: int) -> list:
    """Try rtuonline.com as secondary source."""
    branch_slugs = {
        "cs": "cs", "civil": "ce", "mechanical": "me", "electrical": "ee",
    }
    slug = branch_slugs.get(branch, branch)
    url = f"https://www.rtuonline.com/btech-{slug}-question-papers.html"

    papers = []
    try:
        resp = requests.get(url, headers=HEADERS, timeout=15)
        if resp.status_code != 200:
            return papers

        soup = BeautifulSoup(resp.text, "html.parser")
        for a in soup.find_all("a", href=True):
            href = a["href"]
            if ".pdf" in href.lower():
                if not href.startswith("http"):
                    href = urljoin(url, href)
                # Check if it matches the target semester
                sem_match = re.search(r'-(\d+)-sem-', href, re.IGNORECASE)
                if sem_match and int(sem_match.group(1)) == semester:
                    filename = href.split("/")[-1]
                    year_match = re.search(r'-(\d{4})\.pdf$', filename, re.IGNORECASE)
                    if year_match:
                        year = int(year_match.group(1))
                        name_part = re.sub(r'^btech-[\w-]+-\d+-sem-', '', filename, re.IGNORECASE)
                        name_part = re.sub(r'-\w{2,7}\d{3,5}-\d{4}\.pdf$', '', name_part, re.IGNORECASE)
                        name_part = re.sub(r'-\d{4}\.pdf$', '', name_part, re.IGNORECASE)
                        subject_name = name_part.replace('-', ' ').strip().title()
                        if subject_name and year >= 2018:
                            papers.append((subject_name, year, href, filename))
        if papers:
            print(f"     + {len(papers)} from rtuonline.com")
    except:
        pass

    return papers


def scrape_semester(branch: str, semester: int) -> int:
    """Scrape all papers for a specific branch+semester. Returns download count."""
    folder_name, site_slug = BRANCHES.get(branch, (branch, branch))
    sem_suffix = f"{semester}{'st' if semester==1 else 'nd' if semester==2 else 'rd' if semester==3 else 'th'}"
    sem_dir = DOWNLOAD_DIR / folder_name / f"{sem_suffix} SEM scraped"
    sem_dir.mkdir(parents=True, exist_ok=True)

    print(f"\n{'='*60}")
    print(f"📂 {branch.upper()} — Semester {semester}")
    print(f"   Output: {sem_dir}")
    print(f"{'='*60}")

    # Collect papers from multiple sources
    papers = crawl_semester_page(site_slug, semester)

    # Try alternative slugs for the site
    alt_slugs = {
        "cs": ["computer-science", "cs-it", "cs"],
        "civil": ["civil", "civil-engineering", "ce"],
        "mechanical": ["mechanical", "mechanical-engineering", "me"],
        "electrical": ["electrical", "electrical-engineering", "ee", "ee-ec"],
    }
    if not papers:
        for alt in alt_slugs.get(branch, []):
            if alt != site_slug:
                papers = crawl_semester_page(alt, semester)
                if papers:
                    break

    # Also try rtuonline.com
    papers.extend(also_try_rtuonline(branch, semester))

    # Deduplicate by (subject, year)
    seen = set()
    unique_papers = []
    for subj, year, url, fname in papers:
        key = (subj.lower(), year)
        if key not in seen:
            seen.add(key)
            unique_papers.append((subj, year, url, fname))

    print(f"\n  📋 Total unique papers found: {len(unique_papers)}")

    # Download
    downloaded = 0
    for subject, year, pdf_url, orig_filename in unique_papers:
        safe_name = re.sub(r'[^\w\s-]', '', subject).replace(' ', '-').lower()
        save_path = sem_dir / f"btech-{semester}-sem-{safe_name}-{year}.pdf"

        if download_pdf(pdf_url, save_path):
            downloaded += 1
        time.sleep(0.5)  # Be polite

    print(f"\n  ✅ Downloaded: {downloaded}/{len(unique_papers)}")
    return downloaded


def list_missing():
    """Show what papers exist vs what could be scraped."""
    print(f"\n📊 Current RTU Paper Inventory")
    print(f"{'='*60}")

    total_files = 0
    for branch_dir in sorted(DOWNLOAD_DIR.iterdir()):
        if not branch_dir.is_dir():
            continue
        branch_total = 0
        for sem_dir in sorted(branch_dir.iterdir()):
            if not sem_dir.is_dir():
                continue
            pdfs = list(sem_dir.glob("*.pdf"))
            branch_total += len(pdfs)
        if branch_total > 0:
            print(f"  📂 {branch_dir.name}: {branch_total} papers")
        total_files += branch_total

    print(f"\n  📊 Total: {total_files} papers on disk")
    print(f"\n💡 Even semesters to scrape: 4, 6, 8")
    print(f"   Run: python scrape_rtu_papers.py --branch all --even-semesters")


def main():
    parser = argparse.ArgumentParser(description="Scrape RTU Papers from rtuquestionpapers.com")
    parser.add_argument("--branch", type=str, default="cs",
                        help="Branch: cs, civil, mechanical, electrical, all")
    parser.add_argument("--semester", type=int, help="Specific semester")
    parser.add_argument("--even-semesters", action="store_true",
                        help="Scrape semesters 2, 4, 6, 8")
    parser.add_argument("--list-missing", action="store_true")
    parser.add_argument("--generate", action="store_true",
                        help="Run generate_rtu_papers.py --upload after scraping")
    args = parser.parse_args()

    if args.list_missing:
        list_missing()
        return

    branches = list(BRANCHES.keys()) if args.branch == "all" else [args.branch]

    if args.even_semesters:
        semesters = [2, 4, 6, 8]
    elif args.semester:
        semesters = [args.semester]
    else:
        semesters = [4, 6, 8]  # Default to even

    print(f"\n🚀 RTU Paper Scraper (rtuquestionpapers.com)")
    print(f"   Branches: {', '.join(branches)}")
    print(f"   Semesters: {semesters}")
    print(f"{'='*60}")

    total = 0
    for branch in branches:
        for sem in semesters:
            total += scrape_semester(branch, sem)
            time.sleep(1)

    print(f"\n{'='*60}")
    print(f"🎉 Done! Downloaded {total} new papers total")
    print(f"📂 Location: {DOWNLOAD_DIR}")

    if total > 0:
        print(f"\n💡 Next step — generate branded PDFs + upload:")
        print(f"   python generate_rtu_papers.py --upload")

    if args.generate and total > 0:
        print(f"\n📎 Running branded PDF generator...")
        import subprocess
        subprocess.run([sys.executable, str(BASE_DIR / "generate_rtu_papers.py"), "--upload"],
                       cwd=str(BASE_DIR))


if __name__ == "__main__":
    main()
