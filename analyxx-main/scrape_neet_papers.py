"""
Scrape NEET PYQ papers for ALL years (2013-2025).
Uses verified direct PDF URLs from Google search results.

Storage path: library-papers/neet/Paper/{year}.pdf

Usage:
    python scrape_neet_papers.py                # Download all
    python scrape_neet_papers.py --upload       # Download + upload to Supabase
    python scrape_neet_papers.py --inventory    # Show inventory
"""

import os, re, time, argparse
from pathlib import Path
from typing import Optional, List, Dict

import requests

BASE_DIR = Path(__file__).parent
DOWNLOAD_DIR = BASE_DIR / "papers_to_upload" / "NEET"
DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
}

# Verified direct PDF URLs (from Google filetype:pdf search results)
CURATED_URLS: Dict[int, List[str]] = {
    2025: [
        "https://www.oswaal360.com/pluginfile.php/10939/mod_folder/content/0/NEET/NEET%202025/NEET%202025.pdf",
        "https://static.zollege.in/public/image/NEET_2025_Code_48_Question_Paper_with_Solution_ca7d649f83538ed0ebfbfaa768e14632.pdf",
        "https://excelac.in/Neet-Coaching/wp-content/uploads/2025/05/NEET-2025-QP-Key-Solution-Final-1.pdf",
        "https://dcx0p3on5z8dw.cloudfront.net/Aakash/s3fs-public/pdf_management_files/target_solutions/Answers-and-Solutions_NEET-2025_Code-47-PCB.pdf",
    ],
    2024: [
        "https://static.pw.live/5eb393ee95fab7468a79d189/GLOBAL_CMS_BLOGS/7c43240b-e371-4c3e-b37b-595c8a0f0012.pdf",
        "https://static.collegedekho.com/media/uploads/2024/09/18/neet-2024-question-paper-q4.pdf",
        "https://cdn-images.prepp.in/public/image/neet-2024-paper-1-question-paper-pdf-may-5-2024-q1-1760946145.pdf",
    ],
    2023: [
        "https://static.pw.live/5eb393ee95fab7468a79d189/GLOBAL_CMS_BLOGS/5515ee2f-5949-4a15-b8d7-84eb4ebf9c37.pdf",
        "https://image-static.collegedunia.com/public/image/NEET_2023_Question_Paper_with_Answer_Key_G1_718d9b01dab7e8f020ebe66eb028339c.pdf",
        "https://cdn-images.prepp.in/public/image/neet-2023-question-paper-pdf-may-07-2023-e1-1760947825.pdf",
    ],
    2022: [
        "https://webapi.entab.info/api/image/TAFS/public/pdf/NEET-2022-QP.pdf",
        "https://static.collegedekho.com/media/uploads/2022/07/18/code-r6__ques-ans_neet-2022.pdf",
        "https://cdn-images.prepp.in/public/image/neet-2022-question-paper-pdf-jul-17-2022-s4-1760959066.pdf",
        "https://files.askiitians.com/cdn/medical/NEET_2022_Paper_code_R1.pdf",
        "https://static.pw.live/5eb393ee95fab7468a79d189/GLOBAL_CMS_BLOGS/2963f7ac-4fbb-4075-bfff-a7b9880c4878.pdf",
    ],
    2021: [
        "https://neetphysicsclasses.in/downloads/NEET_2021.pdf",
        "https://static.collegedekho.com/media/django-summernote/2021-09-13/5a3c34a4-0882-4037-9a5d-fcc051c4748f.pdf",
        "https://www.meniit.com/pdf/2023/11/neet-2021-paper-code-m5-meniit-3737571.pdf",
    ],
    2020: [
        "https://static.collegedekho.com/media/django-summernote/2020-09-14/ae5ea408-4dc5-4649-8142-32e2cd11e8b8.pdf",
        "https://cdn.targetpublications.org/admin/downloads/10-03-2020_112924.pdf",
        "https://cdn-images.prepp.in/public/image/neet-2020-answer-key-pdf-sep13-2020-e4-1760964574.pdf",
        "https://unacademy.com/content/wp-content/uploads/sites/2/2022/05/2020-NEET-Phase-I_G5.pdf",
    ],
    2019: [
        "https://www.aakash.ac.in/neet-answer-key-solution/NEET-2019%20(Code-P1)_Question%20Paper.pdf",
        "https://www.meniit.com/pdf/2023/11/neet-2019-paper-code-p3-meniit-6721140.pdf",
        "https://cdn-images.prepp.in/public/image/neet-2019-paper-1-answer-key-pdf-may-05-2019-p4-1761558147.pdf",
        "https://www.oswaal360.com/pluginfile.php/10939/mod_folder/content/0/pyp24/neet_yearwise/NEET%20UG%202019.pdf",
    ],
    2018: [
        "https://unacademy.com/content/wp-content/uploads/sites/2/2022/10/neet-2018-question-paper-code-ZZ.pdf",
        "https://cdn-images.prepp.in/public/image/neet-2018-answer-key-pdf-may-06-2018-zz-1761561303.pdf",
        "https://uploads.sarvgyan.com/2018/05/NEET-2018-Answer-Key-CODE-KK-aakash.pdf",
    ],
    2017: [
        "https://uploads.sarvgyan.com/2017/05/neet-2017-question-paper-code-c.pdf",
        "https://static.pw.live/5eb393ee95fab7468a79d189/GLOBAL_CMS_BLOGS/3a856a1c-9409-4779-85dd-3085272ea355.pdf",
        "https://www.meniit.com/pdf/2023/11/neet-2017-paper-code-p-meniit-1593313.pdf",
        "https://static.zollege.in/public/image/93d1deee9985f1a93f45fffe390e2a0d.pdf",
    ],
    2016: [
        "https://uploads.sarvgyan.com/2016/05/NEET-Phase-2-Code-AA-2016-question-paper.pdf",
        "https://cdn-images.prepp.in/public/image/neet-2016-question-paper-pdf-may-1-2016-d-s-z-1761568043.pdf",
        "https://www.meniit.com/pdf/2023/11/neet-2016-paper-code-y-meniit-37792.pdf",
        "https://www.neetphysicsclasses.in/downloads/4_NEET_2016_Phase_I_By_ALLEN.pdf",
    ],
    2015: [
        "https://uploads.sarvgyan.com/2016/05/AIPMT-2015-question-paper-CODE-E.pdf",
        "https://www.meniit.com/pdf/2023/11/neet-2015-paper-code-f-meniit-3868294.pdf",
        "https://www.neetphysicsclasses.in/downloads/7_AIPMT_2015_Retest_By_ALLEN.pdf",
        "https://unacademy.com/content/wp-content/uploads/sites/2/2022/05/2014-Paper_NEET-11.pdf",
    ],
    2014: [
        "https://unacademy.com/content/wp-content/uploads/sites/2/2022/05/2014-Paper_NEET-11.pdf",
        "https://www.meniit.com/pdf/2023/11/neet-2014-paper-code-s-meniit-4416920.pdf",
        "https://uploads.sarvgyan.com/2016/05/AIPMT-2014-question-paper.pdf",
        "https://www.neetphysicsclasses.in/downloads/8_AIPMT_2014_By_ALLEN.pdf",
    ],
    2013: [
        "https://www.oswaal360.com/pluginfile.php/10939/mod_folder/content/0/pyp24/neet_yearwise/NEET%20UG%202013.pdf",
        "https://www.meniit.com/pdf/2023/11/neet-2013-paper-meniit.pdf",
    ],
}

ALL_YEARS = sorted(CURATED_URLS.keys(), reverse=True)


def download_pdf(url: str, save_path: Path) -> bool:
    """Download PDF from URL. Returns True on success."""
    try:
        resp = requests.get(url, headers=HEADERS, timeout=90, allow_redirects=True)
        content = resp.content
        if resp.status_code == 200 and len(content) > 50000:
            if content[:5] == b'%PDF-' or content[:4] == b'%PDF':
                save_path.parent.mkdir(parents=True, exist_ok=True)
                with open(save_path, "wb") as f:
                    f.write(content)
                return True
    except Exception:
        pass
    return False


def scrape_all(years: Optional[List[int]] = None, dry_run: bool = False) -> int:
    if years is None:
        years = ALL_YEARS

    downloaded = 0
    missing = []

    for year in years:
        sp = DOWNLOAD_DIR / f"neet_{year}.pdf"
        if sp.exists() and sp.stat().st_size > 50000:
            print(f"  ⏭️  Already have: neet_{year}.pdf ({sp.stat().st_size // 1024} KB)")
            downloaded += 1
        else:
            # Remove tiny/corrupt files
            if sp.exists():
                sp.unlink()
            missing.append(year)

    if not missing:
        print(f"\n  ✅ All {len(years)} papers already downloaded!")
        return downloaded

    print(f"\n  📋 Need to download {len(missing)} paper(s): {', '.join(str(y) for y in missing)}")
    if dry_run:
        return downloaded

    for year in missing:
        save_path = DOWNLOAD_DIR / f"neet_{year}.pdf"
        urls = CURATED_URLS.get(year, [])
        success = False

        for i, url in enumerate(urls):
            domain = url.split('/')[2][:30]
            print(f"  📥 NEET {year} — source {i+1}/{len(urls)} ({domain})...", end=" ", flush=True)
            if download_pdf(url, save_path):
                print(f"✅ ({save_path.stat().st_size // 1024} KB)")
                downloaded += 1
                success = True
                break
            else:
                print("❌")
            time.sleep(0.5)

        if not success:
            print(f"  ⚠️  Could not download NEET {year}")
        time.sleep(1)

    return downloaded


def print_inventory():
    print(f"\n📊 NEET Paper Inventory\n{'='*60}")
    papers = sorted(DOWNLOAD_DIR.glob("neet_*.pdf"))
    if not papers:
        print("  No papers found. Run: python scrape_neet_papers.py")
        return
    for f in papers:
        ym = re.search(r'(\d{4})', f.name)
        year = ym.group(1) if ym else "?"
        print(f"  📄 NEET {year} — {f.stat().st_size // 1024} KB")
    have = {re.search(r'(\d{4})', f.name).group(1) for f in papers if re.search(r'(\d{4})', f.name)}
    need = [str(y) for y in ALL_YEARS if str(y) not in have]
    print(f"\n  📊 Total: {len(papers)} / {len(ALL_YEARS)} papers")
    if need:
        print(f"  ⚠️  Missing: {', '.join(need)}")


def upload_to_supabase():
    """Upload scraped NEET papers to Supabase Storage."""
    try:
        from dotenv import load_dotenv
        load_dotenv(os.path.join(os.path.dirname(__file__), "backend", ".env"))
        from supabase import create_client, ClientOptions

        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_KEY")
        if not url or not key:
            print("  ❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in backend/.env")
            return
        supabase = create_client(url, key, options=ClientOptions(storage_client_timeout=300))
        BUCKET = "library-papers"

        pdfs = sorted(DOWNLOAD_DIR.glob("neet_*.pdf"))
        if not pdfs:
            print("  No papers to upload.")
            return

        print(f"\n📤 Uploading {len(pdfs)} NEET papers to Supabase...")
        success = 0
        for pdf_path in pdfs:
            ym = re.search(r'(\d{4})', pdf_path.name)
            if not ym:
                continue
            year = ym.group(1)
            storage_path = f"neet/Paper/{year}.pdf"

            with open(pdf_path, "rb") as f:
                content = f.read()

            try:
                try:
                    supabase.storage.from_(BUCKET).remove([storage_path])
                except Exception:
                    pass
                supabase.storage.from_(BUCKET).upload(
                    path=storage_path, file=content,
                    file_options={"content-type": "application/pdf"},
                )
                print(f"  ✅ → {storage_path} ({len(content):,} bytes)")
                success += 1
            except Exception as e:
                if "Duplicate" in str(e) or "already exists" in str(e).lower():
                    print(f"  ℹ️  Already exists → {storage_path}")
                    success += 1
                else:
                    print(f"  ❌ Failed {storage_path}: {e}")
            time.sleep(0.3)

        print(f"\n  🎉 Uploaded {success}/{len(pdfs)} papers")
    except ImportError:
        print("  ❌ Run: pip install python-dotenv supabase")
    except Exception as e:
        print(f"  ❌ Upload error: {e}")


def main():
    parser = argparse.ArgumentParser(description="Scrape NEET Papers (2013-2025)")
    parser.add_argument("--year", type=int, help="Specific year")
    parser.add_argument("--inventory", action="store_true")
    parser.add_argument("--upload", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    if args.inventory:
        print_inventory()
        return

    years = [args.year] if args.year else None
    print(f"\n🚀 NEET Paper Scraper")
    print(f"   Years: {years or 'ALL (2013-2025)'}")
    print(f"{'='*60}")

    downloaded = scrape_all(years=years, dry_run=args.dry_run)

    print(f"\n{'='*60}")
    print(f"🎉 Done! {downloaded} papers ready in {DOWNLOAD_DIR}")

    if args.upload and not args.dry_run:
        upload_to_supabase()


if __name__ == "__main__":
    main()
