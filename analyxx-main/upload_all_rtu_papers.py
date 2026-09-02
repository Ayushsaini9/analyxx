"""
Upload ALL RTU papers (all branches, all years, all semesters) to Supabase Storage.

Scans 'papers_to_upload/RTU ALL PAPERS/', parses folder names for branch/semester,
parses PDF filenames for subject name and calendar year, then uploads to:
    library-papers/rtu/{branch}/sem-{semester}/{Subject Name}/{year}.pdf

Branch mappings (folder → storage branches):
  CE RTU       → civil
  CS:IT RTU    → cs, it  (uploaded to both)
  EE:EC RTU    → electrical, electronics  (uploaded to both)
  ME RTU       → mechanical

Usage:
  python upload_all_rtu_papers.py              # Upload for real
  python upload_all_rtu_papers.py --dry-run    # Preview only, no uploads
"""

import os
import re
import sys
import time
from collections import defaultdict
from dotenv import load_dotenv

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
BASE_DIR = os.path.join(os.path.dirname(__file__), "papers_to_upload", "RTU ALL PAPERS")

# Branch folder name (stripped) → list of storage branch IDs
BRANCH_MAP = {
    "CE RTU": ["civil"],
    "CS:IT RTU": ["cs", "it"],
    "EE:EC RTU": ["electrical", "electronics"],
    "ME RTU": ["mechanical"],
}

MONTHS = {'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'}

# ── Subject name normalization ──
# Maps raw parsed lowercase names → canonical storage/frontend names
NORMALIZE = {
    # Mathematics
    "advance engineering mathematics 1": "Advanced Engineering Mathematics-I",
    "advanced engineering mathematics 1": "Advanced Engineering Mathematics-I",
    "advance engineering mathematics": "Advanced Engineering Mathematics-I",
    "advanced engineering mathematics": "Advanced Engineering Mathematics-I",
    "advance mathematics": "Advanced Engineering Mathematics-I",
    "advance engineering mathematics 2": "Advanced Engineering Mathematics-II",
    "advanced engineering mathematics 2": "Advanced Engineering Mathematics-II",
    # Common subjects
    "managerial economics and financial accounting": "Managerial Economics & Financial Accounting",
    "managerial economics financial accounting": "Managerial Economics & Financial Accounting",
    "technical communication": "Technical Communication",
    "disaster management": "Disaster Management",
    "general studies": "General Studies",
    "indian constitution": "Indian Constitution",
    "biology": "Biology",
    # CS/IT subjects
    "data structures and algorithms": "Data Structures and Algorithms",
    "data structure and algorithms": "Data Structures and Algorithms",
    "data base management systems": "Database Management System",
    "database management system": "Database Management System",
    "database management system 4csdc10": "Database Management System",
    "discrete mathematical structures": "Discrete Mathematical Structures",
    "discrete mathematical structure": "Discrete Mathematical Structures",
    "discrete mathematics structure": "Discrete Mathematical Structures",
    "discrete mathematics": "Discrete Mathematical Structures",
    "digital electronics": "Digital Electronics",
    "object oriented programming": "Object Oriented Programming",
    "software engineering": "Software Engineering",
    "microprocessor and microcontroller": "Microprocessor and Microcontroller",
    "microprocessor and interfaces": "Microprocessor and Interfaces",
    "principle of communication": "Principles of Communication",
    "theory of computation": "Theory of Computation",
    "data communication and computer networks": "Data Communication and Computer Networks",
    "introduction to java programming": "Introduction to Java Programming",
    "introduction to python programming": "Introduction to Python Programming",
    "software testing 4itdc07": "Software Testing",
    "software testing": "Software Testing",
    "analysis of algorithms": "Analysis of Algorithms",
    "compiler design": "Compiler Design",
    "computer graphics and multimedia": "Computer Graphics and Multimedia",
    "operating system": "Operating System",
    "data mining concepts and techniques": "Data Mining Concepts and Techniques",
    "digital forensics and incident response": "Digital Forensics and Incident Response",
    "fundamental of block chain": "Fundamentals of Blockchain",
    "information theory and coding": "Information Theory and Coding",
    "digital image processing": "Digital Image Processing",
    "machine learning": "Machine Learning",
    "information security system": "Information Security Systems",
    "information security systems": "Information Security Systems",
    "computer architecture and organization": "Computer Architecture and Organization",
    "artificial intelligence": "Artificial Intelligence",
    "principles of artificial intelligence": "Artificial Intelligence",
    "artificial intelligence and data science": "Artificial Intelligence and Data Science",
    "distributed system": "Distributed System",
    "cloud computing": "Cloud Computing",
    "e commerce and erp": "E-Commerce and ERP",
    "block chain and cyber security": "Blockchain and Cyber Security",
    "cyber forensic": "Cyber Forensics",
    "natural language processing": "Natural Language Processing",
    "big data analytics": "Big Data Analytics",
    "internet of things": "Internet of Things",
    "quality management": "Quality Management",
    # EE/EC subjects
    "analog electronics": "Analog Electronics",
    "digital system design": "Digital System Design",
    "electrical circuit analysis": "Electrical Circuit Analysis",
    "electrical circuit analysis 1": "Electrical Circuit Analysis-I",
    "electrical machine 1": "Electrical Machines-I",
    "electrical machines 1": "Electrical Machines-I",
    "electrical machine 2": "Electrical Machines-II",
    "electromagnetic fields": "Electromagnetic Fields",
    "electronic devices": "Electronic Devices",
    "network theory": "Network Theory",
    "power generation process": "Power Generation Process",
    "signal and systems": "Signal and Systems",
    "signals and systems": "Signal and Systems",
    "signals and system": "Signal and Systems",
    "analog circuits": "Analog Circuits",
    "analogy and digital communication": "Analog and Digital Communication",
    "electronic measurement and instrumentation": "Electronic Measurement and Instrumentation",
    "power electronics": "Power Electronics",
    "microcontroller": "Microcontroller",
    "instrumentation": "Instrumentation",
    "electrical measurement": "Electrical Measurement",
    "power system instrumentation": "Power System Instrumentation",
    "electrical machine design": "Electrical Machine Design",
    "power generation sources": "Power Generation Sources",
    "power system 1": "Power System-I",
    "power system 2": "Power System-II",
    "computer architecture": "Computer Architecture",
    "control system": "Control System",
    "digital signal processing": "Digital Signal Processing",
    "electrical materials": "Electrical Materials",
    "electromagnetics waves": "Electromagnetic Waves",
    "microprocessor": "Microprocessor",
    "microwave theory and techniques": "Microwave Theory and Techniques",
    "restructured power system": "Restructured Power System",
    "satellite communication": "Satellite Communication",
    "electric drives": "Electric Drives",
    "electrical energy conversion and auditing": "Electrical Energy Conversion and Auditing",
    "power system protection": "Power System Protection",
    "cmos design": "CMOS Design",
    "principle of electronic communication": "Principles of Electronic Communication",
    "wind and solar energy systems": "Wind and Solar Energy Systems",
    "advanced electric drives": "Advanced Electric Drives",
    "soft computing": "Soft Computing",
    # ME subjects
    "engineering mechanics": "Engineering Mechanics",
    "manufacturing processes": "Manufacturing Processes",
    "aero engineering thermodynamics": "Aero Engineering Thermodynamics",
    "elements of aeronautics": "Elements of Aeronautics",
    "fluid mechanics and turbo machines": "Fluid Mechanics and Turbo Machines",
    "fluid mechanics and fluid machines": "Fluid Mechanics and Fluid Machines",
    "aerospace materials": "Aerospace Materials",
    "data analytics": "Data Analytics",
    "mechatronic systems": "Mechatronic Systems",
    "cims": "Computer Integrated Manufacturing Systems",
    "computer integrated manufacturing systems": "Computer Integrated Manufacturing Systems",
    "design of machine elements 2": "Design of Machine Elements-II",
    "mechanical vibrations": "Mechanical Vibrations",
    "refrigeration and air conditioning": "Refrigeration and Air Conditioning",
    "measurement and meterology": "Measurement and Metrology",
    "supply and operations management": "Supply and Operations Management",
    # CE subjects
    "building materials and construction": "Building Materials and Construction",
    "building materials": "Building Materials and Construction",
    "fluid mechanics": "Fluid Mechanics",
    "surveying": "Surveying",
    "engineering geology": "Engineering Geology",
    "architecture drawing and building construction": "Architecture Drawing and Building Construction",
    "hydraulics engineering": "Hydraulics Engineering",
    "strength of materials": "Strength of Materials",
    "basic electronics for civil engineering applications": "Basic Electronics for Civil Engineering Applications",
    "geotechnical engineering": "Geotechnical Engineering",
    "geotechnical engineering 1": "Geotechnical Engineering-I",
    "air and noise pollution and control": "Air and Noise Pollution and Control",
    "construction technology and equipments": "Construction Technology and Equipments",
    "design of concrete structures": "Design of Concrete Structures",
    "structural analysis 1": "Structural Analysis-I",
    "structural analysis 2": "Structural Analysis-II",
    "water resource engineering": "Water Resource Engineering",
    "design of steel structures": "Design of Steel Structures",
    "environmental engineering": "Environmental Engineering",
    "estimating and costing": "Estimating and Costing",
    "geographic information system and remote sensing": "Geographic Information System and Remote Sensing",
    "geographics information system and remote sensing": "Geographic Information System and Remote Sensing",
    "solid and hazardous waste management": "Solid and Hazardous Waste Management",
    "design of hydraulic structures": "Design of Hydraulic Structures",
    "wind and seismic analysis": "Wind and Seismic Analysis",
    "transportation engineering": "Transportation Engineering",
}


def parse_sem_folder(folder_name: str):
    """Extract semester number from folder name like '3rd SEM 23' or 'rtu electrical 3rd sem 2026'."""
    m = re.search(r'(\d+)(?:st|nd|rd|th)\s*sem', folder_name, re.IGNORECASE)
    if m:
        return int(m.group(1))
    m = re.search(r'sem[\s\-]*(\d+)', folder_name, re.IGNORECASE)
    if m:
        return int(m.group(1))
    return None


def parse_pdf_filename(filename: str):
    """
    Extract subject name and calendar year from a PDF filename.
    Returns (subject_name, year) or None.
    """
    name = filename.lower()
    if not name.endswith('.pdf'):
        return None
    name = name[:-4].strip()
    # Remove duplicate markers like (1), _copy
    name = re.sub(r'\(\d+\)', '', name).replace('_copy', '').strip()

    # Find {N}-sem- marker
    sem_match = re.search(r'(\d+)-sem-', name)
    if not sem_match:
        return None

    after_sem = name[sem_match.end():]

    # Extract 4-digit year from end
    year_match = re.search(r'-?(\d{4})\s*$', after_sem)
    if not year_match:
        return None
    year = int(year_match.group(1))
    rest = after_sem[:year_match.start()].rstrip('-').strip()

    # Remove optional month suffix
    for m in MONTHS:
        if rest.endswith(f'-{m}'):
            rest = rest[:-len(f'-{m}')]
            break

    # Remove course code from end
    # Patterns: 3e1206, 31n0304, hul201, 410003, csl204, ae1313, 31n505
    cm = re.search(r'-(\d{1,2}[a-z]\d{3,5}|[a-z]{2,3}\d{3,4}|\d{5,6})$', rest)
    if cm:
        rest = rest[:cm.start()]

    subject_raw = rest.strip('-').replace('-', ' ').strip()
    if not subject_raw:
        return None

    # Normalize to canonical name
    if subject_raw in NORMALIZE:
        subject_name = NORMALIZE[subject_raw]
    else:
        # Title case with smart casing for small words
        words = subject_raw.split()
        small = {'and', 'of', 'for', 'in', 'the', 'a', 'an', 'to', 'or'}
        titled = []
        for i, w in enumerate(words):
            titled.append(w if w in small and i > 0 else w.capitalize())
        subject_name = ' '.join(titled)

    return subject_name, year


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


def upload_file(local_path: str, storage_path: str, max_retries: int = 3) -> bool:
    """Upload a file to Supabase Storage with retries."""
    with open(local_path, "rb") as f:
        content = f.read()

    for attempt in range(1, max_retries + 1):
        try:
            supabase.storage.from_(BUCKET).upload(
                path=storage_path,
                file=content,
                file_options={"content-type": "application/pdf"},
            )
            print(f"    ✅ → {storage_path} ({len(content):,} bytes)")
            return True
        except Exception as e:
            if "Duplicate" in str(e) or "already exists" in str(e).lower():
                print(f"    ℹ️  Already exists → {storage_path}")
                return True
            elif attempt < max_retries:
                print(f"    ⚠️  Attempt {attempt}/{max_retries} failed: {e}")
                time.sleep(3)
            else:
                print(f"    ❌ Failed after {max_retries} attempts: {e}")
                return False


def main():
    if not os.path.isdir(BASE_DIR):
        print(f"❌ Directory not found: {BASE_DIR}")
        sys.exit(1)

    dry_run = "--dry-run" in sys.argv
    if dry_run:
        print("🔍 DRY RUN MODE — No files will be uploaded\n")
    else:
        ensure_bucket()

    stats = {"success": 0, "skipped": 0, "failed": 0, "unrecognized": 0}
    uploaded_combos = set()  # Track (branch, sem, subject, year) to avoid duplicates
    subject_data = defaultdict(lambda: defaultdict(set))  # branch → sem → set of subjects

    for branch_folder in sorted(os.listdir(BASE_DIR)):
        branch_path = os.path.join(BASE_DIR, branch_folder)
        if not os.path.isdir(branch_path) or branch_folder.startswith('.'):
            continue

        # Match branch folder to storage branch IDs
        branch_ids = None
        for pattern, ids in BRANCH_MAP.items():
            if branch_folder.strip() == pattern.strip():
                branch_ids = ids
                break

        if not branch_ids:
            print(f"\n⚠️  Unknown branch folder: '{branch_folder}'")
            continue

        print(f"\n{'='*60}")
        print(f"📁 Branch: {branch_folder} → {branch_ids}")
        print(f"{'='*60}")

        for sem_folder in sorted(os.listdir(branch_path)):
            sem_path = os.path.join(branch_path, sem_folder)
            if not os.path.isdir(sem_path) or sem_folder.startswith('.'):
                continue

            semester = parse_sem_folder(sem_folder)
            if not semester:
                print(f"\n  ⚠️  Can't parse semester from: {sem_folder}")
                continue

            print(f"\n  📂 Semester {semester}: {sem_folder}")

            pdfs = sorted([f for f in os.listdir(sem_path) if f.lower().endswith('.pdf')])

            for pdf in pdfs:
                parsed = parse_pdf_filename(pdf)
                if not parsed:
                    print(f"    ⚠️  Unrecognized: {pdf}")
                    stats["unrecognized"] += 1
                    continue

                subject_name, cal_year = parsed
                print(f"    📄 {pdf}")
                print(f"       → {subject_name} | Year: {cal_year}")

                for branch_id in branch_ids:
                    combo = (branch_id, semester, subject_name, cal_year)
                    if combo in uploaded_combos:
                        stats["skipped"] += 1
                        continue

                    storage_path = f"rtu/{branch_id}/sem-{semester}/{subject_name}/{cal_year}.pdf"

                    if dry_run:
                        print(f"       [DRY] {storage_path}")
                        uploaded_combos.add(combo)
                        subject_data[branch_id][semester].add(subject_name)
                        stats["success"] += 1
                    else:
                        local_path = os.path.join(sem_path, pdf)
                        result = upload_file(local_path, storage_path)
                        if result:
                            uploaded_combos.add(combo)
                            subject_data[branch_id][semester].add(subject_name)
                            stats["success"] += 1
                        else:
                            stats["failed"] += 1

    # ── Summary ──
    print(f"\n{'='*60}")
    print(f"🎉 {'DRY RUN' if dry_run else 'Upload'} Complete!")
    print(f"   ✅ {stats['success']} {'would be ' if dry_run else ''}uploaded")
    print(f"   ⏭️  {stats['skipped']} skipped (duplicates)")
    print(f"   ⚠️  {stats['unrecognized']} unrecognized")
    print(f"   ❌ {stats['failed']} failed")
    print(f"\n   Bucket: {BUCKET}")
    print(f"   Pattern: {BUCKET}/rtu/{{branch}}/sem-{{N}}/{{Subject Name}}/{{year}}.pdf")

    # ── Subject data per branch/semester ──
    print(f"\n{'='*60}")
    print("📋 Subjects per Branch/Semester:")
    print(f"{'='*60}")
    for branch in sorted(subject_data.keys()):
        print(f"\n  {branch}:")
        for sem in sorted(subject_data[branch].keys()):
            year_id = {3: "2nd", 4: "2nd", 5: "3rd", 6: "3rd", 7: "4th", 8: "4th"}.get(sem, "?")
            print(f"    Sem {sem} ({year_id} year):")
            for s in sorted(subject_data[branch][sem]):
                print(f"      - {s}")


if __name__ == "__main__":
    main()
