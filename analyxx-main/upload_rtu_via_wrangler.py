#!/usr/bin/env python3
"""
Upload scraped RTU papers to Cloudflare R2 via Wrangler CLI.
Wrangler uses the Cloudflare API (not S3), bypassing the SSL issue.

Usage:
  python upload_rtu_via_wrangler.py              # Upload all from manifest
  python upload_rtu_via_wrangler.py --dry-run    # Preview only
  python upload_rtu_via_wrangler.py --start 100  # Resume from paper #100
"""
import os
import sys
import json
import time
import subprocess
from pathlib import Path

MANIFEST_PATH = os.path.join(
    os.path.dirname(__file__),
    "papers_to_upload",
    "RTU_ALL_YEARS",
    "upload_manifest.json",
)
BUCKET = "analyxx-papers"
PROGRESS_FILE = os.path.join(
    os.path.dirname(__file__),
    "papers_to_upload",
    "RTU_ALL_YEARS",
    "upload_progress.json",
)


def upload_one(local_path: str, storage_path: str) -> bool:
    """Upload a single file to R2 via wrangler."""
    r2_key = f"library-papers/{storage_path}"
    try:
        result = subprocess.run(
            [
                "npx", "wrangler", "r2", "object", "put",
                f"{BUCKET}/{r2_key}",
                f"--file={local_path}",
                "--content-type=application/pdf",
                "--remote",
            ],
            capture_output=True,
            text=True,
            timeout=120,
        )
        if result.returncode == 0 and ("Upload complete" in result.stdout or "Creating" in result.stdout or "Put" in result.stdout.lower()):
            return True
        else:
            err = (result.stderr or result.stdout).strip()
            if err:
                print(f"\n    ⚠️ {err[:120]}")
            return False
    except subprocess.TimeoutExpired:
        print(f"\n    ⚠️ Timeout")
        return False
    except Exception as e:
        print(f"\n    ⚠️ {str(e)[:80]}")
        return False


def main():
    dry_run = "--dry-run" in sys.argv
    start_from = 0
    if "--start" in sys.argv:
        idx = sys.argv.index("--start")
        start_from = int(sys.argv[idx + 1]) if idx + 1 < len(sys.argv) else 0

    # Try to load progress for auto-resume
    if os.path.exists(PROGRESS_FILE) and start_from == 0 and "--no-resume" not in sys.argv:
        with open(PROGRESS_FILE) as f:
            progress = json.load(f)
        last = progress.get("last_index", 0)
        prev_uploaded = progress.get("uploaded", 0)
        if last > 0 and prev_uploaded > 0:
            start_from = last + 1
            print(f"📌 Resuming from #{start_from + 1} (previously uploaded: {prev_uploaded})")

    with open(MANIFEST_PATH) as f:
        manifest = json.load(f)

    papers = manifest["papers"]
    remaining = len(papers) - start_from

    print(f"\n{'='*70}")
    print(f"📦 Upload via Wrangler CLI → Cloudflare R2")
    print(f"   Papers: {len(papers)} total, {remaining} remaining")
    print(f"   Starting from: #{start_from + 1}")
    print(f"   Bucket: {BUCKET}")
    print(f"   Mode: {'DRY RUN' if dry_run else 'UPLOAD'}")
    print(f"{'='*70}")

    if dry_run:
        print("\n[DRY RUN]")
        for i, p in enumerate(papers[start_from:], start_from + 1):
            print(f"  [{i}/{len(papers)}] → library-papers/{p['storage_path']}")
        print(f"\n✅ Would upload {remaining} papers.")
        return

    uploaded = 0
    skipped = start_from
    failed = 0
    failed_list = []

    for i, p in enumerate(papers):
        if i < start_from:
            continue

        local_path = p["local_path"]
        storage_path = p["storage_path"]

        if not os.path.exists(local_path):
            print(f"  [{i+1}/{len(papers)}] ❌ Missing: {local_path}")
            failed += 1
            failed_list.append(p)
            continue

        print(f"  [{i+1}/{len(papers)}] 📤 {storage_path}...", end=" ", flush=True)

        if upload_one(local_path, storage_path):
            print("✅")
            uploaded += 1
        else:
            print("❌")
            failed += 1
            failed_list.append(p)

        # Save progress every 20 uploads
        if (uploaded + failed) % 20 == 0:
            progress = {
                "last_index": i,
                "uploaded": uploaded,
                "skipped": skipped,
                "failed": failed,
            }
            with open(PROGRESS_FILE, "w") as f:
                json.dump(progress, f, indent=2)

    # Final progress save
    progress = {
        "last_index": len(papers) - 1,
        "uploaded": uploaded,
        "skipped": skipped,
        "failed": failed,
        "failed_papers": failed_list,
    }
    with open(PROGRESS_FILE, "w") as f:
        json.dump(progress, f, indent=2)

    # Update manifest
    manifest["total_uploaded"] = uploaded
    manifest["failed_uploads"] = failed
    manifest["upload_timestamp"] = time.strftime("%Y-%m-%dT%H:%M:%S")
    with open(MANIFEST_PATH, "w") as f:
        json.dump(manifest, f, indent=2)

    print(f"\n{'='*70}")
    print(f"🎉 Done!")
    print(f"   ✅ Uploaded:  {uploaded}")
    print(f"   ⏭️  Skipped:  {skipped}")
    print(f"   ❌ Failed:    {failed}")
    print(f"   📊 Total:     {len(papers)}")
    print(f"{'='*70}")

    if failed_list:
        print(f"\n   Failed papers saved to: {PROGRESS_FILE}")
        print(f"   Re-run: python upload_rtu_via_wrangler.py")


if __name__ == "__main__":
    main()
