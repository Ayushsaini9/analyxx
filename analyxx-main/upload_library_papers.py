"""
Upload library papers to Supabase Storage.

HOW TO USE:
  1. Place PDF files in the 'papers_to_upload/' folder
  2. Name files like:  class10_science_2025.pdf
                       class12_physics_2024.pdf
                       neet_biology_2023.pdf
                       jee_mathematics_2022.pdf
  3. Run:  python upload_library_papers.py

Naming convention:  {exam}_{subject}_{year}.pdf
  - exam:    class10, class12, neet, jee, cat, gate, upsc
  - subject: use underscores for multi-word (e.g. social_studies, computer_application)
  - year:    4-digit year

Files are uploaded to:  library-papers/{exam_id}/{Subject}/{year}.pdf
"""

import os
import sys
import time
from dotenv import load_dotenv

# Load env from backend
load_dotenv(os.path.join(os.path.dirname(__file__), "backend", ".env"))

from supabase import create_client, ClientOptions

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
supabase = create_client(
    SUPABASE_URL,
    SUPABASE_SERVICE_KEY,
    options=ClientOptions(storage_client_timeout=300),
)

BUCKET = "library-papers"
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "papers_to_upload")

# ── Exam prefix → storage exam_id mapping ──
EXAM_MAP = {
    "class10": "cbse-10",
    "class12": "cbse-12",
    "neet":    "neet",
    "jee":    "jee-advanced",
    "cat":    "cat",
    "gate":   "gate",
    "upsc":   "upsc-cse",
}


def ensure_bucket():
    """Create the library-papers bucket if it doesn't exist."""
    try:
        supabase.storage.create_bucket(BUCKET, options={"public": True})
        print(f"✅ Created bucket: {BUCKET}")
    except Exception as e:
        if "already exists" in str(e).lower() or "Duplicate" in str(e):
            print(f"ℹ️  Bucket '{BUCKET}' already exists")
        else:
            print(f"⚠️  Bucket error: {e}")


def parse_filename(filename: str):
    """
    Parse a filename like 'class10_science_2025.pdf' into (exam_id, subject, year).
    Returns None if the filename doesn't match the convention.
    """
    # Clean: strip whitespace, remove .pdf extension
    clean = filename.strip()
    if not clean.lower().endswith(".pdf"):
        return None
    clean = clean[:-4].strip()  # remove .pdf and any space before it

    # Remove any remaining spaces (e.g. "class10_Data science_2025" → "class10_Datascience_2025")
    # But preserve underscores as separators
    # Split by underscore, strip each part, remove empty parts
    parts = [p.strip() for p in clean.split("_") if p.strip()]
    if len(parts) < 3:
        return None

    # The last part should be the year (4 digits)
    year_str = parts[-1].strip()
    if not year_str.isdigit() or len(year_str) != 4:
        return None
    year = int(year_str)

    # Try to match exam prefix
    exam_id = None
    subject_parts = None

    for prefix, eid in EXAM_MAP.items():
        if parts[0].lower() == prefix.lower():
            exam_id = eid
            subject_parts = parts[1:-1]  # everything between exam and year
            break

    if not exam_id or not subject_parts:
        return None

    # Title-case the subject, joining parts with spaces
    # e.g. ["social", "studies"] → "Social Studies"
    # e.g. ["Data", "science"] → "Data Science"
    subject = " ".join(p.capitalize() for p in subject_parts)

    return exam_id, subject, year


def upload_paper(local_path: str, exam_id: str, subject: str, year: int, max_retries: int = 3):
    """Upload a PDF to Supabase Storage under library-papers/{exam_id}/{subject}/{year}.pdf"""
    storage_path = f"{exam_id}/{subject}/{year}.pdf"

    with open(local_path, "rb") as f:
        content = f.read()

    for attempt in range(1, max_retries + 1):
        try:
            supabase.storage.from_(BUCKET).upload(
                path=storage_path,
                file=content,
                file_options={"content-type": "application/pdf"},
            )
            public_url = supabase.storage.from_(BUCKET).get_public_url(storage_path)
            print(f"  ✅ Uploaded → {storage_path} ({len(content):,} bytes)")
            print(f"     URL: {public_url}")
            return public_url
        except Exception as e:
            if "Duplicate" in str(e) or "already exists" in str(e).lower():
                public_url = supabase.storage.from_(BUCKET).get_public_url(storage_path)
                print(f"  ℹ️  Already exists → {storage_path}")
                print(f"     URL: {public_url}")
                return public_url
            elif attempt < max_retries:
                print(f"  ⚠️  Attempt {attempt}/{max_retries} failed: {e}")
                print(f"     Retrying in 5 seconds...")
                time.sleep(5)
            else:
                print(f"  ❌ Upload failed after {max_retries} attempts: {e}")
                return None


if __name__ == "__main__":
    # Create upload folder if it doesn't exist
    os.makedirs(UPLOAD_DIR, exist_ok=True)

    # Scan for PDFs
    pdf_files = sorted([f for f in os.listdir(UPLOAD_DIR) if f.lower().endswith(".pdf")])

    if not pdf_files:
        print("╔══════════════════════════════════════════════════════════════╗")
        print("║  📂  No PDFs found in papers_to_upload/                    ║")
        print("╠══════════════════════════════════════════════════════════════╣")
        print("║                                                            ║")
        print("║  HOW TO USE:                                               ║")
        print("║  1. Put your PDF files in the 'papers_to_upload/' folder   ║")
        print("║  2. Name them like:                                        ║")
        print("║       class10_science_2025.pdf                             ║")
        print("║       class12_physics_2024.pdf                             ║")
        print("║       neet_biology_2023.pdf                                ║")
        print("║       jee_mathematics_2022.pdf                             ║")
        print("║       class10_social_studies_2025.pdf                      ║")
        print("║  3. Run this script again                                  ║")
        print("║                                                            ║")
        print("║  FORMAT: {exam}_{subject}_{year}.pdf                       ║")
        print("║  Exams:  class10, class12, neet, jee, cat, gate, upsc      ║")
        print("║                                                            ║")
        print("╚══════════════════════════════════════════════════════════════╝")
        sys.exit(0)

    # Ensure bucket exists
    ensure_bucket()

    print(f"\n📂 Found {len(pdf_files)} PDF(s) in papers_to_upload/\n")
    print("─" * 60)

    success = 0
    skipped = 0
    failed = 0

    for filename in pdf_files:
        print(f"\n📄 {filename}")
        parsed = parse_filename(filename)

        if not parsed:
            print(f"  ⚠️  Skipped — filename doesn't match the naming convention")
            print(f"     Expected: {{exam}}_{{subject}}_{{year}}.pdf")
            print(f"     Exams: {', '.join(EXAM_MAP.keys())}")
            skipped += 1
            continue

        exam_id, subject, year = parsed
        print(f"  → Exam: {exam_id}  |  Subject: {subject}  |  Year: {year}")

        local_path = os.path.join(UPLOAD_DIR, filename)
        result = upload_paper(local_path, exam_id, subject, year)

        if result:
            success += 1
        else:
            failed += 1

    print("\n" + "─" * 60)
    print(f"\n🎉 Done!  ✅ {success} uploaded  |  ℹ️ {skipped} skipped  |  ❌ {failed} failed")
    print(f"   Bucket: {BUCKET}")
    print(f"   Pattern: {BUCKET}/{{exam_id}}/{{subject}}/{{year}}.pdf\n")
