#!/usr/bin/env python3
"""
NEET / AIPMT All Years — Scrape, Download & Upload to Cloudflare R2.

Downloads NEET (2013-2025) and AIPMT (2006-2012) question papers,
then uploads ALL papers to Cloudflare R2 using wrangler CLI.

Coverage: 20 years (2006–2025) = 20 PDFs total.

Local naming:  neet_{year}.pdf
R2 key:        library-papers/neet/Paper/{year}.pdf

Usage:
    python scrape_neet_all_years.py                  # Full pipeline
    python scrape_neet_all_years.py --download-only  # Only download missing
    python scrape_neet_all_years.py --upload-only    # Only upload existing
    python scrape_neet_all_years.py --inventory      # Show what we have
    python scrape_neet_all_years.py --dry-run        # Preview uploads
"""
import os, sys, json, time, re, argparse, subprocess
from pathlib import Path
from datetime import datetime
from typing import Optional, List, Dict

import requests

# ── Paths ──
BASE_DIR = Path(__file__).parent
DOWNLOAD_DIR = BASE_DIR / "papers_to_upload" / "NEET"
DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)
MANIFEST_PATH = BASE_DIR / "backend" / "r2_paper_manifest.json"
BUCKET = "analyxx-papers"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
}

# ── Years ──
YEARS = list(range(2006, 2026))  # 2006 to 2025 inclusive

# ══════════════════════════════════════════════════════════════════════
#  CURATED PDF URLS — verified working URLs
# ══════════════════════════════════════════════════════════════════════

CURATED_URLS: Dict[int, List[str]] = {
    # ── AIPMT Era (2006–2012) - verified URLs from EasyBiologyClass ──
    2006: [
        "https://easybiologyclass.com/wp-content/uploads/2018/02/NEET-AIPMT-2006-Preliminary-Original-Solved-Question-Paper.pdf",
    ],
    2007: [
        "https://easybiologyclass.com/wp-content/uploads/2018/02/NEET-AIPMT-2007-Preliminary-Original-Solved-Question-Paper.pdf",
    ],
    2008: [
        "https://easybiologyclass.com/wp-content/uploads/2018/02/NEET-AIPMT-2008-Preliminary-Original-Solved-Question-Paper.pdf",
    ],
    2009: [
        "https://easybiologyclass.com/wp-content/uploads/2018/02/NEET-AIPMT-2009-Preliminary-Original-Solved-Question-Paper.pdf",
    ],
    2010: [
        "https://easybiologyclass.com/wp-content/uploads/2018/02/NEET-AIPMT-2010-Preliminary-Original-Solved-Question-Paper.pdf",
    ],
    2011: [
        "https://easybiologyclass.com/wp-content/uploads/2018/02/NEET-AIPMT-2011-Preliminary-Original-Solved-Question-Paper.pdf",
    ],
    2012: [
        "https://easybiologyclass.com/wp-content/uploads/2018/02/NEET-AIPMT-2012-Preliminary-Original-Solved-Question-Paper.pdf",
    ],

    # ── NEET Era (2013–2025) — carried over from existing scraper ──
    2013: [
        "https://www.oswaal360.com/pluginfile.php/10939/mod_folder/content/0/pyp24/neet_yearwise/NEET%20UG%202013.pdf",
        "https://www.meniit.com/pdf/2023/11/neet-2013-paper-meniit.pdf",
        "https://uploads.sarvgyan.com/2016/05/AIPMT-2013-question-paper.pdf",
        "https://www.neetphysicsclasses.in/downloads/NEET_2013.pdf",
    ],
    2014: [
        "https://unacademy.com/content/wp-content/uploads/sites/2/2022/05/2014-Paper_NEET-11.pdf",
        "https://www.meniit.com/pdf/2023/11/neet-2014-paper-code-s-meniit-4416920.pdf",
        "https://uploads.sarvgyan.com/2016/05/AIPMT-2014-question-paper.pdf",
        "https://www.neetphysicsclasses.in/downloads/8_AIPMT_2014_By_ALLEN.pdf",
    ],
    2015: [
        "https://uploads.sarvgyan.com/2016/05/AIPMT-2015-question-paper-CODE-E.pdf",
        "https://www.meniit.com/pdf/2023/11/neet-2015-paper-code-f-meniit-3868294.pdf",
        "https://www.neetphysicsclasses.in/downloads/7_AIPMT_2015_Retest_By_ALLEN.pdf",
    ],
    2016: [
        "https://uploads.sarvgyan.com/2016/05/NEET-Phase-2-Code-AA-2016-question-paper.pdf",
        "https://cdn-images.prepp.in/public/image/neet-2016-question-paper-pdf-may-1-2016-d-s-z-1761568043.pdf",
        "https://www.meniit.com/pdf/2023/11/neet-2016-paper-code-y-meniit-37792.pdf",
        "https://www.neetphysicsclasses.in/downloads/4_NEET_2016_Phase_I_By_ALLEN.pdf",
    ],
    2017: [
        "https://uploads.sarvgyan.com/2017/05/neet-2017-question-paper-code-c.pdf",
        "https://static.pw.live/5eb393ee95fab7468a79d189/GLOBAL_CMS_BLOGS/3a856a1c-9409-4779-85dd-3085272ea355.pdf",
        "https://www.meniit.com/pdf/2023/11/neet-2017-paper-code-p-meniit-1593313.pdf",
        "https://static.zollege.in/public/image/93d1deee9985f1a93f45fffe390e2a0d.pdf",
    ],
    2018: [
        "https://unacademy.com/content/wp-content/uploads/sites/2/2022/10/neet-2018-question-paper-code-ZZ.pdf",
        "https://cdn-images.prepp.in/public/image/neet-2018-answer-key-pdf-may-06-2018-zz-1761561303.pdf",
        "https://uploads.sarvgyan.com/2018/05/NEET-2018-Answer-Key-CODE-KK-aakash.pdf",
    ],
    2019: [
        "https://www.aakash.ac.in/neet-answer-key-solution/NEET-2019%20(Code-P1)_Question%20Paper.pdf",
        "https://www.meniit.com/pdf/2023/11/neet-2019-paper-code-p3-meniit-6721140.pdf",
        "https://cdn-images.prepp.in/public/image/neet-2019-paper-1-answer-key-pdf-may-05-2019-p4-1761558147.pdf",
        "https://www.oswaal360.com/pluginfile.php/10939/mod_folder/content/0/pyp24/neet_yearwise/NEET%20UG%202019.pdf",
    ],
    2020: [
        "https://static.collegedekho.com/media/django-summernote/2020-09-14/ae5ea408-4dc5-4649-8142-32e2cd11e8b8.pdf",
        "https://cdn.targetpublications.org/admin/downloads/10-03-2020_112924.pdf",
        "https://cdn-images.prepp.in/public/image/neet-2020-answer-key-pdf-sep13-2020-e4-1760964574.pdf",
        "https://unacademy.com/content/wp-content/uploads/sites/2/2022/05/2020-NEET-Phase-I_G5.pdf",
    ],
    2021: [
        "https://neetphysicsclasses.in/downloads/NEET_2021.pdf",
        "https://static.collegedekho.com/media/django-summernote/2021-09-13/5a3c34a4-0882-4037-9a5d-fcc051c4748f.pdf",
        "https://www.meniit.com/pdf/2023/11/neet-2021-paper-code-m5-meniit-3737571.pdf",
    ],
    2022: [
        "https://webapi.entab.info/api/image/TAFS/public/pdf/NEET-2022-QP.pdf",
        "https://static.collegedekho.com/media/uploads/2022/07/18/code-r6__ques-ans_neet-2022.pdf",
        "https://cdn-images.prepp.in/public/image/neet-2022-question-paper-pdf-jul-17-2022-s4-1760959066.pdf",
        "https://files.askiitians.com/cdn/medical/NEET_2022_Paper_code_R1.pdf",
        "https://static.pw.live/5eb393ee95fab7468a79d189/GLOBAL_CMS_BLOGS/2963f7ac-4fbb-4075-bfff-a7b9880c4878.pdf",
    ],
    2023: [
        "https://static.pw.live/5eb393ee95fab7468a79d189/GLOBAL_CMS_BLOGS/5515ee2f-5949-4a15-b8d7-84eb4ebf9c37.pdf",
        "https://image-static.collegedunia.com/public/image/NEET_2023_Question_Paper_with_Answer_Key_G1_718d9b01dab7e8f020ebe66eb028339c.pdf",
        "https://cdn-images.prepp.in/public/image/neet-2023-question-paper-pdf-may-07-2023-e1-1760947825.pdf",
    ],
    2024: [
        "https://static.pw.live/5eb393ee95fab7468a79d189/GLOBAL_CMS_BLOGS/7c43240b-e371-4c3e-b37b-595c8a0f0012.pdf",
        "https://static.collegedekho.com/media/uploads/2024/09/18/neet-2024-question-paper-q4.pdf",
        "https://cdn-images.prepp.in/public/image/neet-2024-paper-1-question-paper-pdf-may-5-2024-q1-1760946145.pdf",
    ],
    2025: [
        "https://www.oswaal360.com/pluginfile.php/10939/mod_folder/content/0/NEET/NEET%202025/NEET%202025.pdf",
        "https://static.zollege.in/public/image/NEET_2025_Code_48_Question_Paper_with_Solution_ca7d649f83538ed0ebfbfaa768e14632.pdf",
        "https://excelac.in/Neet-Coaching/wp-content/uploads/2025/05/NEET-2025-QP-Key-Solution-Final-1.pdf",
        "https://dcx0p3on5z8dw.cloudfront.net/Aakash/s3fs-public/pdf_management_files/target_solutions/Answers-and-Solutions_NEET-2025_Code-47-PCB.pdf",
    ],
}


# ══════════════════════════════════════════════════════════════════════
#  DOWNLOAD
# ══════════════════════════════════════════════════════════════════════

def local_filename(year: int) -> str:
    return f"neet_{year}.pdf"


def r2_storage_name(year: int) -> str:
    return f"{year}.pdf"


def download_pdf(url: str, save_path: Path) -> bool:
    """Download a PDF from a URL, with validation."""
    try:
        resp = requests.get(url, headers=HEADERS, timeout=90, allow_redirects=True)
        content = resp.content
        if resp.status_code == 200 and len(content) > 50000:
            if content[:5] == b'%PDF-' or content[:4] == b'%PDF':
                save_path.parent.mkdir(parents=True, exist_ok=True)
                with open(save_path, "wb") as f:
                    f.write(content)
                print(f"    ✅ Downloaded: {save_path.name} ({len(content):,} bytes)")
                return True
            else:
                save_path.parent.mkdir(parents=True, exist_ok=True)
                with open(save_path, "wb") as f:
                    f.write(content)
                print(f"    ⚠️  Downloaded (non-standard header): {save_path.name} ({len(content):,} bytes)")
                return True
        elif resp.status_code == 200:
            print(f"    ❌ Too small ({len(content):,} bytes)")
            return False
        else:
            print(f"    ❌ HTTP {resp.status_code}")
            return False
    except requests.exceptions.Timeout:
        print(f"    ❌ Timeout")
        return False
    except Exception as e:
        print(f"    ❌ Error: {str(e)[:80]}")
        return False


def download_all_missing():
    """Download all missing NEET/AIPMT papers."""
    print("\n" + "═" * 60)
    print("  📥 DOWNLOADING MISSING NEET/AIPMT PAPERS (2006–2025)")
    print("═" * 60)

    downloaded = 0
    skipped = 0
    failed = 0
    failed_list = []

    for year in YEARS:
        fname = local_filename(year)
        save_path = DOWNLOAD_DIR / fname

        if save_path.exists() and save_path.stat().st_size > 50000:
            print(f"  ⏭️  Already have: {fname} ({save_path.stat().st_size // 1024} KB)")
            skipped += 1
            continue

        if save_path.exists():
            save_path.unlink()

        urls = CURATED_URLS.get(year, [])
        if not urls:
            print(f"\n  ⚠️  No URLs for {year}")
            failed += 1
            failed_list.append(str(year))
            continue

        print(f"\n  📄 {'AIPMT' if year <= 2012 else 'NEET'} {year}")
        success = False

        for i, url in enumerate(urls):
            domain = url.split('/')[2][:35]
            print(f"    Source {i+1}/{len(urls)} ({domain})...", end=" ", flush=True)
            if download_pdf(url, save_path):
                downloaded += 1
                success = True
                break
            time.sleep(0.5)

        if not success:
            failed += 1
            failed_list.append(str(year))
        time.sleep(0.5)

    print(f"\n  📊 Download Summary:")
    print(f"     ✅ Downloaded: {downloaded}")
    print(f"     ⏭️  Already had: {skipped}")
    print(f"     ❌ Failed: {failed}")
    if failed_list:
        print(f"     Failed years: {', '.join(failed_list)}")

    return failed_list


# ══════════════════════════════════════════════════════════════════════
#  UPLOAD TO R2 VIA WRANGLER CLI
# ══════════════════════════════════════════════════════════════════════

def upload_one_via_wrangler(local_path: str, storage_key: str) -> bool:
    """Upload a single file to R2 via wrangler CLI."""
    try:
        result = subprocess.run(
            [
                "npx", "wrangler", "r2", "object", "put",
                f"{BUCKET}/{storage_key}",
                f"--file={local_path}",
                "--content-type=application/pdf",
                "--remote",
            ],
            capture_output=True,
            text=True,
            timeout=120,
        )
        if result.returncode == 0 and "Upload complete" in result.stdout:
            return True
        else:
            err = (result.stderr or result.stdout or "").strip()
            print(f"    ⚠️ Wrangler error: {err[:120]}")
            return False
    except subprocess.TimeoutExpired:
        print(f"    ⚠️ Timeout")
        return False
    except Exception as e:
        print(f"    ⚠️ Error: {str(e)[:80]}")
        return False


def upload_all_to_r2(dry_run: bool = False):
    """Upload all local NEET/AIPMT papers to R2."""
    print("\n" + "═" * 60)
    print("  📤 UPLOADING NEET/AIPMT PAPERS TO CLOUDFLARE R2 (via Wrangler)")
    print("═" * 60)

    upload_list = []
    for year in YEARS:
        local_path = DOWNLOAD_DIR / local_filename(year)
        storage_key = f"library-papers/neet/Paper/{r2_storage_name(year)}"

        if local_path.exists() and local_path.stat().st_size > 50000:
            upload_list.append({
                "local_path": str(local_path),
                "storage_key": storage_key,
                "label": f"{'AIPMT' if year <= 2012 else 'NEET'} {year}",
                "size": local_path.stat().st_size,
                "year": year,
            })
        else:
            print(f"  ⚠️  Missing locally: {local_filename(year)}")

    print(f"\n  📦 {len(upload_list)} papers ready to upload")

    if dry_run:
        print("\n  [DRY RUN] Would upload:")
        for item in upload_list:
            print(f"    → {item['storage_key']} ({item['size']:,} bytes)")
        return upload_list

    uploaded = 0
    failed = 0
    for i, item in enumerate(upload_list, 1):
        print(f"  [{i}/{len(upload_list)}] 📤 {item['label']}...", end=" ", flush=True)
        if upload_one_via_wrangler(item["local_path"], item["storage_key"]):
            print(f"✅ ({item['size']:,} bytes)")
            uploaded += 1
        else:
            print("❌")
            failed += 1
        time.sleep(0.2)

    print(f"\n  🎉 Upload Summary:")
    print(f"     ✅ Uploaded: {uploaded}")
    print(f"     ❌ Failed: {failed}")

    return upload_list


# ══════════════════════════════════════════════════════════════════════
#  UPDATE MANIFEST
# ══════════════════════════════════════════════════════════════════════

def update_manifest(upload_list: list):
    """Add neet/Paper entries to the backend manifest file."""
    print("\n" + "═" * 60)
    print("  📋 UPDATING BACKEND MANIFEST")
    print("═" * 60)

    with open(MANIFEST_PATH) as f:
        manifest = json.load(f)

    paper_files = []
    for year in YEARS:
        fname = r2_storage_name(year)
        local_path = DOWNLOAD_DIR / local_filename(year)
        if local_path.exists() and local_path.stat().st_size > 50000:
            paper_files.append(fname)

    manifest["neet/Paper"] = paper_files

    with open(MANIFEST_PATH, "w") as f:
        json.dump(manifest, f, indent=2)

    print(f"  ✅ Added 'neet/Paper' with {len(paper_files)} entries to manifest")
    print(f"     Path: {MANIFEST_PATH}")


# ══════════════════════════════════════════════════════════════════════
#  INVENTORY
# ══════════════════════════════════════════════════════════════════════

def show_inventory():
    """Display what papers exist locally."""
    print("\n" + "═" * 60)
    print("  📊 NEET/AIPMT PAPER INVENTORY (2006–2025)")
    print("═" * 60)

    total = 0
    missing = 0
    for year in YEARS:
        p = DOWNLOAD_DIR / local_filename(year)
        p_ok = p.exists() and p.stat().st_size > 50000
        p_size = f"({p.stat().st_size:,} B)" if p_ok else ""
        era = "AIPMT" if year <= 2012 else "NEET "
        status = f"✅ {p_size}" if p_ok else "❌ Missing"
        print(f"  {era} {year}:  {status}")
        total += int(p_ok)
        missing += int(not p_ok)

    print(f"\n  Total: {total}/20 papers  |  Missing: {missing}")


# ══════════════════════════════════════════════════════════════════════
#  MAIN
# ══════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description="NEET/AIPMT — Scrape, Download & Upload to R2 (2006–2025)")
    parser.add_argument("--inventory", action="store_true", help="Show paper inventory")
    parser.add_argument("--download-only", action="store_true", help="Only download missing papers")
    parser.add_argument("--upload-only", action="store_true", help="Only upload to R2")
    parser.add_argument("--dry-run", action="store_true", help="Preview uploads without doing them")
    args = parser.parse_args()

    print("\n🏥 NEET/AIPMT Paper Pipeline (2006–2025)")
    print(f"   20 years = 20 PDFs total")
    print(f"   Download dir: {DOWNLOAD_DIR}")
    print(f"   Timestamp: {datetime.now().isoformat()}")

    if args.inventory:
        show_inventory()
        return

    if args.download_only:
        download_all_missing()
        show_inventory()
        return

    if args.upload_only:
        upload_list = upload_all_to_r2(dry_run=args.dry_run)
        if not args.dry_run:
            update_manifest(upload_list)
        return

    # Full pipeline: download → upload → update manifest
    failed = download_all_missing()
    show_inventory()
    upload_list = upload_all_to_r2(dry_run=args.dry_run)
    if not args.dry_run:
        update_manifest(upload_list)

    print("\n" + "═" * 60)
    print("  ✅ PIPELINE COMPLETE")
    print("═" * 60)


if __name__ == "__main__":
    main()
