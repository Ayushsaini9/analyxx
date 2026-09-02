#!/usr/bin/env python3
"""
GATE Computer Science (CS) Past 20 Years (2006–2025) Scraper & R2 Uploader.
Downloads official Master Question Papers from the gadepall/GATE repository,
uploads them to Cloudflare R2 via Wrangler CLI, and updates the manifests.

Usage:
    python scrape_gate_all_years.py
    python scrape_gate_all_years.py --download-only
    python scrape_gate_all_years.py --upload-only
    python scrape_gate_all_years.py --dry-run
"""

import os
import sys
import json
import time
import argparse
import subprocess
from pathlib import Path
import requests
from dotenv import load_dotenv

# ── Paths ──
BASE_DIR = Path(__file__).parent.resolve()
DOWNLOAD_DIR = BASE_DIR / "papers_to_upload" / "GATE"
DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)
ENV_PATH = BASE_DIR / "backend" / ".env"

MANIFEST_PATHS = [
    BASE_DIR / "backend" / "r2_paper_manifest.json",
    BASE_DIR / "backend" / "app" / "r2_paper_manifest.json",
    BASE_DIR / "whatsapp-bot" / "src" / "r2_paper_manifest.json",
]

RAW_BASE_URL = "https://raw.githubusercontent.com/gadepall/GATE/master"
BUCKET = "analyxx-papers"

# ── Curated Files & Naming Map ──
GATE_PAPERS = {
    2006: [{"url_path": "papers/archive/CS/GATE2006.pdf", "local_name": "2006.pdf"}],
    2007: [{"url_path": "papers/archive/CS/GATE2007.pdf", "local_name": "2007.pdf"}],
    2008: [{"url_path": "papers/archive/CS/GATE2008.pdf", "local_name": "2008.pdf"}],
    2009: [{"url_path": "papers/archive/CS/GATE2009.pdf", "local_name": "2009.pdf"}],
    2010: [{"url_path": "papers/archive/CS/GATE2010.pdf", "local_name": "2010.pdf"}],
    2011: [{"url_path": "papers/archive/CS/GATE2011.pdf", "local_name": "2011.pdf"}],
    2012: [{"url_path": "papers/archive/CS/GATE2012.pdf", "local_name": "2012.pdf"}],
    2013: [{"url_path": "papers/archive/CS/GATE2013.pdf", "local_name": "2013.pdf"}],
    2014: [
        {"url_path": "papers/archive/CS/GATE2014-Set-1.pdf", "local_name": "2014_set1.pdf"},
        {"url_path": "papers/archive/CS/GATE2014-Set-2.pdf", "local_name": "2014_set2.pdf"},
        {"url_path": "papers/archive/CS/GATE2014-Set-3.pdf", "local_name": "2014_set3.pdf"},
    ],
    2015: [
        {"url_path": "papers/archive/CS/GATE2015-Set-1.pdf", "local_name": "2015_set1.pdf"},
        {"url_path": "papers/archive/CS/GATE2015-Set-2.pdf", "local_name": "2015_set2.pdf"},
        {"url_path": "papers/archive/CS/GATE2015-Set-3.pdf", "local_name": "2015_set3.pdf"},
    ],
    2016: [
        {"url_path": "papers/archive/CS/GATE2016-Set-1.pdf", "local_name": "2016_set1.pdf"},
        {"url_path": "papers/archive/CS/GATE2016-Set-2.pdf", "local_name": "2016_set2.pdf"},
    ],
    2017: [
        {"url_path": "papers/archive/CS/GATE2017-Set-1.pdf", "local_name": "2017_set1.pdf"},
        {"url_path": "papers/archive/CS/GATE2017-Set-2.pdf", "local_name": "2017_set2.pdf"},
    ],
    2018: [{"url_path": "papers/archive/CS/GATE2018.pdf", "local_name": "2018.pdf"}],
    2019: [{"url_path": "papers/archive/CS/2019_CS_Paper.pdf", "local_name": "2019.pdf"}],
    2020: [{"url_path": "papers/archive/CS/CS-2020.PDF", "local_name": "2020.pdf"}],
    2021: [
        {"url_path": "papers/archive/CS/2021/GATE2021_QP_CS-1.pdf", "local_name": "2021_set1.pdf"},
        {"url_path": "papers/archive/CS/2021/GATE2021_QP_CS-2.pdf", "local_name": "2021_set2.pdf"},
    ],
    2022: [{"url_path": "papers/archive/CS/cs_2022.pdf", "local_name": "2022.pdf"}],
    2023: [{"url_path": "papers/2023/cs_2023.pdf", "local_name": "2023.pdf"}],
    2024: [
        {"url_path": "papers/2024/CS124S5.pdf", "local_name": "2024_set1.pdf"},
        {"url_path": "papers/2024/CS224S6.pdf", "local_name": "2024_set2.pdf"},
    ],
    2025: [
        {"url_path": "papers/2025/CS12025.pdf", "local_name": "2025_set1.pdf"},
        {"url_path": "papers/2025/CS22025.pdf", "local_name": "2025_set2.pdf"},
    ],
}

def download_papers():
    """Download GATE papers from Github raw repository."""
    print("\n" + "═" * 60)
    print("  📥 DOWNLOADING GATE CS PAPERS (2006–2025)")
    print("═" * 60)

    downloaded = 0
    skipped = 0
    failed = 0
    headers = {"User-Agent": "Mozilla/5.0"}

    for year, files in sorted(GATE_PAPERS.items()):
        for f in files:
            url = f"{RAW_BASE_URL}/{f['url_path']}"
            local_path = DOWNLOAD_DIR / f["local_name"]

            # If file already exists and is large enough, skip
            if local_path.exists() and local_path.stat().st_size > 10000:
                print(f"  ⏭️  Already exists: {f['local_name']} ({local_path.stat().st_size // 1024} KB)")
                skipped += 1
                continue

            print(f"  📄 Downloading {f['local_name']} ...", end=" ", flush=True)
            try:
                resp = requests.get(url, headers=headers, timeout=60)
                if resp.status_code == 200:
                    with open(local_path, "wb") as lf:
                        lf.write(resp.content)
                    print(f"✅ ({len(resp.content) // 1024} KB)")
                    downloaded += 1
                else:
                    print(f"❌ (HTTP {resp.status_code})")
                    failed += 1
            except Exception as e:
                print(f"❌ (Error: {str(e)[:50]})")
                failed += 1
            time.sleep(0.1)

    print(f"\n📥 Downloads Completed: ✅ {downloaded} downloaded, ⏭️ {skipped} skipped, ❌ {failed} failed")
    return failed == 0

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
        print("    ⚠️ Timeout")
        return False
    except Exception as e:
        print(f"    ⚠️ Error: {str(e)[:80]}")
        return False

def upload_papers_to_r2(dry_run=False):
    """Upload downloaded GATE papers to R2 and return list of filenames."""
    print("\n" + "═" * 60)
    print("  📤 UPLOADING GATE CS PAPERS TO CLOUDFLARE R2 (via Wrangler)")
    print("═" * 60)

    uploaded_files = []

    for year, files in sorted(GATE_PAPERS.items()):
        for f in files:
            local_path = DOWNLOAD_DIR / f["local_name"]
            r2_key = f"library-papers/gate/Paper/{f['local_name']}"

            if not local_path.exists():
                print(f"  ⚠️ Skipping {f['local_name']} (local file missing)")
                continue

            if dry_run:
                print(f"  [DRY RUN] Would upload {f['local_name']} to bucket={BUCKET}, key={r2_key}")
                uploaded_files.append(f["local_name"])
                continue

            print(f"  📤 Uploading {f['local_name']} ...", end=" ", flush=True)
            if upload_one_via_wrangler(str(local_path), r2_key):
                print("✅")
                uploaded_files.append(f["local_name"])
            else:
                print("❌")
            time.sleep(0.1)

    return sorted(uploaded_files)

def update_manifests(uploaded_files):
    """Update R2 paper manifest JSON files with GATE entries."""
    print("\n" + "═" * 60)
    print("  📋 UPDATING MANIFEST CONFIGURATIONS")
    print("═" * 60)

    for manifest_path in MANIFEST_PATHS:
        if not manifest_path.exists():
            print(f"  ⚠️ Manifest path not found: {manifest_path}")
            continue

        try:
            with open(manifest_path, "r") as mf:
                manifest = json.load(mf)

            # Insert or replace the GATE list
            manifest["gate/Paper"] = uploaded_files

            with open(manifest_path, "w") as mf:
                json.dump(manifest, mf, indent=2)

            print(f"  ✅ Updated: {manifest_path} ({len(uploaded_files)} papers)")
        except Exception as e:
            print(f"  ❌ Error updating {manifest_path}: {e}")

def main():
    parser = argparse.ArgumentParser(description="GATE CS Paper Scraping & Upload Pipeline")
    parser.add_argument("--download-only", action="store_true", help="Only download files locally")
    parser.add_argument("--upload-only", action="store_true", help="Only upload existing files to R2")
    parser.add_argument("--dry-run", action="store_true", help="Dry run of uploads")
    args = parser.parse_args()

    if args.download_only:
        download_papers()
        return

    if args.upload_only:
        uploaded = upload_papers_to_r2(dry_run=args.dry_run)
        if not args.dry_run:
            update_manifests(uploaded)
        return

    # Default flow: download then upload
    success = download_papers()
    uploaded = upload_papers_to_r2(dry_run=args.dry_run)
    if not args.dry_run:
        update_manifests(uploaded)

    print("\n" + "═" * 60)
    print("  🎉 PIPELINE COMPLETE")
    print("═" * 60)

if __name__ == "__main__":
    main()
