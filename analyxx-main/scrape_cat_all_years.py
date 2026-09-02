#!/usr/bin/env python3
"""
CAT Exam All Years — Scrape, Download & Upload to Cloudflare R2.

Downloads CAT question papers (1991–2008 and 2017–2025 slots),
then uploads ALL papers to Cloudflare R2.
No files are stored in Supabase storage.

Usage:
    python scrape_cat_all_years.py                  # Full pipeline
    python scrape_cat_all_years.py --download-only  # Only download missing
    python scrape_cat_all_years.py --upload-only    # Only upload existing
    python scrape_cat_all_years.py --inventory      # Show what we have
    python scrape_cat_all_years.py --dry-run        # Preview uploads
"""
import os
import sys
import json
import time
import argparse
from pathlib import Path
from datetime import datetime
from typing import Dict, List

import requests

# ── Paths ──
BASE_DIR = Path(__file__).parent
DOWNLOAD_DIR = BASE_DIR / "papers_to_upload" / "CAT"
DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)
ENV_PATH = BASE_DIR / "backend" / ".env"
MANIFEST_PATH = BASE_DIR / "backend" / "r2_paper_manifest.json"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
}

# ══════════════════════════════════════════════════════════════════════
#  CURATED PDF URLS — verified direct download URLs
# ══════════════════════════════════════════════════════════════════════

# Structure: key is R2 storage filename (without .pdf), value is list of fallback URLs
CURATED_URLS: Dict[str, List[str]] = {
    # ── CAT 2025 ──
    "2025_slot1": [
        "https://cdn.toprankers.net.in/docs/cat-2025-slot-01--0291b89991070.pdf"
    ],
    "2025_slot2": [
        "https://cdn.toprankers.net.in/docs/cat-2025-slot-02--0291b89bb8a5a.pdf"
    ],
    "2025_slot3": [
        "https://cdn.toprankers.net.in/docs/cat-2025-pyp-slot-03-029770257245b.pdf"
    ],

    # ── CAT 2024 ──
    "2024_slot1": [
        "https://cdn.toprankers.net.in/docs/cat-previous-papers-2024-slot-1-merge-final-028e1b040a14d.pdf"
    ],
    "2024_slot2": [
        "https://cdn.toprankers.net.in/docs/cat-previous-papers-2024-slot-2-merge-final-4--028e1b04091fb.pdf"
    ],

    # ── CAT 2023 ──
    "2023_slot1": [
        "https://cdn.toprankers.net.in/docs/cat-2023-pyp-slot-01-1--028e1b0c1a7d1.pdf",
        "https://bodheeprep.com/wp-content/uploads/2023/12/CAt-2023-Question-Paper-slot-01-answer-keys-Bodheeprep.pdf"
    ],
    "2023_slot2": [
        "https://cdn.toprankers.net.in/docs/cat-2023-pyp-slot-2-1--028e1b0c195ac.pdf",
        "https://bodheeprep.com/wp-content/uploads/2023/12/CAt-2023-Question-Paper-slot-02-answer-keys-Bodheeprep.pdf"
    ],
    "2023_slot3": [
        "https://cdn.toprankers.net.in/docs/cat-2023-pyp-slot-03-1--028e1b0c18660.pdf",
        "https://bodheeprep.com/wp-content/uploads/2023/12/CAt-2023-Question-Paper-slot-03.pdf"
    ],

    # ── CAT 2022 ──
    "2022_slot1": [
        "https://bodheeprep.com/wp-content/uploads/2022/12/CAT-2022-Question-Paper-Slot-1-with-Answer-Keys-Bodhee-Prep.pdf",
        "https://cdn.toprankers.net.in/docs/cat-2022-slot-02-1--028e1b14ad593.pdf"
    ],
    "2022_slot2": [
        "https://bodheeprep.com/wp-content/uploads/2024/12/CAT-2022-Question-Paper-slot-2-with-Answer-Keys-by-Bodhee-Prep.pdf",
        "https://cdn.toprankers.net.in/docs/cat-2022-slot-03-2--028e1b14ac538.pdf"
    ],
    "2022_slot3": [
        "https://bodheeprep.com/wp-content/uploads/2024/12/CAT-2022-Question-Paper-slot-3-with-Answer-Keys-by-Bodhee-Prep.pdf"
    ],

    # ── CAT 2021 ──
    "2021_slot1": [
        "https://cdn.toprankers.net.in/docs/cat-2021-slot-01-1--028e1b17e6562.pdf",
        "https://bodheeprep.com/wp-content/uploads/2021/12/CAT-2021-paper-slot-1-with-answer-keys.pdf"
    ],
    "2021_slot2": [
        "https://cdn.toprankers.net.in/docs/cat-2021-slot-02-2--028e1b17e5a98.pdf",
        "https://bodheeprep.com/wp-content/uploads/2021/12/CAT-2021-paper-slot-2-with-answer-keys.pdf"
    ],
    "2021_slot3": [
        "https://bodheeprep.com/wp-content/uploads/2021/12/CAT-2021-paper-slot-3-with-answer-keys.pdf"
    ],

    # ── CAT 2020 ──
    "2020_slot1": [
        "https://bodheeprep.com/wp-content/uploads/2020/12/CAT-2020-Question-paper-with-Solutions-Slot-1-Bodhee-Prep.pdf",
        "https://cdn.toprankers.net.in/docs/cat-2020-slot-01-1--028e1b1de4ad6.pdf"
    ],
    "2020_slot2": [
        "https://bodheeprep.com/wp-content/uploads/2020/12/CAT-2020-Question-paper-with-Solutions-Slot-2-Bodhee-Prep.pdf",
        "https://cdn.toprankers.net.in/docs/cat-2020-slot-02-1--028e1b1de3c29.pdf"
    ],
    "2020_slot3": [
        "https://bodheeprep.com/wp-content/uploads/2020/12/CAT-2020-Question-paper-with-Solutions-Slot-3-Bodhee-Prep.pdf",
        "https://cdn.toprankers.net.in/docs/cat-2020-slot-03-1--028e1b1de2a81.pdf"
    ],

    # ── CAT 2019 ──
    "2019_slot1": [
        "https://bodheeprep.com/wp-content/uploads/2020/12/CAT-2019-OFFICIAL-question-paper-solution-slot-1-Bodheeprep.pdf",
        "https://cdn.toprankers.net.in/docs/cat-2019-slot-01-1--028e1b21e80bf.pdf"
    ],
    "2019_slot2": [
        "https://bodheeprep.com/wp-content/uploads/2020/12/CAT-2019-OFFICIAL-question-paper-solution-slot-2-Bodheeprep.pdf",
        "https://cdn.toprankers.net.in/docs/cat-2019-slot-02-1--028e1b21e7067.pdf"
    ],

    # ── CAT 2018 ──
    "2018_slot1": [
        "https://bodheeprep.com/wp-content/uploads/2019/04/CAT-2018-question-paper-with-Solution-SLOT-1-Bodhee-Prep.pdf",
        "https://cdn.toprankers.net.in/docs/cat-2018-slot-01-1--028e1b250589d.pdf"
    ],
    "2018_slot2": [
        "https://bodheeprep.com/wp-content/uploads/2019/04/CAT-2018-question-paper-with-Solution-SLOT-2-Bodhee-Prep.pdf"
    ],

    # ── CAT 2017 ──
    "2017_slot1": [
        "https://bodheeprep.com/wp-content/uploads/2021/01/CAT-2017-Question-Paper-with-Solution-SLOT-1.pdf"
    ],
    "2017_slot2": [
        "https://bodheeprep.com/wp-content/uploads/2021/01/CAT-2017-Question-Paper-with-Solution-SLOT-2.pdf"
    ],

    # ── CAT 2008 to 1991 (Pen and Paper Era) ──
    "2008": [
        "http://bodheeprep.com/wp-content/uploads/2021/01/CAT-2008-Question-Paper-with-Solution.pdf"
    ],
    "2007": [
        "http://bodheeprep.com/wp-content/uploads/2021/01/CAT-2007-Question-Paper-with-Solution.pdf"
    ],
    "2006": [
        "http://bodheeprep.com/wp-content/uploads/2021/01/CAT-2006-Question-Paper-with-Solution.pdf"
    ],
    "2005": [
        "http://bodheeprep.com/wp-content/uploads/2021/01/CAT-2005-Question-Paper-with-Solution.pdf"
    ],
    "2004": [
        "http://bodheeprep.com/wp-content/uploads/2021/01/CAT-2004-Question-Paper-with-Solution.pdf"
    ],
    "2003_retest": [
        "http://bodheeprep.com/wp-content/uploads/2021/01/CAT-2003-R-Question-Paper-with-Solution.pdf"
    ],
    "2003_leaked": [
        "http://bodheeprep.com/wp-content/uploads/2021/01/CAT-2003-L-Question-Paper-with-Solution.pdf"
    ],
    "2002": [
        "http://bodheeprep.com/wp-content/uploads/2021/01/CAT-2002-Question-Paper-with-Solution.pdf"
    ],
    "2001": [
        "http://bodheeprep.com/wp-content/uploads/2021/01/CAT-2001-Question-Paper-with-Solution.pdf"
    ],
    "2000": [
        "http://bodheeprep.com/wp-content/uploads/2021/01/CAT-2000-Question-Paper-with-Solution.pdf"
    ],
    "1999": [
        "http://bodheeprep.com/wp-content/uploads/2021/01/CAT-1999-Question-Paper-with-Solution.pdf"
    ],
    "1998": [
        "http://bodheeprep.com/wp-content/uploads/2021/01/CAT-1998-Question-Paper-with-Solution.pdf"
    ],
    "1997": [
        "http://bodheeprep.com/wp-content/uploads/2021/01/CAT-1997-Question-Paper-with-Solution.pdf"
    ],
    "1996": [
        "http://bodheeprep.com/wp-content/uploads/2021/01/CAT-1996-Question-Paper-with-Solution.pdf"
    ],
    "1995": [
        "http://bodheeprep.com/wp-content/uploads/2021/01/CAT-1995-Question-Paper-with-Solution.pdf"
    ],
    "1994": [
        "http://bodheeprep.com/wp-content/uploads/2021/01/CAT-1994-Question-Paper-with-Solution.pdf"
    ],
    "1993": [
        "http://bodheeprep.com/wp-content/uploads/2021/01/CAT-1993-Question-Paper-with-Solution.pdf"
    ],
    "1992": [
        "http://bodheeprep.com/wp-content/uploads/2021/01/CAT-1992-Question-Paper-with-Solution.pdf"
    ],
    "1991": [
        "http://bodheeprep.com/wp-content/uploads/2021/01/CAT-1991-Question-Paper-with-Solution.pdf"
    ]
}

# Minimum file size to be considered a valid PDF (10 KB)
MIN_PDF_SIZE = 10000


def download_pdf(url: str, save_path: Path) -> bool:
    """Download a PDF from a URL, validating the PDF header and file size."""
    try:
        resp = requests.get(url, headers=HEADERS, timeout=90, allow_redirects=True)
        content = resp.content
        if resp.status_code == 200 and len(content) > MIN_PDF_SIZE:
            # Verify PDF Magic Number bytes (%PDF)
            if content[:5] == b'%PDF-' or content[:4] == b'%PDF':
                save_path.parent.mkdir(parents=True, exist_ok=True)
                with open(save_path, "wb") as f:
                    f.write(content)
                print(f"    ✅ Downloaded: {save_path.name} ({len(content):,} bytes)")
                return True
            else:
                print(f"    ❌ Response is not a valid PDF header.")
                return False
        else:
            print(f"    ❌ HTTP Status {resp.status_code}, length={len(content):,}")
            return False
    except Exception as e:
        print(f"    ❌ Error: {str(e)[:80]}")
        return False


def download_all_missing():
    """Download all missing CAT papers."""
    print("\n" + "═" * 60)
    print("  📥 DOWNLOADING MISSING CAT PAPERS")
    print("═" * 60)

    downloaded = 0
    skipped = 0
    failed = 0
    failed_list = []

    for key, urls in CURATED_URLS.items():
        fname = f"cat_{key}.pdf"
        save_path = DOWNLOAD_DIR / fname

        if save_path.exists() and save_path.stat().st_size > MIN_PDF_SIZE:
            print(f"  ⏭️  Already have: {fname} ({save_path.stat().st_size // 1024} KB)")
            skipped += 1
            continue

        if save_path.exists():
            save_path.unlink()

        print(f"\n  📄 CAT paper: {key}")
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
            failed_list.append(key)
        time.sleep(0.5)

    print(f"\n  📊 Download Summary:")
    print(f"     ✅ Downloaded:  {downloaded}")
    print(f"     ⏭️  Already had: {skipped}")
    print(f"     ❌ Failed:      {failed}")
    if failed_list:
        print(f"     Failed keys:    {', '.join(failed_list)}")

    return failed_list


# ══════════════════════════════════════════════════════════════════════
#  UPLOAD TO CLOUDFLARE R2
# ══════════════════════════════════════════════════════════════════════

def upload_one_via_wrangler(bucket: str, local_path: str, storage_key: str) -> bool:
    """Upload a single file to R2 via wrangler CLI."""
    import subprocess
    try:
        result = subprocess.run(
            [
                "npx", "wrangler", "r2", "object", "put",
                f"{bucket}/{storage_key}",
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
    """Upload all downloaded CAT papers to Cloudflare R2."""
    print("\n" + "═" * 60)
    print("  📤 UPLOADING CAT PAPERS TO CLOUDFLARE R2")
    print("═" * 60)

    upload_list = []
    for key in CURATED_URLS.keys():
        local_path = DOWNLOAD_DIR / f"cat_{key}.pdf"
        storage_key = f"library-papers/cat/Paper/{key}.pdf"

        if local_path.exists() and local_path.stat().st_size > MIN_PDF_SIZE:
            upload_list.append({
                "local_path": str(local_path),
                "storage_key": storage_key,
                "label": f"CAT {key.replace('_', ' ').title()}",
                "size": local_path.stat().st_size,
                "key": key,
            })
        else:
            print(f"  ⚠️  Missing locally: cat_{key}.pdf")

    print(f"\n  📦 {len(upload_list)} papers ready to upload")

    if dry_run:
        print("\n  [DRY RUN] Would upload:")
        for item in upload_list:
            print(f"    → {item['storage_key']} ({item['size']:,} bytes)")
        return upload_list

    bucket = "analyxx-papers"
    try:
        from dotenv import load_dotenv
        load_dotenv(str(ENV_PATH))
        bucket = os.getenv("R2_BUCKET_NAME", bucket)
    except Exception:
        pass

    uploaded = 0
    failed = 0
    for i, item in enumerate(upload_list, 1):
        print(f"  [{i}/{len(upload_list)}] 📤 {item['label']}...", end=" ", flush=True)
        if upload_one_via_wrangler(bucket, item["local_path"], item["storage_key"]):
            print(f"✅ ({item['size']:,} bytes)")
            uploaded += 1
        else:
            print("❌")
            failed += 1
        time.sleep(0.2)

    print(f"\n  🎉 Upload Summary:")
    print(f"     ✅ Uploaded: {uploaded}")
    print(f"     ❌ Failed:   {failed}")

    return upload_list


# ══════════════════════════════════════════════════════════════════════
#  UPDATE MANIFEST
# ══════════════════════════════════════════════════════════════════════

def update_manifest(upload_list: list):
    """Add cat/Paper entries to the backend manifest file."""
    print("\n" + "═" * 60)
    print("  📋 UPDATING BACKEND MANIFEST")
    print("═" * 60)

    with open(MANIFEST_PATH) as f:
        manifest = json.load(f)

    # Build sorted file list from successfully downloaded files
    paper_files = []
    for key in CURATED_URLS.keys():
        fname = f"{key}.pdf"
        local_path = DOWNLOAD_DIR / f"cat_{key}.pdf"
        if local_path.exists() and local_path.stat().st_size > MIN_PDF_SIZE:
            paper_files.append(fname)

    # Sort files: numerical (years) descending, leaked/retest/slots properly sorted
    paper_files.sort(reverse=True)

    manifest["cat/Paper"] = paper_files

    with open(MANIFEST_PATH, "w") as f:
        json.dump(manifest, f, indent=2)

    print(f"  ✅ Added 'cat/Paper' with {len(paper_files)} entries to manifest")
    print(f"     Path: {MANIFEST_PATH}")


# ══════════════════════════════════════════════════════════════════════
#  INVENTORY
# ══════════════════════════════════════════════════════════════════════

def show_inventory():
    """Display local inventory status."""
    print("\n" + "═" * 60)
    print("  📊 CAT PAPER LOCAL INVENTORY")
    print("═" * 60)

    total = 0
    missing = 0
    for key in CURATED_URLS.keys():
        p = DOWNLOAD_DIR / f"cat_{key}.pdf"
        p_ok = p.exists() and p.stat().st_size > MIN_PDF_SIZE
        p_size = f"({p.stat().st_size // 1024} KB)" if p_ok else ""
        status = f"✅ {p_size}" if p_ok else "❌ Missing"
        print(f"  CAT {key:<12}: {status}")
        total += int(p_ok)
        missing += int(not p_ok)

    print(f"\n  Total: {total}/{len(CURATED_URLS)} papers  |  Missing: {missing}")


# ══════════════════════════════════════════════════════════════════════
#  MAIN
# ══════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description="CAT PyQ Scraper & Upload Pipeline")
    parser.add_argument("--inventory", action="store_true", help="Show inventory status")
    parser.add_argument("--download-only", action="store_true", help="Only download missing papers")
    parser.add_argument("--upload-only", action="store_true", help="Only upload to R2")
    parser.add_argument("--dry-run", action="store_true", help="Preview uploads")
    args = parser.parse_args()

    print("\n🎓 CAT Exam Paper Pipeline")
    print(f"   Target coverage: {len(CURATED_URLS)} PDFs total")
    print(f"   Download dir:    {DOWNLOAD_DIR}")
    print(f"   Timestamp:       {datetime.now().isoformat()}")

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
