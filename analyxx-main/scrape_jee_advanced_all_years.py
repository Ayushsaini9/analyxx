#!/usr/bin/env python3
"""
JEE Advanced All Years — Scrape, Download & Upload to Cloudflare R2.

Downloads missing JEE Advanced papers from the official jeeadv.ac.in archive,
then uploads ALL papers (2007–2026, Paper 1 & Paper 2 each) to Cloudflare R2.

Coverage: 20 years × 2 papers = 40 PDFs total.

URL patterns on jeeadv.ac.in/past_qps/:
  2007–2018:  {year}_{paperNum}.pdf          (e.g. 2007_1.pdf)
  2019–2026:  {year}_{paperNum}_English.pdf   (e.g. 2019_1_English.pdf)

Local naming:  jee_advanced_{year}_paper{num}.pdf
R2 key:        library-papers/jee-advanced/Paper/{year}_paper{num}.pdf

Usage:
    python scrape_jee_advanced_all_years.py                  # Full pipeline
    python scrape_jee_advanced_all_years.py --download-only  # Only download missing
    python scrape_jee_advanced_all_years.py --upload-only    # Only upload existing
    python scrape_jee_advanced_all_years.py --inventory      # Show what we have
    python scrape_jee_advanced_all_years.py --dry-run        # Preview uploads
"""
import os, sys, json, time, argparse
from pathlib import Path
from datetime import datetime

import requests

# ── Paths ──
BASE_DIR = Path(__file__).parent
DOWNLOAD_DIR = BASE_DIR / "papers_to_upload" / "JEE Advanced"
DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)
ENV_PATH = BASE_DIR / "backend" / ".env"
MANIFEST_PATH = BASE_DIR / "backend" / "r2_paper_manifest.json"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
}

# ── Build full paper list: 2007–2026, Paper 1 & Paper 2 ──
YEARS = list(range(2007, 2027))  # 2007 to 2026 inclusive
PAPERS = []
for y in YEARS:
    for p in [1, 2]:
        PAPERS.append({"year": y, "paper": p})


def get_official_url(year: int, paper_num: int) -> str:
    """Build the jeeadv.ac.in download URL for a given year/paper."""
    if year <= 2018:
        return f"https://jeeadv.ac.in/past_qps/{year}_{paper_num}.pdf"
    else:
        return f"https://jeeadv.ac.in/past_qps/{year}_{paper_num}_English.pdf"


def local_filename(year: int, paper_num: int) -> str:
    return f"jee_advanced_{year}_paper{paper_num}.pdf"


def r2_storage_name(year: int, paper_num: int) -> str:
    return f"{year}_paper{paper_num}.pdf"


# ══════════════════════════════════════════════════════════════════════
#  DOWNLOAD
# ══════════════════════════════════════════════════════════════════════

def download_pdf(url: str, save_path: Path) -> bool:
    """Download a PDF from a URL, with validation."""
    if save_path.exists() and save_path.stat().st_size > 5000:
        print(f"    ⏭️  Exists: {save_path.name} ({save_path.stat().st_size:,} bytes)")
        return True
    try:
        resp = requests.get(url, headers=HEADERS, timeout=60, allow_redirects=True)
        if resp.status_code == 200 and resp.content[:5] == b'%PDF-' and len(resp.content) > 5000:
            save_path.parent.mkdir(parents=True, exist_ok=True)
            with open(save_path, "wb") as f:
                f.write(resp.content)
            print(f"    ✅ Downloaded: {save_path.name} ({len(resp.content):,} bytes)")
            return True
        elif resp.status_code == 200 and len(resp.content) > 5000:
            # Might be a PDF that doesn't start with %PDF- header (some servers)
            save_path.parent.mkdir(parents=True, exist_ok=True)
            with open(save_path, "wb") as f:
                f.write(resp.content)
            print(f"    ⚠️  Downloaded (non-standard header): {save_path.name} ({len(resp.content):,} bytes)")
            return True
        else:
            print(f"    ❌ Failed: HTTP {resp.status_code}, size={len(resp.content)}")
            return False
    except Exception as e:
        print(f"    ❌ Error: {str(e)[:80]}")
        return False


def download_all_missing():
    """Download all missing JEE Advanced papers from jeeadv.ac.in."""
    print("\n" + "═" * 60)
    print("  📥 DOWNLOADING MISSING JEE ADVANCED PAPERS")
    print("═" * 60)

    downloaded = 0
    skipped = 0
    failed = 0
    failed_list = []

    for entry in PAPERS:
        year, paper = entry["year"], entry["paper"]
        fname = local_filename(year, paper)
        save_path = DOWNLOAD_DIR / fname

        if save_path.exists() and save_path.stat().st_size > 5000:
            skipped += 1
            continue

        url = get_official_url(year, paper)
        print(f"\n  📄 {year} Paper {paper}")
        print(f"     URL: {url}")

        if download_pdf(url, save_path):
            downloaded += 1
        else:
            failed += 1
            failed_list.append(f"{year} Paper {paper}")

        time.sleep(0.5)  # Be polite to the server

    print(f"\n  📊 Download Summary:")
    print(f"     ✅ Downloaded: {downloaded}")
    print(f"     ⏭️  Already had: {skipped}")
    print(f"     ❌ Failed: {failed}")
    if failed_list:
        print(f"     Failed papers: {', '.join(failed_list)}")

    return failed_list


# ══════════════════════════════════════════════════════════════════════
#  UPLOAD TO R2
# ══════════════════════════════════════════════════════════════════════

def get_r2_client():
    """Create a boto3 S3 client for Cloudflare R2."""
    from dotenv import load_dotenv
    load_dotenv(str(ENV_PATH))

    import boto3
    from botocore.config import Config

    return boto3.client(
        "s3",
        endpoint_url=os.getenv("R2_ENDPOINT_URL"),
        aws_access_key_id=os.getenv("R2_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("R2_SECRET_ACCESS_KEY"),
        config=Config(signature_version="s3v4"),
        region_name="auto",
        verify=False,
    ), os.getenv("R2_BUCKET_NAME", "analyxx-papers")


def upload_all_to_r2(dry_run: bool = False):
    """Upload all local JEE Advanced papers to R2."""
    print("\n" + "═" * 60)
    print("  📤 UPLOADING JEE ADVANCED PAPERS TO CLOUDFLARE R2")
    print("═" * 60)

    # Build upload list from local files
    upload_list = []
    for entry in PAPERS:
        year, paper = entry["year"], entry["paper"]
        local_path = DOWNLOAD_DIR / local_filename(year, paper)
        storage_key = f"library-papers/jee-advanced/Paper/{r2_storage_name(year, paper)}"

        if local_path.exists() and local_path.stat().st_size > 5000:
            upload_list.append({
                "local_path": str(local_path),
                "storage_key": storage_key,
                "label": f"{year} Paper {paper}",
                "size": local_path.stat().st_size,
            })
        else:
            print(f"  ⚠️  Missing locally: {local_filename(year, paper)}")

    print(f"\n  📦 {len(upload_list)} papers ready to upload")

    if dry_run:
        print("\n  [DRY RUN] Would upload:")
        for item in upload_list:
            print(f"    → {item['storage_key']} ({item['size']:,} bytes)")
        return upload_list

    r2, bucket = get_r2_client()

    uploaded = 0
    failed = 0
    for i, item in enumerate(upload_list, 1):
        print(f"  [{i}/{len(upload_list)}] 📤 {item['label']}...", end=" ", flush=True)
        try:
            with open(item["local_path"], "rb") as f:
                r2.put_object(
                    Bucket=bucket,
                    Key=item["storage_key"],
                    Body=f.read(),
                    ContentType="application/pdf",
                )
            print(f"✅ ({item['size']:,} bytes)")
            uploaded += 1
        except Exception as e:
            print(f"❌ {str(e)[:60]}")
            failed += 1
        time.sleep(0.3)

    print(f"\n  🎉 Upload Summary:")
    print(f"     ✅ Uploaded: {uploaded}")
    print(f"     ❌ Failed: {failed}")

    return upload_list


# ══════════════════════════════════════════════════════════════════════
#  UPDATE MANIFEST
# ══════════════════════════════════════════════════════════════════════

def update_manifest(upload_list: list):
    """Add jee-advanced/Paper entries to the backend manifest file."""
    print("\n" + "═" * 60)
    print("  📋 UPDATING BACKEND MANIFEST")
    print("═" * 60)

    # Read existing manifest
    with open(MANIFEST_PATH) as f:
        manifest = json.load(f)

    # Build the file list from what was uploaded
    paper_files = []
    for entry in PAPERS:
        year, paper = entry["year"], entry["paper"]
        fname = r2_storage_name(year, paper)
        local_path = DOWNLOAD_DIR / local_filename(year, paper)
        if local_path.exists() and local_path.stat().st_size > 5000:
            paper_files.append(fname)

    manifest["jee-advanced/Paper"] = paper_files

    with open(MANIFEST_PATH, "w") as f:
        json.dump(manifest, f, indent=2)

    print(f"  ✅ Added 'jee-advanced/Paper' with {len(paper_files)} entries to manifest")
    print(f"     Path: {MANIFEST_PATH}")


# ══════════════════════════════════════════════════════════════════════
#  INVENTORY
# ══════════════════════════════════════════════════════════════════════

def show_inventory():
    """Display what papers exist locally."""
    print("\n" + "═" * 60)
    print("  📊 JEE ADVANCED PAPER INVENTORY (2007–2026)")
    print("═" * 60)

    total = 0
    missing = 0
    for year in YEARS:
        p1 = DOWNLOAD_DIR / local_filename(year, 1)
        p2 = DOWNLOAD_DIR / local_filename(year, 2)
        p1_ok = p1.exists() and p1.stat().st_size > 5000
        p2_ok = p2.exists() and p2.stat().st_size > 5000

        p1_size = f"({p1.stat().st_size:,}B)" if p1_ok else ""
        p2_size = f"({p2.stat().st_size:,}B)" if p2_ok else ""

        p1_status = f"✅ {p1_size}" if p1_ok else "❌"
        p2_status = f"✅ {p2_size}" if p2_ok else "❌"

        print(f"  {year}:  Paper 1 {p1_status}  |  Paper 2 {p2_status}")

        total += int(p1_ok) + int(p2_ok)
        missing += int(not p1_ok) + int(not p2_ok)

    print(f"\n  Total: {total}/40 papers  |  Missing: {missing}")


# ══════════════════════════════════════════════════════════════════════
#  MAIN
# ══════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description="JEE Advanced — Scrape, Download & Upload to R2")
    parser.add_argument("--inventory", action="store_true", help="Show paper inventory")
    parser.add_argument("--download-only", action="store_true", help="Only download missing papers")
    parser.add_argument("--upload-only", action="store_true", help="Only upload to R2")
    parser.add_argument("--dry-run", action="store_true", help="Preview uploads without doing them")
    args = parser.parse_args()

    print("\n🎓 JEE Advanced Paper Pipeline (2007–2026)")
    print(f"   {len(PAPERS)} papers × 2 papers/year = {len(PAPERS)} total")
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
