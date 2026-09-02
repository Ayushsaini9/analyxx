"""
Generate Analyxx-branded JEE Advanced PYQ papers from scraped PDFs.
Pipeline: Extract text → Parse with regex → HTML template → PDF (Puppeteer) → Upload (Supabase)

Usage:
    python generate_jee_papers.py                    # Generate all
    python generate_jee_papers.py --test             # Test with 1 paper
    python generate_jee_papers.py --upload           # Generate + upload
    python generate_jee_papers.py --year 2024        # Specific year
"""
import os, sys, json, time, re, subprocess, argparse, html
from pathlib import Path
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "backend", ".env"))

import fitz  # PyMuPDF
import requests
from supabase import create_client, ClientOptions

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
BUCKET = "library-papers"

BASE_DIR = Path(__file__).parent
SOURCE_DIR = BASE_DIR / "papers_to_upload" / "JEE Advanced"
OUTPUT_DIR = BASE_DIR / "generated_papers" / "jee_advanced"
HTML_DIR = OUTPUT_DIR / "html"
PDF_DIR = OUTPUT_DIR / "pdf"
JSON_DIR = OUTPUT_DIR / "json"

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    raise ValueError("Missing required environment variables: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set")

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY, options=ClientOptions(storage_client_timeout=300))

JEE_META = {"duration": "3 Hours", "max_marks": "360", "subjects": "Physics · Chemistry · Mathematics"}

MONTH_NAMES = {
    "jan": "January", "feb": "February", "mar": "March", "apr": "April",
    "may": "May", "jun": "June", "jul": "July", "aug": "August",
    "sep": "September", "oct": "October", "nov": "November", "dec": "December",
}


def parse_jee_filename(filename: str):
    """Parse jee_advanced_2024_paper1.pdf → metadata dict."""
    stem = Path(filename).stem
    year_match = re.search(r'(20\d{2})', stem)
    if not year_match:
        return None
    year = int(year_match.group(1))
    paper_match = re.search(r'paper(\d)', stem)
    paper_num = int(paper_match.group(1)) if paper_match else None

    display = f"JEE Advanced {year}"
    if paper_num:
        display += f" — Paper {paper_num}"

    return {
        "year": year, "paper": paper_num,
        "display": display, "stem": stem,
    }


def extract_text(pdf_path: str) -> str:
    doc = fitz.open(pdf_path)
    text = ""
    for page in doc:
        text += page.get_text() + "\n\n--- PAGE BREAK ---\n\n"
    doc.close()
    return text


def filter_english(text: str) -> str:
    lines = text.split('\n')
    out = []
    for line in lines:
        s = line.strip()
        if not s:
            out.append(line)
            continue
        non_latin = sum(1 for c in s if '\u0900' <= c <= '\u097F' or '\u0600' <= c <= '\u06FF')
        if len(s) > 0 and non_latin / len(s) < 0.15:
            out.append(line)
    return '\n'.join(out)


def parse_jee_paper(raw_text: str) -> dict:
    """Parse JEE Advanced paper text into structured JSON."""
    text = filter_english(raw_text)
    text = re.sub(r'--- PAGE BREAK ---', '\n', text)
    text = re.sub(r'\n{3,}', '\n\n', text)

    instructions = []
    instr_match = re.search(r'(?:General\s+Instructions?|IMPORTANT\s+INSTRUCTIONS?)\s*:?\s*\n(.*?)(?=SECTION|Section|PART|\n\d+[\.\)])', text, re.DOTALL | re.IGNORECASE)
    if instr_match:
        for m in re.finditer(r'(?:\(?\d+\)?\.?|[•\-])\s*(.+?)(?=\n\s*(?:\(?\d+\)?\.?|[•\-])|\Z)', instr_match.group(1), re.DOTALL):
            inst = ' '.join(m.group(1).strip().split())
            if len(inst) > 10:
                instructions.append(inst)

    # Find sections (SECTION A / PART A patterns common in JEE)
    section_pat = re.compile(r'(?:SECTION|PART)\s+([A-E]|[12])', re.IGNORECASE)
    section_starts = [(m.start(), m.group(1).upper()) for m in section_pat.finditer(text)]

    sections = []
    if section_starts:
        for idx, (start, label) in enumerate(section_starts):
            end = section_starts[idx + 1][0] if idx + 1 < len(section_starts) else len(text)
            sec_text = text[start:end]
            questions = _extract_questions(sec_text)
            if questions:
                sections.append({"label": f"SECTION {label}", "description": "", "questions": questions})
    else:
        # No sections found — parse entire text
        questions = _extract_questions(text)
        if questions:
            sections.append({"label": "QUESTIONS", "description": "", "questions": questions})

    return {"code": "", "instructions": instructions, "sections": _dedup(sections)}


def _extract_questions(text: str) -> list:
    questions = []
    q_pat = re.compile(r'(?:^|\n)\s*(?:Q\.?\s*)?(\d+)\s*[\.\)]\s*(.+?)(?=\n\s*(?:Q\.?\s*)?\d+\s*[\.\)]|\Z)', re.DOTALL)
    for qm in q_pat.finditer(text):
        q_num = int(qm.group(1))
        q_body = qm.group(2).strip()
        options = []
        opt_matches = list(re.finditer(r'\(([A-Da-d1-4])\)\s*(.+?)(?=\([A-Da-d1-4]\)|$)', q_body, re.DOTALL))
        if len(opt_matches) >= 3:
            for om in opt_matches:
                options.append(f"({om.group(1).upper()}) {' '.join(om.group(2).strip().split())}")
            q_text = q_body[:opt_matches[0].start()].strip()
        else:
            q_text = q_body
        q_text = ' '.join(q_text.split())
        q_text = re.sub(r'\s*\[\s*\d+\s*\]\s*$', '', q_text)
        marks_match = re.search(r'\[\s*(\d+)\s*\]', q_body)
        marks = int(marks_match.group(1)) if marks_match else (4 if options else 0)
        if q_text and len(q_text) > 5:
            questions.append({"number": q_num, "text": q_text, "marks": marks, "options": options})
    return questions


def _dedup(sections):
    merged = {}
    for s in sections:
        lbl = s["label"]
        if lbl in merged:
            merged[lbl]["questions"].extend(s["questions"])
        else:
            merged[lbl] = {"label": lbl, "description": s.get("description", ""), "questions": list(s["questions"])}
    result = []
    for sec in merged.values():
        seen = set()
        uq = []
        for q in sec["questions"]:
            if q["number"] not in seen:
                seen.add(q["number"])
                uq.append(q)
        sec["questions"] = sorted(uq, key=lambda x: x["number"])
        if sec["questions"]:
            result.append(sec)
    return result


def generate_html(structured: dict, meta: dict) -> str:
    """Generate Analyxx-branded HTML for a JEE Advanced paper."""
    display = html.escape(meta["display"])
    year = meta["year"]
    date_str = html.escape(meta.get("date_str") or "")
    shift = meta.get("shift")
    code = html.escape(structured.get("code", ""))

    instr_html = ""
    if structured.get("instructions"):
        instr_html = '<div class="instructions-box"><div class="instructions-title">General Instructions</div><ol class="instructions-list">'
        for inst in structured["instructions"]:
            instr_html += f'<li>{html.escape(inst)}</li>'
        instr_html += '</ol></div>'

    pages = []
    cur = ""
    qc = 0
    for sec in structured.get("sections", []):
        cur += f'<div class="section-label">{html.escape(sec["label"])}</div>'
        if sec.get("description"):
            cur += f'<p style="font-size:9pt;color:#444;margin-bottom:4mm;font-family:\'DM Sans\',sans-serif;">{html.escape(sec["description"])}</p>'
        for q in sec.get("questions", []):
            qh = f'<div class="question-item"><span class="q-number">Q.{q["number"]}</span>'
            qh += f'<span class="q-text">{html.escape(q["text"])}</span>'
            if q.get("marks"):
                qh += f' <span style="font-family:\'DM Sans\',sans-serif;font-size:8pt;color:#888;">[{q["marks"]}]</span>'
            if q.get("options"):
                qh += '<ul class="options-list">'
                for opt in q["options"]:
                    qh += f'<li><span class="opt-label">{html.escape(str(opt)[:3])}</span> {html.escape(str(opt)[3:].strip())}</li>'
                qh += '</ul>'
            qh += '</div>'
            cur += qh
            qc += 1
            if qc % 13 == 0:
                pages.append(cur)
                cur = ""
    if cur.strip():
        pages.append(cur)

    svg = '<svg viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5z" fill="white"/><path d="M2 17l10 5 10-5" stroke="white" stroke-width="2.5" stroke-linecap="round"/><path d="M2 12l10 5 10-5" stroke="white" stroke-width="2.5" stroke-linecap="round"/></svg>'

    pages_html = ""
    for i, pc in enumerate(pages):
        pg = i + 2
        pages_html += f'''
<div class="page">
  <div class="watermark">ANALYXX</div>
  <div class="question-header">
    <div class="brand-sm">
      <div class="icon-sm">{svg}</div>
      <div class="nm">Analyxx<span> AI</span> · JEE Advanced {year}</div>
    </div>
    <div class="qh-right">English</div>
  </div>
  <div style="padding:3mm 0;">{pc}</div>
  <div class="page-footer">
    <div>Powered by <strong style="color:#00b8a0">Analyxx AI</strong> · analyxx.com</div>
    <div class="pg">[{pg}]</div>
    <div class="contd">{"[Contd...]" if i < len(pages)-1 else "— End —"}</div>
  </div>
</div>'''

    paper_num = meta.get("paper")
    paper_label = f"Paper {paper_num}" if paper_num else ""
    subtitle = f"JEE Advanced · {paper_label} · {year}".strip()

    return f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>{display} — Analyxx AI</title>
<link href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
:root {{ --teal:#00b8a0; --teal-dark:#007d6e; --ink:#0f0f0f; --mid:#444; --light:#888; --rule:#c8c8c8; --bg:#fff; --accent-bg:#f4faf9; }}
* {{ box-sizing:border-box; margin:0; padding:0; }}
body {{ font-family:'EB Garamond',Georgia,serif; font-size:11pt; color:var(--ink); background:#fff; line-height:1.55; }}
@page {{ size:A4; margin:0; }}
.page {{ width:210mm; min-height:297mm; background:var(--bg); padding:14mm 16mm 12mm; position:relative; page-break-after:always; }}
.page:last-child {{ page-break-after:avoid; }}
.cover-header {{ display:flex; align-items:flex-start; justify-content:space-between; border-bottom:2.5px solid var(--teal); padding-bottom:6mm; margin-bottom:7mm; }}
.booklet-box {{ border:2px solid var(--ink); padding:3mm 5mm; text-align:center; min-width:28mm; }}
.booklet-box .label {{ font-family:'DM Sans',sans-serif; font-size:7.5pt; letter-spacing:.08em; text-transform:uppercase; color:var(--light); display:block; margin-bottom:1mm; }}
.booklet-box .code-num {{ font-family:'DM Sans',sans-serif; font-size:28pt; font-weight:700; color:var(--ink); line-height:1; }}
.brand-center {{ text-align:center; flex:1; padding:0 6mm; }}
.brand-name {{ font-family:'DM Sans',sans-serif; font-size:18pt; font-weight:700; letter-spacing:-.01em; color:var(--ink); }}
.brand-name span {{ color:var(--teal); }}
.brand-tagline {{ font-family:'DM Sans',sans-serif; font-size:7pt; letter-spacing:.12em; text-transform:uppercase; color:var(--light); }}
.exam-title-block {{ text-align:center; margin:4mm 0 3mm; }}
.exam-name {{ font-family:'DM Sans',sans-serif; font-size:20pt; font-weight:700; letter-spacing:.03em; color:var(--ink); }}
.exam-subtitle {{ font-family:'DM Sans',sans-serif; font-size:9.5pt; color:var(--mid); margin-top:1mm; }}
.meta-strip {{ display:flex; justify-content:center; gap:8mm; font-family:'DM Sans',sans-serif; font-size:9pt; font-weight:500; border:1.5px solid var(--ink); padding:2mm 6mm; width:fit-content; margin:3mm auto 0; letter-spacing:.04em; }}
.meta-strip .sep {{ color:var(--rule); }}
.instructions-box {{ border:1.5px solid var(--ink); padding:4mm 5mm; margin-bottom:5mm; background:var(--accent-bg); }}
.instructions-title {{ font-family:'DM Sans',sans-serif; font-size:9.5pt; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:var(--teal-dark); border-bottom:1px solid var(--rule); padding-bottom:2mm; margin-bottom:3mm; }}
.instructions-list {{ list-style:none; counter-reset:instr; }}
.instructions-list li {{ counter-increment:instr; padding-left:6mm; position:relative; margin-bottom:2mm; font-size:9.5pt; line-height:1.5; }}
.instructions-list li::before {{ content:counter(instr) "."; position:absolute; left:0; font-weight:600; color:var(--teal-dark); }}
.page-footer {{ position:absolute; bottom:8mm; left:16mm; right:16mm; display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--rule); padding-top:2mm; font-family:'DM Sans',sans-serif; font-size:8pt; color:var(--light); }}
.page-footer .pg {{ color:var(--ink); font-weight:600; }}
.page-footer .contd {{ color:var(--mid); font-style:italic; }}
.watermark {{ position:absolute; top:50%; left:50%; transform:translate(-50%,-50%) rotate(-35deg); font-family:'DM Sans',sans-serif; font-size:48pt; font-weight:700; color:rgba(0,184,160,.05); letter-spacing:.1em; text-transform:uppercase; pointer-events:none; user-select:none; white-space:nowrap; }}
.question-header {{ display:flex; align-items:center; justify-content:space-between; border-bottom:2px solid var(--teal); padding-bottom:2mm; margin-bottom:4mm; }}
.brand-sm {{ display:flex; align-items:center; gap:2mm; }}
.icon-sm {{ width:7mm; height:7mm; background:var(--teal); border-radius:1.5mm; display:flex; align-items:center; justify-content:center; }}
.icon-sm svg {{ width:4mm; height:4mm; }}
.nm {{ font-family:'DM Sans',sans-serif; font-size:10pt; font-weight:700; color:var(--ink); }}
.nm span {{ color:var(--teal); }}
.qh-right {{ font-family:'DM Sans',sans-serif; font-size:9pt; font-weight:600; color:var(--mid); }}
.section-label {{ font-family:'DM Sans',sans-serif; font-size:9pt; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:var(--bg); background:var(--teal-dark); display:inline-block; padding:1mm 4mm; margin-bottom:3mm; margin-top:3mm; }}
.question-item {{ margin-bottom:4mm; padding-bottom:4mm; border-bottom:1px dotted var(--rule); break-inside:avoid; }}
.question-item:last-child {{ border-bottom:none; }}
.q-number {{ font-family:'DM Sans',sans-serif; font-weight:700; font-size:10pt; color:var(--teal-dark); margin-right:1.5mm; }}
.q-text {{ font-size:10pt; line-height:1.55; color:var(--ink); display:inline; }}
.options-list {{ list-style:none; margin-top:2mm; padding-left:3mm; }}
.options-list li {{ font-size:9.5pt; margin-bottom:1.5mm; display:flex; gap:2mm; }}
.opt-label {{ font-family:'DM Mono',monospace; font-size:8.5pt; font-weight:500; color:var(--mid); min-width:5mm; }}
@media print {{ body {{ background:white; }} .page {{ margin:0; box-shadow:none; }} }}
</style>
</head>
<body>
<div class="page" id="cover">
  <div class="watermark">ANALYXX</div>
  <div class="cover-header">
    <div class="booklet-box">
      <span class="label">Exam Code</span>
      <span class="code-num">JA</span>
      <div style="font-family:'DM Sans',sans-serif;font-size:7pt;color:var(--light);margin-top:1mm;letter-spacing:.06em;">IIT — JEE</div>
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
    <div class="exam-name">JEE Advanced{f" — Paper {meta.get('paper', '')}" if meta.get('paper') else ""}</div>
    <div class="exam-subtitle">{html.escape(subtitle)}</div>
    <div class="meta-strip">
      <span>YEAR: {year}</span>
      <span class="sep">|</span>
      <span>DURATION: {JEE_META["duration"]}</span>
      <span class="sep">|</span>
      <span>MAX MARKS: {JEE_META["max_marks"]}</span>
    </div>
  </div>
  <div style="height:5mm;"></div>
  {instr_html if instr_html else '<div class="instructions-box" style="min-height:60mm;"><div class="instructions-title">General Instructions</div><p style="font-size:9.5pt;color:#888;">Refer to the original exam paper for detailed instructions.</p></div>'}
  <div class="page-footer">
    <div>Powered by <strong style="color:var(--teal)">Analyxx AI</strong> · analyxx.com</div>
    <div class="pg">[1]</div>
    <div class="contd">[Contd...]</div>
  </div>
</div>
{pages_html}
</body>
</html>'''


def convert_html_to_pdf(html_path: str, pdf_path: str) -> bool:
    result = subprocess.run(
        ["node", str(BASE_DIR / "html_to_pdf.js"), html_path, pdf_path],
        capture_output=True, text=True, timeout=60,
    )
    if result.returncode != 0:
        print(f"  ❌ PDF conversion failed: {result.stderr[:200]}")
        return False
    return True


def upload_to_supabase(pdf_path: str, storage_path: str) -> str:
    with open(pdf_path, "rb") as f:
        content = f.read()
    try:
        try:
            supabase.storage.from_(BUCKET).remove([storage_path])
        except:
            pass
        supabase.storage.from_(BUCKET).upload(
            path=storage_path, file=content,
            file_options={"content-type": "application/pdf"},
        )
        print(f"  ✅ Uploaded → {storage_path}")
        return storage_path
    except Exception as e:
        if "Duplicate" in str(e) or "already exists" in str(e).lower():
            print(f"  ℹ️  Already exists → {storage_path}")
            return storage_path
        print(f"  ❌ Upload failed: {e}")
        return None


def process_paper(pdf_path: Path, meta: dict, do_upload: bool = False) -> bool:
    stem = meta["stem"]
    print(f"\n{'='*60}")
    print(f"📄 {meta['display']}")
    print(f"   Source: {pdf_path.name}")

    # 1. Extract text
    print("  📖 Extracting text...")
    raw = extract_text(str(pdf_path))
    if not raw.strip():
        print("  ❌ No text extracted (scanned PDF?)")
        return False

    # 2. Parse
    print("  🔍 Parsing questions...")
    structured = parse_jee_paper(raw)
    total_q = sum(len(s.get("questions", [])) for s in structured.get("sections", []))
    print(f"    Found {total_q} questions")

    # Save JSON
    json_path = JSON_DIR / f"{stem}.json"
    json_path.parent.mkdir(parents=True, exist_ok=True)
    with open(json_path, "w") as f:
        json.dump(structured, f, indent=2, ensure_ascii=False)

    # 3. Generate HTML
    print("  📝 Generating branded HTML...")
    html_content = generate_html(structured, meta)
    html_path = HTML_DIR / f"{stem}.html"
    html_path.parent.mkdir(parents=True, exist_ok=True)
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html_content)

    # 4. Convert to PDF
    print("  🖨️  Converting to PDF...")
    pdf_out = PDF_DIR / f"{stem}.pdf"
    pdf_out.parent.mkdir(parents=True, exist_ok=True)
    if not convert_html_to_pdf(str(html_path), str(pdf_out)):
        return False
    print(f"  ✅ Branded PDF: {pdf_out.name} ({pdf_out.stat().st_size:,} bytes)")

    # 5. Upload
    if do_upload:
        # Storage: jee-advanced/Paper/{stem_without_jee_advanced_}.pdf
        label = stem.replace("jee_advanced_", "")
        storage_path = f"jee-advanced/Paper/{label}.pdf"
        print(f"  ☁️  Uploading to {storage_path}...")
        upload_to_supabase(str(pdf_out), storage_path)

    return True


def main():
    parser = argparse.ArgumentParser(description="Generate Analyxx-branded JEE Advanced papers")
    parser.add_argument("--test", action="store_true", help="Process only 1 paper")
    parser.add_argument("--upload", action="store_true", help="Upload to Supabase")
    parser.add_argument("--year", type=int, help="Filter by year")
    parser.add_argument("--file", type=str, help="Process a specific file")
    args = parser.parse_args()

    for d in [OUTPUT_DIR, HTML_DIR, PDF_DIR, JSON_DIR]:
        d.mkdir(parents=True, exist_ok=True)

    if args.file:
        files = [Path(args.file)]
    else:
        files = sorted(SOURCE_DIR.glob("jee_advanced_*.pdf"))
        if args.year:
            files = [f for f in files if str(args.year) in f.name]

    if args.test:
        files = files[:1]

    print(f"\n🚀 Analyxx JEE Advanced Template Generator")
    print(f"   Papers: {len(files)}")
    print(f"   Upload: {'Yes' if args.upload else 'No'}")
    print(f"{'='*60}")

    success = fail = 0
    for pdf_path in files:
        meta = parse_jee_filename(pdf_path.name)
        if not meta:
            print(f"\n⚠️  Skipped {pdf_path.name} — can't parse filename")
            fail += 1
            continue
        if process_paper(pdf_path, meta, do_upload=args.upload):
            success += 1
        else:
            fail += 1
        time.sleep(0.5)

    print(f"\n{'='*60}")
    print(f"🎉 Done! ✅ {success} generated | ❌ {fail} failed")
    if success > 0 and not args.upload:
        print(f"   💡 Run with --upload to push to Supabase")


if __name__ == "__main__":
    main()
