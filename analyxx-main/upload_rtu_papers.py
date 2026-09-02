"""
Upload RTU First Year papers to Supabase Storage.

Scans the 'papers_to_upload/Rtu  first year/' folder, parses filenames
to determine subject and year, then uploads to:
    library-papers/rtu-1st-year/{Subject Name}/{year}.pdf

Handles multiple naming conventions:
  - EM1_2024.pdf, BEE_2024.pdf, BCE_2026.pdf, BME_2025.pdf, etc.
  - engineering physics_2024.pdf, communication skills_2025.pdf, etc.
  - btech-1-sem-engineering-physics-1e3102-2023.pdf (long form)
  - physics_2024.pdf, pps_2026.pdf, humanvalues_2026.pdf, etc.

For duplicate year papers (e.g. BME_2024.pdf and BME_2024(1).pdf), only the
first one is uploaded; duplicates are skipped.
"""

import os
import re
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
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "papers_to_upload", "Rtu  first year")

# ── Subject mapping ──
# Maps various filename patterns to (subject_folder_name, semester)
# subject_folder_name is what goes in the storage path
# We use the full subject names matching the frontend RTU_FIRST_YEAR_SUBJECTS

SUBJECT_PATTERNS = {
    # Engineering Mathematics I
    "em1": ("Engineering Mathematics-I", 1),
    "engineering-mathematics-1": ("Engineering Mathematics-I", 1),
    "engineering mathematics 1": ("Engineering Mathematics-I", 1),
    "engineering_mathematics_1": ("Engineering Mathematics-I", 1),
    
    # Engineering Mathematics II
    "em2": ("Engineering Mathematics-II", 2),
    "engineering-mathematics-2": ("Engineering Mathematics-II", 2),
    "engineering mathematics 2": ("Engineering Mathematics-II", 2),
    "engineering_mathematics_2": ("Engineering Mathematics-II", 2),
    
    # Engineering Physics
    "ep": ("Engineering Physics", 1),
    "ep1": ("Engineering Physics", 1),
    "ep2": ("Engineering Physics", 2),
    "physics": ("Engineering Physics", 1),
    "engineering physics": ("Engineering Physics", 1),
    "engineering-physics": ("Engineering Physics", 1),
    "engineering_physics": ("Engineering Physics", 1),
    
    # Engineering Chemistry
    "ec": ("Engineering Chemistry", 1),
    "ec1": ("Engineering Chemistry", 1),
    "ec2": ("Engineering Chemistry", 2),
    "engineering chemistry": ("Engineering Chemistry", 1),
    "engineering-chemistry": ("Engineering Chemistry", 1),
    "engineering_chemistry": ("Engineering Chemistry", 1),
    
    # Communication Skills
    "cs": ("Communication Skills", 1),
    "cs1": ("Communication Skills", 1),
    "cs2": ("Communication Skills", 2),
    "communication skills": ("Communication Skills", 1),
    "communication-skills": ("Communication Skills", 1),
    "communication_skills": ("Communication Skills", 1),
    "communication skill": ("Communication Skills", 1),
    "communication-skill": ("Communication Skills", 1),
    
    # Human Values
    "hv": ("Human Values", 1),
    "hv1": ("Human Values", 1),
    "hv2": ("Human Values", 2),
    "human values": ("Human Values", 1),
    "human-values": ("Human Values", 1),
    "human_values": ("Human Values", 1),
    "humanvalues": ("Human Values", 1),
    
    # Programming for Problem Solving
    "pps": ("Programming for Problem Solving", 1),
    "pps1": ("Programming for Problem Solving", 1),
    "pps2": ("Programming for Problem Solving", 2),
    "programming-for-problem-solving": ("Programming for Problem Solving", 1),
    "programming for problem solving": ("Programming for Problem Solving", 1),
    
    # Basic Mechanical Engineering
    "bme": ("Basic Mechanical Engineering", 1),
    "bme1": ("Basic Mechanical Engineering", 1),
    "bme2": ("Basic Mechanical Engineering", 2),
    "basic mechanical engineering": ("Basic Mechanical Engineering", 1),
    "basic-mechanical-engineering": ("Basic Mechanical Engineering", 1),
    "elements-of-mechanical-engineering": ("Basic Mechanical Engineering", 1),
    "elements of mechanical engineering": ("Basic Mechanical Engineering", 1),
    
    # Basic Electrical Engineering
    "bee": ("Basic Electrical Engineering", 1),
    "bee1": ("Basic Electrical Engineering", 1),
    "bee2": ("Basic Electrical Engineering", 2),
    "basic electrical engineering": ("Basic Electrical Engineering", 1),
    "basic-electrical-engineering": ("Basic Electrical Engineering", 1),
    
    # Basic Civil Engineering
    "bce": ("Basic Civil Engineering", 1),
    "bce1": ("Basic Civil Engineering", 1),
    "bce2": ("Basic Civil Engineering", 2),
    "basic civil engineering": ("Basic Civil Engineering", 1),
    "basic-civil-engineering": ("Basic Civil Engineering", 1),
    "introduction-to-built-environment": ("Basic Civil Engineering", 1),
    "introduction to built environment": ("Basic Civil Engineering", 1),
    
    # MEFA (this is actually 2nd year but present in the folder)
    "mefa": ("MEFA", 0),  # Will skip or handle separately
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


def parse_rtu_filename(filename: str):
    """
    Parse an RTU first year paper filename into (subject_name, year).
    Returns None if the filename doesn't match any known pattern.
    
    Handles:
      - EM1_2024.pdf
      - BME_2024(1).pdf  → duplicate, marks as dup
      - btech-1-sem-engineering-physics-1e3102-2023.pdf
      - engineering physics_2024.pdf
      - physics_2025.pdf
      - communication skills_2025.pdf
      - humanvalues_2026.pdf
      - 1styear_basic electrical engineering.pdf (no year → skip)
      - btech-1-sem-engineering-chemistry-1e3103-2024_copy.pdf
    """
    clean = filename.strip()
    if not clean.lower().endswith(".pdf"):
        return None
    clean = clean[:-4].strip()  # Remove .pdf
    
    # Check for duplicate markers like (1), _copy
    is_duplicate = bool(re.search(r'\(\d+\)', clean) or clean.endswith("_copy"))
    
    # Remove duplicate markers for parsing
    clean_no_dup = re.sub(r'\(\d+\)', '', clean).replace("_copy", "").strip()
    
    # Extract year (4-digit number at end or separated by _ or -)
    year_match = re.search(r'[-_]?\s*(\d{4})\s*$', clean_no_dup)
    if not year_match:
        # No year found → skip
        return None
    
    year = int(year_match.group(1))
    # Remove the year part  
    subject_part = clean_no_dup[:year_match.start()].strip().rstrip('-').rstrip('_').strip()
    
    # Handle "btech-X-sem-" prefix
    btech_match = re.match(r'btech-(\d+)-sem-(.+?)(?:-\w{2}\d{3,4})?$', subject_part, re.IGNORECASE)
    if btech_match:
        semester_num = int(btech_match.group(1))
        subject_part = btech_match.group(2).strip()
        # Remove trailing code like -1e3102, -11n501, -21n509, etc.
        subject_part = re.sub(r'-\w{2,3}\d{3,4}$', '', subject_part).strip()
    
    # Also handle "btech-2-sem-engineering-physics-sep" (month suffix)
    subject_part = re.sub(r'[-_](jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)$', '', subject_part, flags=re.IGNORECASE).strip()
    
    # Normalize: lowercase, strip leading/trailing whitespace
    subject_lower = subject_part.lower().strip()
    
    # Remove leading "1styear_" prefix if present
    subject_lower = re.sub(r'^\d+(?:st|nd|rd|th)?year[_\s]*', '', subject_lower).strip()
    
    # Try exact match first
    if subject_lower in SUBJECT_PATTERNS:
        subject_name, _ = SUBJECT_PATTERNS[subject_lower]
        return subject_name, year, is_duplicate
    
    # Try with different separators
    for sep_from, sep_to in [(' ', '-'), ('-', ' '), ('_', ' '), (' ', '_')]:
        variant = subject_lower.replace(sep_from, sep_to)
        if variant in SUBJECT_PATTERNS:
            subject_name, _ = SUBJECT_PATTERNS[variant]
            return subject_name, year, is_duplicate
    
    # Try partial/fuzzy matching
    for pattern_key, (subject_name, _) in SUBJECT_PATTERNS.items():
        if pattern_key in subject_lower or subject_lower in pattern_key:
            return subject_name, year, is_duplicate
    
    return None


def upload_paper(local_path: str, subject_name: str, year: int, max_retries: int = 3):
    """Upload a PDF to Supabase Storage under library-papers/rtu-1st-year/{subject_name}/{year}.pdf"""
    storage_path = f"rtu-1st-year/{subject_name}/{year}.pdf"

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
    if not os.path.isdir(UPLOAD_DIR):
        print(f"❌ Directory not found: {UPLOAD_DIR}")
        sys.exit(1)
    
    # Scan for PDFs
    pdf_files = sorted([f for f in os.listdir(UPLOAD_DIR) if f.lower().endswith(".pdf")])
    
    if not pdf_files:
        print("📂 No PDFs found in the RTU first year folder.")
        sys.exit(0)
    
    # Ensure bucket exists
    ensure_bucket()
    
    print(f"\n📂 Found {len(pdf_files)} PDF(s) in RTU first year folder\n")
    print("─" * 70)
    
    success = 0
    skipped = 0
    duplicates = 0
    failed = 0
    unrecognized = 0
    
    # Track which subject+year combos we've already uploaded
    uploaded_combos = set()
    
    for filename in pdf_files:
        print(f"\n📄 {filename}")
        parsed = parse_rtu_filename(filename)
        
        if not parsed:
            print(f"  ⚠️  Skipped — could not determine subject/year from filename")
            unrecognized += 1
            continue
        
        subject_name, year, is_dup = parsed
        
        # Skip MEFA (it's 2nd year)
        if subject_name == "MEFA":
            print(f"  ⏭️  Skipped — MEFA is a 2nd-year subject, not 1st year")
            skipped += 1
            continue
        
        combo = (subject_name, year)
        print(f"  → Subject: {subject_name}  |  Year: {year}  |  Duplicate: {is_dup}")
        
        if combo in uploaded_combos:
            print(f"  ⏭️  Skipped — already uploaded {subject_name} {year}")
            duplicates += 1
            continue
        
        local_path = os.path.join(UPLOAD_DIR, filename)
        result = upload_paper(local_path, subject_name, year)
        
        if result:
            uploaded_combos.add(combo)
            success += 1
        else:
            failed += 1
    
    print("\n" + "─" * 70)
    print(f"\n🎉 Done!")
    print(f"   ✅ {success} uploaded")
    print(f"   ⏭️  {skipped} skipped (wrong year)")
    print(f"   🔄 {duplicates} duplicates skipped")
    print(f"   ⚠️  {unrecognized} unrecognized")
    print(f"   ❌ {failed} failed")
    print(f"\n   Bucket: {BUCKET}")
    print(f"   Pattern: {BUCKET}/rtu-1st-year/{{Subject Name}}/{{year}}.pdf\n")
    
    # Print summary of uploaded subjects
    if uploaded_combos:
        print("📋 Uploaded Papers Summary:")
        print("─" * 50)
        by_subject = {}
        for subj, yr in sorted(uploaded_combos):
            by_subject.setdefault(subj, []).append(yr)
        for subj in sorted(by_subject):
            years_str = ", ".join(str(y) for y in sorted(by_subject[subj]))
            print(f"   {subj}: {years_str}")
