"""
Generate Analyxx-branded wrapper PDFs for RTU scanned papers.
Strategy: Keep original scanned pages, prepend branded cover page.
Usage: python generate_rtu_papers.py [--test] [--upload] [--branch ME]
"""
import os, sys, re, subprocess, argparse, html, json, time
from pathlib import Path

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "backend", ".env"))

import fitz  # PyMuPDF
from pypdf import PdfReader, PdfWriter
from supabase import create_client, ClientOptions

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
BUCKET = "library-papers"

supabase_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY, options=ClientOptions(storage_client_timeout=300))

BASE_DIR = Path(__file__).parent
UPLOAD_DIR = BASE_DIR / "papers_to_upload"
RTU_ALL = UPLOAD_DIR / "RTU ALL PAPERS"
RTU_FIRST = UPLOAD_DIR / "Rtu  first year"  # Note: double space in actual dir name
OUTPUT_DIR = BASE_DIR / "generated_papers"
HTML_DIR = OUTPUT_DIR / "rtu_html"
PDF_DIR = OUTPUT_DIR / "rtu_pdf"

# Branch folder → (storage_id, display_name)
BRANCH_MAP = {
    "ME RTU": ("rtu-me", "RTU B.Tech Mechanical Engineering"),
    "CE RTU": ("rtu-ce", "RTU B.Tech Civil Engineering"),
    "CS:IT RTU ": ("rtu-csit", "RTU B.Tech CS/IT"),
    "CS:IT RTU": ("rtu-csit", "RTU B.Tech CS/IT"),
    "EE:EC RTU ": ("rtu-eeec", "RTU B.Tech EE/EC"),
    "EE:EC RTU": ("rtu-eeec", "RTU B.Tech EE/EC"),
}

# First-year abbreviations → full subject names
FIRST_YEAR_SUBJECTS = {
    "BEE": "Basic Electrical Engineering",
    "BME": "Basic Mechanical Engineering",
    "BCE": "Basic Civil Engineering",
    "EM1": "Engineering Mathematics 1",
    "EM2": "Engineering Mathematics 2",
    "EC": "Engineering Chemistry",
    "EP": "Engineering Physics",
    "PPS": "Programming for Problem Solving",
    "MEFA": "Managerial Economics & Financial Accounting",
    "BCS": "Basic Computer Science",
}


def parse_rtu_filename(filename: str):
    """
    Parse RTU filename to extract subject and code.
    Example: btech-3-sem-advance-engineering-mathematics-1-3e1206-jan-2025.pdf
    → subject: "Advance Engineering Mathematics 1", code: "3E1206"
    """
    name = filename.replace(".pdf", "").replace(".PDF", "")
    
    # Extract code: patterns like 3e1206, 4e4162, 610304, 41n0404, 6e3034m, 4csdc10
    code_match = re.search(r'[-_](\d+[a-zA-Z]+\d+[a-zA-Z]?(?:-\d+)?|[a-zA-Z]+\d+|\d{5,7})[-_]', name)
    code = code_match.group(1).upper() if code_match else ""
    
    # Remove common prefixes: btech-cs-it-4-sem- etc
    name = re.sub(r'^btech-(?:ae-|me-|cs-|it-|ce-|ee-|ec-|mx-)*', '', name)
    name = re.sub(r'^\d+-sem-', '', name)
    
    # Remove code and date parts from end (handle all code formats)
    # Pattern 1: alphanumeric codes like 4e1217, 6e3034m, 41n0404
    name = re.sub(r'[-_](?:\d+[a-zA-Z]+\d+[a-zA-Z]?)[-_].*$', '', name)
    # Pattern 2: pure numeric codes like 610304, 410305 (5-7 digits)
    name = re.sub(r'[-_](\d{5,7})[-_].*$', '', name)
    name = re.sub(r'[-_](\d{5,7})$', '', name)
    # Pattern 3: short alpha codes like 4csdc10
    name = re.sub(r'[-_](?:[a-zA-Z]+\d+)[-_].*$', '', name)
    # Pattern 4: month-year at end
    name = re.sub(r'[-_](?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[-_]\d{4}$', '', name, flags=re.IGNORECASE)
    # Pattern 5: bare year at end
    name = re.sub(r'[-_]\d{4}$', '', name)
    
    # Convert hyphens to spaces and title case
    subject = name.replace('-', ' ').replace('_', ' ').strip()
    subject = ' '.join(w.capitalize() for w in subject.split())
    
    return subject, code


def parse_semester_dir(dirname: str):
    """Parse semester directory like '3rd sem 2025' or '4TH SEM 23' → (semester, year)"""
    m = re.search(r'(\d+)(?:st|nd|rd|th)\s*sem(?:ester)?\s*(\d{2,4})', dirname, re.IGNORECASE)
    if not m:
        return None, None
    sem = int(m.group(1))
    year_str = m.group(2)
    year = int(year_str)
    if year < 100:
        year += 2000
    return sem, year


def parse_first_year_filename(filename: str):
    """Parse first year filenames like 'BEE_2024.pdf', 'engineering chemistry_2024.pdf'"""
    name = filename.replace(".pdf", "").replace(".PDF", "").strip()
    
    # Remove (1) duplicates
    name = re.sub(r'\(\d+\)$', '', name).strip()
    
    # Try abbreviation match
    for abbr, full_name in FIRST_YEAR_SUBJECTS.items():
        if name.upper().startswith(abbr.upper()):
            year_match = re.search(r'(\d{4})', name)
            year = int(year_match.group(1)) if year_match else None
            return full_name, year, ""
    
    # Try parsing long-form filename: btech-1-sem-basic-electrical-engineering-1e3108-2023.pdf
    if name.startswith("btech-1-sem-") or name.startswith("1styear_"):
        subject, code = parse_rtu_filename(filename)
        year_match = re.search(r'(\d{4})', filename)
        year = int(year_match.group(1)) if year_match else None
        return subject, year, code
    
    # Generic: "engineering chemistry_2024"
    year_match = re.search(r'(\d{4})', name)
    year = int(year_match.group(1)) if year_match else None
    subject = re.sub(r'[-_]?\d{4}', '', name).replace('_', ' ').replace('-', ' ').strip()
    subject = ' '.join(w.capitalize() for w in subject.split())
    return subject, year, ""


def generate_cover_html(exam_display: str, subject: str, semester: int, year: int, 
                        code: str = "", branch: str = "", num_pages: int = 0):
    """Generate branded cover page HTML for an RTU paper."""
    svg_icon = '<svg viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5z" fill="white"/><path d="M2 17l10 5 10-5" stroke="white" stroke-width="2.5" stroke-linecap="round"/><path d="M2 12l10 5 10-5" stroke="white" stroke-width="2.5" stroke-linecap="round"/></svg>'
    
    sem_display = f"Semester {semester}" if semester else ""
    code_display = code if code else "--"
    
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>{html.escape(exam_display)} {html.escape(subject)} {year} — Analyxx AI</title>
<link href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
:root {{ --teal:#00b8a0; --teal-dark:#007d6e; --ink:#0f0f0f; --mid:#444; --light:#888; --rule:#c8c8c8; --bg:#fff; --accent-bg:#f4faf9; }}
* {{ box-sizing:border-box; margin:0; padding:0; }}
body {{ font-family:'EB Garamond',Georgia,serif; font-size:11pt; color:var(--ink); background:#fff; }}
@page {{ size:A4; margin:0; }}
.page {{ width:210mm; height:297mm; background:var(--bg); padding:14mm 16mm 12mm; position:relative; }}
.cover-header {{ display:flex; align-items:flex-start; justify-content:space-between; border-bottom:2.5px solid var(--teal); padding-bottom:6mm; margin-bottom:7mm; }}
.booklet-box {{ border:2px solid var(--ink); padding:3mm 5mm; text-align:center; min-width:28mm; }}
.booklet-box .label {{ font-family:'DM Sans',sans-serif; font-size:7.5pt; letter-spacing:.08em; text-transform:uppercase; color:var(--light); display:block; margin-bottom:1mm; }}
.booklet-box .code-num {{ font-family:'DM Sans',sans-serif; font-size:22pt; font-weight:700; color:var(--ink); line-height:1; }}
.brand-center {{ text-align:center; flex:1; padding:0 6mm; }}
.brand-name {{ font-family:'DM Sans',sans-serif; font-size:18pt; font-weight:700; letter-spacing:-.01em; color:var(--ink); }}
.brand-name span {{ color:var(--teal); }}
.brand-tagline {{ font-family:'DM Sans',sans-serif; font-size:7pt; letter-spacing:.12em; text-transform:uppercase; color:var(--light); }}
.exam-title-block {{ text-align:center; margin:10mm 0 6mm; }}
.exam-name {{ font-family:'DM Sans',sans-serif; font-size:18pt; font-weight:700; letter-spacing:.03em; color:var(--ink); }}
.exam-subtitle {{ font-family:'DM Sans',sans-serif; font-size:10pt; color:var(--mid); margin-top:2mm; }}
.meta-strip {{ display:flex; justify-content:center; gap:6mm; font-family:'DM Sans',sans-serif; font-size:9pt; font-weight:500; border:1.5px solid var(--ink); padding:2.5mm 6mm; width:fit-content; margin:4mm auto 0; letter-spacing:.04em; }}
.meta-strip .sep {{ color:var(--rule); }}
.watermark {{ position:absolute; top:50%; left:50%; transform:translate(-50%,-50%) rotate(-35deg); font-family:'DM Sans',sans-serif; font-size:48pt; font-weight:700; color:rgba(0,184,160,.05); letter-spacing:.1em; text-transform:uppercase; pointer-events:none; }}
.info-box {{ border:1.5px solid var(--ink); padding:5mm 6mm; margin:8mm 0; background:var(--accent-bg); }}
.info-title {{ font-family:'DM Sans',sans-serif; font-size:9.5pt; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:var(--teal-dark); border-bottom:1px solid var(--rule); padding-bottom:2mm; margin-bottom:3mm; }}
.info-content {{ font-size:10pt; line-height:1.6; color:var(--mid); }}
.info-content p {{ margin-bottom:2mm; }}
.page-footer {{ position:absolute; bottom:8mm; left:16mm; right:16mm; display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--rule); padding-top:2mm; font-family:'DM Sans',sans-serif; font-size:8pt; color:var(--light); }}
.rtu-badge {{ display:inline-block; background:var(--teal-dark); color:white; font-family:'DM Sans',sans-serif; font-size:8pt; font-weight:600; padding:1.5mm 4mm; letter-spacing:.06em; margin-top:3mm; }}
</style>
</head>
<body>
<div class="page">
  <div class="watermark">ANALYXX</div>
  <div class="cover-header">
    <div class="booklet-box">
      <span class="label">Paper Code</span>
      <span class="code-num">{html.escape(code_display[:8])}</span>
    </div>
    <div class="brand-center">
      <div class="brand-name">Analyxx<span> AI</span></div>
      <div class="brand-tagline">Exam Intelligence Platform</div>
    </div>
    <div style="border:1.5px solid var(--rule);padding:2.5mm;text-align:center;min-width:26mm;">
      <div style="font-family:'DM Sans',sans-serif;font-size:7pt;color:var(--light);letter-spacing:.06em;text-transform:uppercase;margin-bottom:1.5mm;">Roll Number</div>
      <div style="display:grid;grid-template-columns:repeat(8,1fr);gap:0.5mm;">
        {"".join('<div style="border:1px solid var(--ink);height:5mm;width:5mm;"></div>' for _ in range(8))}
      </div>
    </div>
  </div>
  
  <div class="exam-title-block">
    <div style="font-family:'DM Sans',sans-serif;font-size:10pt;font-weight:600;color:var(--teal-dark);letter-spacing:.1em;text-transform:uppercase;margin-bottom:2mm;">Rajasthan Technical University, Kota</div>
    <div class="exam-name">{html.escape(subject)}</div>
    <div class="exam-subtitle">{html.escape(branch)} · {sem_display} · {year}</div>
    <div class="rtu-badge">B.TECH EXAMINATION</div>
    <div class="meta-strip">
      <span>YEAR: {year}</span>
      <span class="sep">|</span>
      <span>SEMESTER: {semester if semester else "—"}</span>
      <span class="sep">|</span>
      <span>DURATION: 3 Hours</span>
      <span class="sep">|</span>
      <span>MAX MARKS: 100</span>
    </div>
  </div>
  
  <div class="info-box">
    <div class="info-title">About This Paper</div>
    <div class="info-content">
      <p>This is an official previous year question paper from <strong>Rajasthan Technical University (RTU), Kota</strong>.</p>
      <p><strong>Branch:</strong> {html.escape(branch)}</p>
      <p><strong>Subject:</strong> {html.escape(subject)}{f' ({html.escape(code)})' if code else ''}</p>
      <p><strong>Semester:</strong> {semester if semester else "1st Year"}</p>
      <p><strong>Year:</strong> {year}</p>
      <p><strong>Total Pages:</strong> {num_pages} (including this cover)</p>
    </div>
  </div>

  <div class="info-box" style="background:#fff;">
    <div class="info-title">Instructions</div>
    <div class="info-content">
      <p>1. The question paper contains original scanned pages from the RTU examination.</p>
      <p>2. Attempt all questions as per the instructions given in the paper.</p>
      <p>3. All questions carry marks as indicated.</p>
      <p>4. Use of non-programmable calculator is permitted unless stated otherwise.</p>
      <p>5. Assume suitable data wherever necessary and state it clearly.</p>
    </div>
  </div>

  <div class="page-footer">
    <div>Powered by <strong style="color:var(--teal)">Analyxx AI</strong> · analyxx.com</div>
    <div style="color:var(--ink);font-weight:600;">[Cover]</div>
    <div style="color:var(--mid);font-style:italic;">[Contd...]</div>
  </div>
</div>
</body>
</html>'''


def convert_html_to_pdf(html_path: str, pdf_path: str) -> bool:
    """Convert HTML to PDF using Puppeteer."""
    try:
        result = subprocess.run(
            ["node", str(BASE_DIR / "html_to_pdf.js"), html_path, pdf_path],
            capture_output=True, text=True, timeout=120,
        )
        if result.returncode != 0:
            print(f"  ❌ Cover PDF failed: {result.stderr[:300]}")
            return False
        return True
    except subprocess.TimeoutExpired:
        print(f"  ⚠️  Cover PDF timed out, skipping...")
        return False
    except Exception as e:
        print(f"  ❌ Cover PDF error: {e}")
        return False


def merge_cover_with_original(cover_pdf_path: str, original_pdf_path: str, output_pdf_path: str) -> bool:
    """Merge Analyxx cover page with original scanned PDF."""
    try:
        writer = PdfWriter()
        writer.append(cover_pdf_path)
        writer.append(original_pdf_path)
        with open(output_pdf_path, "wb") as f:
            writer.write(f)
        return True
    except Exception as e:
        print(f"  ❌ Merge failed: {e}")
        return False


def upload_to_supabase(pdf_path: str, storage_path: str):
    """Upload PDF to Supabase."""
    with open(pdf_path, "rb") as f:
        content = f.read()
    try:
        try:
            supabase_client.storage.from_(BUCKET).remove([storage_path])
        except:
            pass
        supabase_client.storage.from_(BUCKET).upload(
            path=storage_path, file=content,
            file_options={"content-type": "application/pdf"},
        )
        print(f"  ✅ Uploaded → {storage_path}")
    except Exception as e:
        print(f"  ❌ Upload failed: {e}")


def process_rtu_paper(pdf_path: str, storage_id: str, branch_display: str,
                       subject: str, semester: int, year: int, code: str,
                       upload: bool = False):
    """Process a single RTU paper: generate cover + merge + upload."""
    print(f"\n{'='*60}")
    print(f"📄 {branch_display} — Sem {semester} — {subject} — {year}")
    print(f"   Source: {pdf_path}")

    # Count pages
    try:
        doc = fitz.open(pdf_path)
        num_pages = len(doc) + 1  # +1 for cover
        doc.close()
    except:
        num_pages = 4

    # 1. Generate cover HTML
    print("  📝 Generating cover page...")
    cover_html = generate_cover_html(
        exam_display=branch_display, subject=subject, semester=semester,
        year=year, code=code, branch=branch_display, num_pages=num_pages
    )
    
    safe_subject = re.sub(r'[^\w\s-]', '', subject).replace(' ', '_')
    html_path = HTML_DIR / f"{storage_id}_{safe_subject}_{year}_cover.html"
    html_path.parent.mkdir(parents=True, exist_ok=True)
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(cover_html)

    # 2. Convert cover to PDF
    print("  🖨️  Converting cover to PDF...")
    cover_pdf = PDF_DIR / f"{storage_id}_{safe_subject}_{year}_cover.pdf"
    cover_pdf.parent.mkdir(parents=True, exist_ok=True)
    if not convert_html_to_pdf(str(html_path), str(cover_pdf)):
        return False

    # 3. Merge cover + original
    print("  📎 Merging with original paper...")
    final_pdf = PDF_DIR / f"{storage_id}_{safe_subject}_{year}.pdf"
    if not merge_cover_with_original(str(cover_pdf), pdf_path, str(final_pdf)):
        return False

    print(f"  ✅ PDF ready: {final_pdf} ({num_pages} pages)")

    # 4. Upload
    if upload:
        storage_path = f"{storage_id}/Sem {semester}/{subject} {year}.pdf"
        print(f"  ☁️  Uploading to {storage_path}...")
        upload_to_supabase(str(final_pdf), storage_path)

    # Cleanup temp cover
    try:
        os.remove(str(cover_pdf))
    except:
        pass

    return True


def discover_rtu_papers():
    """Walk RTU directories and yield (pdf_path, storage_id, branch_display, subject, semester, year, code)"""
    papers = []

    # 1. RTU ALL PAPERS — organized by branch/semester
    if RTU_ALL.exists():
        for branch_dir in sorted(RTU_ALL.iterdir()):
            if not branch_dir.is_dir():
                continue
            branch_name = branch_dir.name.strip()
            
            # Look up branch mapping
            storage_id, branch_display = None, None
            for key, (sid, bdisp) in BRANCH_MAP.items():
                if branch_name.strip() == key.strip():
                    storage_id, branch_display = sid, bdisp
                    break
            if not storage_id:
                # Fallback
                safe = re.sub(r'[^\w]', '-', branch_name.lower()).strip('-')
                storage_id = f"rtu-{safe}"
                branch_display = f"RTU {branch_name}"

            for sem_dir in sorted(branch_dir.iterdir()):
                if not sem_dir.is_dir():
                    continue
                
                # Check if this is a "scraped" folder (year in filename, not dirname)
                is_scraped = "scraped" in sem_dir.name.lower()
                semester, year = parse_semester_dir(sem_dir.name)
                
                if is_scraped:
                    # For scraped folders, extract semester from dirname, year from each filename
                    sem_match = re.search(r'(\d+)', sem_dir.name)
                    if not sem_match:
                        continue
                    semester = int(sem_match.group(1))
                    
                    for pdf_file in sorted(sem_dir.glob("*.pdf")):
                        subject, code = parse_rtu_filename(pdf_file.name)
                        # Extract year: use the LAST 4-digit number (codes like 4e1217 appear before the real year)
                        all_years = re.findall(r'(?<![a-zA-Z])(\d{4})(?!\d)', pdf_file.name)
                        file_year = None
                        for y in reversed(all_years):
                            yr = int(y)
                            if 2015 <= yr <= 2030:
                                file_year = yr
                                break
                        if subject and file_year:
                            papers.append((str(pdf_file), storage_id, branch_display, subject, semester, file_year, code))
                elif year:
                    # Original format: year in directory name
                    for pdf_file in sorted(sem_dir.glob("*.pdf")):
                        subject, code = parse_rtu_filename(pdf_file.name)
                        if subject:
                            papers.append((str(pdf_file), storage_id, branch_display, subject, semester, year, code))

    # 2. RTU First Year
    if RTU_FIRST.exists():
        for pdf_file in sorted(RTU_FIRST.glob("*.pdf")):
            subject, year, code = parse_first_year_filename(pdf_file.name)
            if subject and year:
                papers.append((str(pdf_file), "rtu-1styear", "RTU B.Tech 1st Year", subject, 1, year, code))

    return papers


def main():
    parser = argparse.ArgumentParser(description="Generate Analyxx-branded RTU papers")
    parser.add_argument("--test", action="store_true", help="Process only 3 papers for testing")
    parser.add_argument("--upload", action="store_true", help="Upload to Supabase")
    parser.add_argument("--branch", type=str, help="Filter by branch (ME, CE, CS, EE)")
    parser.add_argument("--scraped-only", action="store_true", help="Only process papers from 'scraped' folders")
    parser.add_argument("--semesters", type=str, help="Comma-separated semesters to filter, e.g. '3,5,7'")
    args = parser.parse_args()

    HTML_DIR.mkdir(parents=True, exist_ok=True)
    PDF_DIR.mkdir(parents=True, exist_ok=True)

    papers = discover_rtu_papers()
    
    if args.branch:
        papers = [p for p in papers if args.branch.lower() in p[1].lower()]

    if args.scraped_only:
        papers = [p for p in papers if 'scraped' in p[0].lower()]

    if args.semesters:
        sem_list = [int(s.strip()) for s in args.semesters.split(',')]
        papers = [p for p in papers if p[4] in sem_list]

    if args.test:
        papers = papers[:3]

    print(f"\n🚀 Analyxx RTU Paper Wrapper")
    print(f"   Papers to process: {len(papers)}")
    print(f"   Upload: {'Yes' if args.upload else 'No (dry run)'}")
    print(f"{'='*60}")

    success = 0
    failed = 0
    total = len(papers)

    for i, (pdf_path, storage_id, branch_display, subject, semester, year, code) in enumerate(papers, 1):
        print(f"\n[{i}/{total}]", end="")
        try:
            if process_rtu_paper(pdf_path, storage_id, branch_display, subject, semester, year, code, upload=args.upload):
                success += 1
            else:
                failed += 1
        except Exception as e:
            print(f"  ❌ Unexpected error: {e}")
            failed += 1

    print(f"\n{'='*60}")
    print(f"🎉 Done! ✅ {success} generated | ❌ {failed} failed")


if __name__ == "__main__":
    main()
