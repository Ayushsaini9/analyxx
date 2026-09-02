#!/usr/bin/env python3
"""
Upload scraped RTU papers to Supabase Storage (library-papers bucket).

The backend list-papers endpoint falls back to Supabase when R2 is unavailable,
and the frontend PDF viewer can serve from Supabase public URLs.

Usage:
  python upload_to_supabase.py                # Upload all from manifest
  python upload_to_supabase.py --dry-run      # Preview only
  python upload_to_supabase.py --batch 50     # Upload in batches of 50
"""
import os
import sys
import json
import time
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "backend", ".env"))

from supabase import create_client, ClientOptions

MANIFEST_PATH = os.path.join(
    os.path.dirname(__file__),
    "papers_to_upload",
    "RTU_SCRAPED",
    "upload_manifest.json",
)
BUCKET = "library-papers"


def main():
    dry_run = "--dry-run" in sys.argv
    batch_size = 0
    if "--batch" in sys.argv:
        idx = sys.argv.index("--batch")
        batch_size = int(sys.argv[idx + 1]) if idx + 1 < len(sys.argv) else 50

    supabase = create_client(
        os.getenv("SUPABASE_URL"),
        os.getenv("SUPABASE_SERVICE_KEY"),
        options=ClientOptions(storage_client_timeout=300),
    )

    with open(MANIFEST_PATH) as f:
        manifest = json.load(f)

    papers = manifest["papers"]
    print(f"\n📦 Upload Manifest: {len(papers)} papers")
    print(f"   Generated: {manifest['timestamp']}")
    print(f"   Target: Supabase Storage → {BUCKET}")

    if dry_run:
        print("\n[DRY RUN]")
        for p in papers:
            print(f"  → {p['storage_path']}")
        return

    uploaded = 0
    skipped = 0
    failed = 0

    for i, p in enumerate(papers):
        local_path = p["local_path"]
        storage_path = p["storage_path"]

        if not os.path.exists(local_path):
            print(f"  [{i+1}/{len(papers)}] ❌ File not found: {local_path}")
            failed += 1
            continue

        with open(local_path, "rb") as f:
            content = f.read()

        print(f"  [{i+1}/{len(papers)}] 📤 {storage_path}...", end=" ", flush=True)

        try:
            supabase.storage.from_(BUCKET).upload(
                path=storage_path,
                file=content,
                file_options={"content-type": "application/pdf"},
            )
            print(f"✅ ({len(content):,} bytes)")
            uploaded += 1
        except Exception as e:
            err = str(e)
            if "Duplicate" in err or "already exists" in err.lower():
                print("⏭️ already exists")
                skipped += 1
            else:
                print(f"❌ {err[:80]}")
                failed += 1

        # Rate limit
        if (i + 1) % 10 == 0:
            time.sleep(0.5)

        # Batch pause
        if batch_size and (i + 1) % batch_size == 0 and i + 1 < len(papers):
            print(f"\n  ⏸️ Batch of {batch_size} done. Pausing 2s...")
            time.sleep(2)

    print(f"\n{'='*60}")
    print(f"🎉 Done!")
    print(f"   ✅ Uploaded:  {uploaded}")
    print(f"   ⏭️ Skipped:   {skipped}")
    print(f"   ❌ Failed:    {failed}")
    print(f"   📊 Total:     {uploaded + skipped + failed}/{len(papers)}")


if __name__ == "__main__":
    main()
