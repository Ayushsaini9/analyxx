"""
Scrape JEE Advanced PYQ papers from multiple sources for ALL years (2013-2025).
Each year has Paper 1 and Paper 2.

Sources (in priority order):
  1. MathonGo download manager pages
  2. Allen.in direct PDF links
  3. Official jeeadv.ac.in archive
  4. Vedantu / other direct PDF mirrors

Usage:
    python scrape_jee_advanced_papers.py              # Download all
    python scrape_jee_advanced_papers.py --year 2024  # Specific year
    python scrape_jee_advanced_papers.py --inventory   # Show inventory
"""
import os, re, time, argparse
from pathlib import Path
import requests

try:
    from playwright.sync_api import sync_playwright
    HAS_PLAYWRIGHT = True
except ImportError:
    HAS_PLAYWRIGHT = False

BASE_DIR = Path(__file__).parent
DOWNLOAD_DIR = BASE_DIR / "papers_to_upload" / "JEE Advanced"
DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
}

# ── Build the full paper list: 2013-2025, Paper 1 & Paper 2 ──
PAPERS = []
for y in range(2013, 2026):
    for p in [1, 2]:
        entry = {
            "year": y, "paper": p,
            "mathongo_url": f"https://www.mathongo.com/download/jee-advanced-{y}-paper-{p}/",
        }
        PAPERS.append(entry)


def download_from_gdrive(file_id: str, save_path: Path) -> bool:
    """Download PDF from Google Drive given a file ID."""
    if save_path.exists() and save_path.stat().st_size > 5000:
        print(f"    ⏭️  Exists: {save_path.name}")
        return True
    s = requests.Session()
    s.headers.update(HEADERS)
    urls = [
        f"https://drive.google.com/uc?export=download&id={file_id}",
        f"https://drive.usercontent.google.com/download?id={file_id}&export=download&confirm=t",
    ]
    for url in urls:
        try:
            resp = s.get(url, timeout=60, allow_redirects=True)
            content = resp.content
            if content[:5] == b'%PDF-' and len(content) > 5000:
                save_path.parent.mkdir(parents=True, exist_ok=True)
                with open(save_path, "wb") as f:
                    f.write(content)
                print(f"    ✅ {save_path.name} ({len(content):,} bytes)")
                return True
            # Handle confirmation page
            if b'confirm' in content:
                resp = s.get(f"{url}&confirm=t", timeout=60, allow_redirects=True)
                content = resp.content
                if content[:5] == b'%PDF-' and len(content) > 5000:
                    with open(save_path, "wb") as f:
                        f.write(content)
                    print(f"    ✅ {save_path.name} ({len(content):,} bytes)")
                    return True
        except:
            continue
    return False


def download_direct_pdf(url: str, save_path: Path) -> bool:
    """Download a direct PDF URL."""
    if save_path.exists() and save_path.stat().st_size > 5000:
        print(f"    ⏭️  Exists: {save_path.name}")
        return True
    try:
        resp = requests.get(url, headers=HEADERS, timeout=60, allow_redirects=True)
        if resp.content[:5] == b'%PDF-' and len(resp.content) > 5000:
            save_path.parent.mkdir(parents=True, exist_ok=True)
            with open(save_path, "wb") as f:
                f.write(resp.content)
            print(f"    ✅ {save_path.name} ({len(resp.content):,} bytes)")
            return True
    except:
        pass
    return False


def download_via_playwright(download_page: str, save_path: Path) -> bool:
    """Use Playwright to handle MathonGo's download manager redirect."""
    if save_path.exists() and save_path.stat().st_size > 5000:
        print(f"    ⏭️  Exists: {save_path.name}")
        return True
    if not HAS_PLAYWRIGHT:
        return False

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            try:
                ctx = browser.new_context(user_agent=HEADERS["User-Agent"])
                page = ctx.new_page()

                # Intercept downloads
                download_url = None

                def handle_response(response):
                    nonlocal download_url
                    ct = response.headers.get("content-type", "")
                    if "pdf" in ct or response.url.endswith(".pdf"):
                        download_url = response.url

                page.on("response", handle_response)
                page.goto(download_page, timeout=30000, wait_until="networkidle")
                page.wait_for_timeout(5000)

                # Check for redirect to Google Drive or PDF
                final_url = page.url

                # Look for Google Drive file ID
                gd_match = re.search(r'drive\.google\.com/file/d/([^/]+)', final_url)
                if not gd_match:
                    gd_match = re.search(r'drive\.google\.com/open\?id=([^&]+)', final_url)

                # Also look in page content for drive links
                if not gd_match:
                    content = page.content()
                    gd_match = re.search(r'drive\.google\.com/file/d/([^/"]+)', content)
                    if not gd_match:
                        gd_match = re.search(r'drive\.google\.com/open\?id=([^"&]+)', content)

                # Look for direct PDF links
                pdf_links = page.evaluate("""() => {
                    const links = [];
                    document.querySelectorAll('a[href]').forEach(a => {
                        if (a.href.endsWith('.pdf') || a.href.includes('drive.google.com') || a.href.includes('uc?export'))
                            links.push(a.href);
                    });
                    return links;
                }""")
            finally:
                browser.close()

            if gd_match:
                file_id = gd_match.group(1)
                return download_from_gdrive(file_id, save_path)

            for link in pdf_links:
                gm = re.search(r'id=([^&]+)', link)
                if gm:
                    return download_from_gdrive(gm.group(1), save_path)
                if download_direct_pdf(link, save_path):
                    return True

            if download_url:
                return download_direct_pdf(download_url, save_path)

    except Exception as e:
        print(f"    ⚠️  Playwright error: {str(e)[:80]}")
    return False


def scrape_allen_papers(years: list[int]) -> dict:
    """Try to scrape Allen.in for JEE Advanced papers."""
    results = {}
    if not HAS_PLAYWRIGHT:
        return results

    print(f"\n  🌐 Checking Allen.in for JEE Advanced papers...")
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            try:
                page = browser.new_context(user_agent=HEADERS["User-Agent"]).new_page()

                # Allen has a dedicated JEE Advanced papers page
                urls_to_try = [
                    "https://www.allen.in/jee-advanced-previous-year-papers",
                    "https://www.allen.in/jee-advanced-question-paper",
                ]
                for url in urls_to_try:
                    try:
                        page.goto(url, timeout=20000, wait_until="domcontentloaded")
                        page.wait_for_timeout(3000)

                        links = page.evaluate("""() => {
                            const r = [];
                            document.querySelectorAll('a[href]').forEach(a => {
                                const href = a.href;
                                const text = a.textContent.trim();
                                if (href.endsWith('.pdf') || href.includes('drive.google.com'))
                                    r.push({href, text});
                            });
                            return r;
                        }""")

                        for link in links:
                            text = link["text"].lower()
                            href = link["href"]
                            ym = re.search(r'(20\d{2})', text)
                            if not ym:
                                ym = re.search(r'(20\d{2})', href)
                            if not ym:
                                continue
                            year = int(ym.group(1))
                            if year not in years:
                                continue
                            paper_num = None
                            if any(x in text for x in ["paper 1", "paper-1", "paper1", "paper i"]):
                                paper_num = 1
                            elif any(x in text for x in ["paper 2", "paper-2", "paper2", "paper ii"]):
                                paper_num = 2
                            if paper_num:
                                key = f"{year}_paper{paper_num}"
                                results[key] = href
                        if results:
                            print(f"    Found {len(results)} links from Allen.in")
                            break
                    except:
                        continue
            finally:
                browser.close()
    except Exception as e:
        print(f"    ⚠️  Allen.in error: {str(e)[:80]}")
    return results


def scrape_official_archive(years: list[int]) -> list:
    """Scrape official JEE Advanced archive for papers."""
    results = []
    if not HAS_PLAYWRIGHT:
        return results

    print(f"\n  🌐 Scraping official JEE Advanced archive...")
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            try:
                page = browser.new_context(user_agent=HEADERS["User-Agent"]).new_page()

                for url in ["https://jeeadv.ac.in/past-qps.html", "https://jeeadv.ac.in/archive.html"]:
                    try:
                        page.goto(url, timeout=15000)
                        page.wait_for_timeout(3000)
                        links = page.evaluate("""() => {
                            const r = [];
                            document.querySelectorAll('a[href]').forEach(a => {
                                const href = a.href;
                                const text = a.textContent.trim();
                                const parent = a.closest('tr') || a.closest('div') || a.parentElement;
                                const ctx = parent ? parent.textContent.substring(0, 300) : '';
                                if (href.endsWith('.pdf') || href.includes('drive.google.com'))
                                    r.push({href, text, ctx});
                            });
                            return r;
                        }""")
                        for link in links:
                            ctx = (link["text"] + " " + link.get("ctx", "")).lower()
                            ym = re.search(r'(20\d{2})', ctx)
                            if not ym:
                                continue
                            year = int(ym.group(1))
                            if year not in years:
                                continue
                            paper_num = None
                            if any(x in ctx for x in ["paper 1", "paper-1", "paper1", "paper i"]):
                                paper_num = 1
                            elif any(x in ctx for x in ["paper 2", "paper-2", "paper2", "paper ii"]):
                                paper_num = 2
                            results.append({"year": year, "paper": paper_num, "url": link["href"]})
                        if results:
                            print(f"    Found {len(results)} links from {url}")
                            break
                    except:
                        continue
            finally:
                browser.close()
    except Exception as e:
        print(f"    ⚠️  Official error: {str(e)[:80]}")
    return results


def scrape_vedantu_papers(years: list[int]) -> dict:
    """Try Vedantu for JEE Advanced papers."""
    results = {}
    if not HAS_PLAYWRIGHT:
        return results

    print(f"\n  🌐 Checking Vedantu for JEE Advanced papers...")
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            try:
                page = browser.new_context(user_agent=HEADERS["User-Agent"]).new_page()
                for year in years:
                    for paper_num in [1, 2]:
                        urls = [
                            f"https://www.vedantu.com/jee-advanced/question-papers-{year}-paper-{paper_num}",
                            f"https://www.vedantu.com/jee-advanced/previous-year-question-papers-{year}",
                        ]
                        for url in urls:
                            try:
                                page.goto(url, timeout=15000, wait_until="domcontentloaded")
                                page.wait_for_timeout(2000)
                                links = page.evaluate("""() => {
                                    const r = [];
                                    document.querySelectorAll('a[href]').forEach(a => {
                                        if (a.href.endsWith('.pdf') || a.href.includes('drive.google.com'))
                                            r.push(a.href);
                                    });
                                    return r;
                                }""")
                                for href in links:
                                    key = f"{year}_paper{paper_num}"
                                    results[key] = href
                                    break
                            except:
                                continue
            finally:
                browser.close()
    except Exception as e:
        print(f"    ⚠️  Vedantu error: {str(e)[:80]}")
    return results


def get_save_path(year: int, paper: int) -> Path:
    return DOWNLOAD_DIR / f"jee_advanced_{year}_paper{paper}.pdf"


def scrape_all(years=None):
    if years is None:
        years = list(range(2025, 2012, -1))

    downloaded = 0
    missing = []

    # Check what's already downloaded
    for year in years:
        for paper_num in [1, 2]:
            sp = get_save_path(year, paper_num)
            if sp.exists() and sp.stat().st_size > 5000:
                print(f"  ⏭️  Already have: jee_advanced_{year}_paper{paper_num}.pdf")
                downloaded += 1
            else:
                missing.append({"year": year, "paper": paper_num})

    if not missing:
        print(f"\n  ✅ All papers already downloaded!")
        return downloaded

    print(f"\n  📋 Need to download {len(missing)} paper(s):")
    for m in missing:
        print(f"     - JEE Advanced {m['year']} Paper {m['paper']}")

    # Collect years we need
    missing_years = list(set(m["year"] for m in missing))

    # 1. Official archive
    official_links = scrape_official_archive(missing_years)
    for item in official_links:
        year = item["year"]
        paper_num = item.get("paper")
        if not paper_num:
            continue
        save_path = get_save_path(year, paper_num)
        if save_path.exists() and save_path.stat().st_size > 5000:
            continue
        print(f"\n    📥 jee_advanced_{year}_paper{paper_num}.pdf (official)")
        url = item["url"]
        gm = re.search(r'drive\.google\.com/file/d/([^/]+)', url)
        if gm:
            if download_from_gdrive(gm.group(1), save_path):
                downloaded += 1
                # Remove from missing
                missing = [m for m in missing if not (m["year"] == year and m["paper"] == paper_num)]
        elif download_direct_pdf(url, save_path):
            downloaded += 1
            missing = [m for m in missing if not (m["year"] == year and m["paper"] == paper_num)]
        time.sleep(1)

    # 2. Allen.in
    if missing:
        allen_links = scrape_allen_papers(missing_years)
        for m in list(missing):
            key = f"{m['year']}_paper{m['paper']}"
            if key in allen_links:
                save_path = get_save_path(m["year"], m["paper"])
                print(f"\n    📥 jee_advanced_{m['year']}_paper{m['paper']}.pdf (Allen)")
                url = allen_links[key]
                gm = re.search(r'drive\.google\.com/file/d/([^/]+)', url)
                if gm:
                    if download_from_gdrive(gm.group(1), save_path):
                        downloaded += 1
                        missing.remove(m)
                elif download_direct_pdf(url, save_path):
                    downloaded += 1
                    missing.remove(m)
                time.sleep(1)

    # 3. MathonGo download pages
    if missing:
        print(f"\n  🌐 Trying MathonGo download pages for {len(missing)} remaining papers...")
        for m in list(missing):
            mathongo_url = f"https://www.mathongo.com/download/jee-advanced-{m['year']}-paper-{m['paper']}/"
            save_path = get_save_path(m["year"], m["paper"])
            print(f"\n    📥 jee_advanced_{m['year']}_paper{m['paper']}.pdf (MathonGo)")
            if download_via_playwright(mathongo_url, save_path):
                downloaded += 1
                missing.remove(m)
            else:
                print(f"    ⚠️  MathonGo failed")
            time.sleep(2)

    # 4. Vedantu
    if missing:
        vedantu_links = scrape_vedantu_papers([m["year"] for m in missing])
        for m in list(missing):
            key = f"{m['year']}_paper{m['paper']}"
            if key in vedantu_links:
                save_path = get_save_path(m["year"], m["paper"])
                print(f"\n    📥 jee_advanced_{m['year']}_paper{m['paper']}.pdf (Vedantu)")
                url = vedantu_links[key]
                gm = re.search(r'drive\.google\.com/file/d/([^/]+)', url)
                if gm:
                    if download_from_gdrive(gm.group(1), save_path):
                        downloaded += 1
                        missing.remove(m)
                elif download_direct_pdf(url, save_path):
                    downloaded += 1
                    missing.remove(m)
                time.sleep(1)

    if missing:
        print(f"\n  ⚠️  Could not download {len(missing)} paper(s):")
        for m in missing:
            print(f"     ❌ JEE Advanced {m['year']} Paper {m['paper']}")

    return downloaded


def print_inventory():
    print(f"\n📊 JEE Advanced Paper Inventory\n{'='*60}")
    if not DOWNLOAD_DIR.exists():
        print("  No papers yet.")
        return
    by_year = {}
    for f in sorted(DOWNLOAD_DIR.glob("*.pdf")):
        ym = re.search(r'(\d{4})', f.name)
        if ym:
            by_year.setdefault(ym.group(1), []).append(f)
    total = 0
    for year in sorted(by_year.keys(), reverse=True):
        items = by_year[year]
        total += len(items)
        has_p1 = any("paper1" in f.name for f in items)
        has_p2 = any("paper2" in f.name for f in items)
        status = "✅" if has_p1 and has_p2 else "⚠️ "
        print(f"\n  {status} {year}: {len(items)} paper(s)")
        for f in items:
            print(f"     📄 {f.name} ({f.stat().st_size // 1024} KB)")

    # Summary
    expected = 26  # 13 years × 2 papers
    print(f"\n  📊 Total: {total} / {expected} papers")
    if total < expected:
        print(f"  ⚠️  Missing {expected - total} papers")


def main():
    parser = argparse.ArgumentParser(description="Scrape JEE Advanced Papers (2013-2025)")
    parser.add_argument("--year", type=int)
    parser.add_argument("--inventory", action="store_true")
    args = parser.parse_args()

    if args.inventory:
        print_inventory()
        return

    years = [args.year] if args.year else None
    print(f"\n🚀 JEE Advanced Paper Scraper")
    print(f"   Years: {years or 'ALL (2013-2025)'}")
    print(f"   Papers per year: 2 (Paper 1 + Paper 2)")
    print(f"   Playwright: {'✅' if HAS_PLAYWRIGHT else '❌ (install: pip install playwright && playwright install)'}")
    print(f"{'='*60}")

    downloaded = scrape_all(years=years)

    print(f"\n{'='*60}")
    print(f"🎉 Done! ✅ {downloaded} papers ready")
    print(f"   📂 {DOWNLOAD_DIR}")
    print(f"\n   💡 Next steps:")
    print(f"      1. python generate_jee_advanced_papers.py --upload")
    print(f"      2. cd backend && python extract_library_texts.py")


if __name__ == "__main__":
    main()
