"""
Cleanup bad uploads and re-upload scraped RTU papers with clean names.

Steps:
  1. Delete all files from scraped folders (bad year/subject names)
  2. Re-process with fixed parser → clean subject + correct year
  3. Upload branded PDFs to Supabase

Usage: python cleanup_and_reupload.py
"""
import os, re, sys
from pathlib import Path
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "backend", ".env"))

from supabase import create_client, ClientOptions

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
BUCKET = "library-papers"
supabase_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY, 
                                 options=ClientOptions(storage_client_timeout=300))

# Folders that had bad uploads
STORAGE_FOLDERS = ["rtu-csit", "rtu-ce", "rtu-me", "rtu-eeec"]
# Only delete from even semesters (scraped ones)
EVEN_SEMS = ["Sem 2", "Sem 4", "Sem 6", "Sem 8"]


def list_bad_files():
    """Find files with bad years (not 2015-2030) in storage."""
    bad_files = []
    for folder in STORAGE_FOLDERS:
        for sem in EVEN_SEMS:
            prefix = f"{folder}/{sem}/"
            try:
                files = supabase_client.storage.from_(BUCKET).list(f"{folder}/{sem}")
                for f in files:
                    name = f.get("name", "")
                    if not name.endswith(".pdf"):
                        continue
                    # Check if year in filename is valid
                    year_match = re.search(r'(\d{4})\.pdf$', name)
                    if year_match:
                        year = int(year_match.group(1))
                        if year < 2015 or year > 2030:
                            bad_files.append(f"{folder}/{sem}/{name}")
                    else:
                        bad_files.append(f"{folder}/{sem}/{name}")
            except Exception as e:
                pass
    return bad_files


def delete_files(file_paths):
    """Delete files from Supabase storage."""
    if not file_paths:
        print("  No files to delete")
        return
    
    print(f"  Deleting {len(file_paths)} bad files...")
    batch_size = 50
    for i in range(0, len(file_paths), batch_size):
        batch = file_paths[i:i+batch_size]
        try:
            supabase_client.storage.from_(BUCKET).remove(batch)
            print(f"    Deleted batch {i//batch_size + 1} ({len(batch)} files)")
        except Exception as e:
            print(f"    ⚠️  Delete error: {e}")
            # Try one by one
            for fp in batch:
                try:
                    supabase_client.storage.from_(BUCKET).remove([fp])
                except:
                    pass


def main():
    print("🧹 RTU Paper Cleanup & Re-upload")
    print("="*60)
    
    # Step 1: Find and delete bad files
    print("\n📋 Step 1: Finding bad files in Supabase...")
    bad_files = list_bad_files()
    print(f"  Found {len(bad_files)} files with bad years")
    if bad_files:
        for f in bad_files[:10]:
            print(f"    ❌ {f}")
        if len(bad_files) > 10:
            print(f"    ... and {len(bad_files) - 10} more")
    
    delete_files(bad_files)
    
    # Step 2: Re-run branded PDF generator for scraped papers only
    print("\n📎 Step 2: Re-generating and uploading with fixed parser...")
    print("  Running: python generate_rtu_papers.py --scraped-only --upload")
    
    import subprocess
    result = subprocess.run(
        [sys.executable, "generate_rtu_papers.py", "--scraped-only", "--upload"],
        cwd=str(Path(__file__).parent)
    )
    
    if result.returncode == 0:
        print("\n✅ Cleanup and re-upload complete!")
    else:
        print(f"\n⚠️  Generator exited with code {result.returncode}")


if __name__ == "__main__":
    main()
