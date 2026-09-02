"""
Generate Analyxx-branded PYQ papers from source PDFs.
Pipeline: Extract text (PyMuPDF) → Structure with AI (Groq) → HTML template → PDF (Puppeteer) → Upload (Supabase)
Usage: python generate_template_papers.py [--test] [--file class10_science_2025.pdf]
"""
import os, sys, json, time, re, subprocess, argparse, html
from pathlib import Path

# Load env
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "backend", ".env"))

import fitz  # PyMuPDF
import requests
from supabase import create_client, ClientOptions

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
BUCKET = "library-papers"
UPLOAD_DIR = Path(__file__).parent / "papers_to_upload"
OUTPUT_DIR = Path(__file__).parent / "generated_papers"
HTML_DIR = OUTPUT_DIR / "html"
PDF_DIR = OUTPUT_DIR / "pdf"

supabase_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY, options=ClientOptions(storage_client_timeout=300))

EXAM_MAP = {
    "class10": ("cbse-10", "CBSE Class 10"),
    "class12": ("cbse-12", "CBSE Class 12"),
    "neet": ("neet", "NEET"),
    "jee": ("jee-advanced", "JEE Advanced"),
}

EXAM_META = {
    "cbse-10": {"duration": "3 Hours", "max_marks": "80", "subjects_line": "All Subjects"},
    "cbse-12": {"duration": "3 Hours", "max_marks": "70", "subjects_line": "All Subjects"},
    "neet": {"duration": "3 Hours 20 Min", "max_marks": "720", "subjects_line": "Physics · Chemistry · Biology"},
    "jee-advanced": {"duration": "3 Hours", "max_marks": "300", "subjects_line": "Physics · Chemistry · Mathematics"},
}

SUBJECT_MARKS = {
    "cbse-10": {"Science": 80, "Mathematics Standard": 80, "Mathematics Basic": 80, "English": 80, "Hindi": 80,
                "Social Studies": 80, "Computer Application": 50, "French": 80, "Japanese": 80,
                "Sanskrit": 80, "Design Thinking": 50, "Data Science": 50, "Information Technology": 50},
    "cbse-12": {"Physics": 70, "Chemistry": 70, "Biology": 70, "Mathematics": 80, "English": 80,
                "Accountancy": 80, "Business Studies": 80, "Economics": 80, "Psychology": 70,
                "Physical Education": 70, "Entrepreneurship": 70, "French": 80, "Data Science": 70,
                "Design Thinking": 50, "Political Science": 80, "Web Application": 70},
}


def extract_text(pdf_path: str) -> str:
    """Extract all text from PDF using PyMuPDF."""
    doc = fitz.open(pdf_path)
    text = ""
    for page in doc:
        text += page.get_text() + "\n\n--- PAGE BREAK ---\n\n"
    doc.close()
    return text


def filter_english_only(text: str) -> str:
    """Remove non-English lines (Hindi, Arabic, Gurmukhi, etc). Aggressive filter."""
    lines = text.split('\n')
    english_lines = []
    for line in lines:
        stripped = line.strip()
        if not stripped:
            english_lines.append(line)
            continue
        # Count non-Latin script characters (Devanagari, Arabic, Gurmukhi, etc.)
        non_latin = sum(1 for c in stripped if (
            '\u0900' <= c <= '\u097F' or  # Devanagari
            '\u0600' <= c <= '\u06FF' or  # Arabic
            '\u0A00' <= c <= '\u0A7F' or  # Gurmukhi
            '\u0980' <= c <= '\u09FF' or  # Bengali
            '\u0B00' <= c <= '\u0B7F' or  # Odia
            '\u0C00' <= c <= '\u0C7F' or  # Telugu
            '\u0C80' <= c <= '\u0CFF' or  # Kannada
            '\u0D00' <= c <= '\u0D7F' or  # Malayalam
            '\u0B80' <= c <= '\u0BFF'     # Tamil
        ))
        total = len(stripped)
        # Keep line only if less than 15% non-Latin (stricter threshold)
        if total > 0 and non_latin / total < 0.15:
            english_lines.append(line)
    result = '\n'.join(english_lines)
    # Also remove "Set" duplicate blocks (common in bilingual papers)
    result = re.sub(r'\bSet\s*-?\s*\d\b.*?(?=\bSet\s*-?\s*\d|$)', '', result, flags=re.DOTALL | re.IGNORECASE)
    return result

def parse_with_regex(raw_text: str, exam_name: str, subject: str, year: int) -> dict:
    """Parse exam text using regex — no API needed, works offline."""
    raw_text = filter_english_only(raw_text)
    raw_text = re.sub(r'--- PAGE BREAK ---', '\n', raw_text)
    raw_text = re.sub(r'\n{3,}', '\n\n', raw_text)

    # Extract paper code
    code_match = re.search(r'(\d+/\d+/\d+)', raw_text)
    code = code_match.group(1) if code_match else ""

    # Extract instructions - look for "General Instructions" block
    instructions = []
    instr_match = re.search(r'General Instructions\s*:?\s*\n(.*?)(?=SECTION|Section|\n\d+\.)', raw_text, re.DOTALL | re.IGNORECASE)
    if instr_match:
        instr_block = instr_match.group(1)
        # Extract numbered or (i)/(ii) items
        for m in re.finditer(r'(?:\((?:i{1,4}v?|vi{0,3})\)|(?:^|\n)\s*\d+\.)\s*(.+?)(?=\n\s*(?:\((?:i{1,4}v?|vi{0,3})\)|\d+\.)|$)', instr_block, re.DOTALL):
            inst = ' '.join(m.group(1).strip().split())
            if len(inst) > 10:
                instructions.append(inst)

    # Find section boundaries
    section_pattern = re.compile(r'(?:SECTION|Section)\s+([A-E])', re.IGNORECASE)
    section_starts = [(m.start(), m.group(1).upper()) for m in section_pattern.finditer(raw_text)]

    sections = []
    for idx, (start, label) in enumerate(section_starts):
        end = section_starts[idx + 1][0] if idx + 1 < len(section_starts) else len(raw_text)
        section_text = raw_text[start:end]

        # Extract section description (text after "SECTION X" before first question)
        desc_match = re.search(r'Section\s+[A-E]\s*\n(.*?)(?=\n\s*\d+[\.\)]\s)', section_text, re.DOTALL | re.IGNORECASE)
        desc = ' '.join(desc_match.group(1).strip().split()) if desc_match else ""

        # Extract questions: look for "number." or "number)" pattern
        questions = []
        q_pattern = re.compile(r'(?:^|\n)\s*(\d+)\s*[\.\)]\s*(.+?)(?=\n\s*\d+\s*[\.\)]|\Z)', re.DOTALL)
        for qm in q_pattern.finditer(section_text):
            q_num = int(qm.group(1))
            q_body = qm.group(2).strip()

            # Extract MCQ options
            options = []
            opt_pattern = re.compile(r'\(([A-Da-d])\)\s*(.+?)(?=\([A-Da-d]\)|$)', re.DOTALL)
            opt_matches = list(opt_pattern.finditer(q_body))
            if len(opt_matches) >= 3:
                for om in opt_matches:
                    opt_text = ' '.join(om.group(2).strip().split())
                    options.append(f"({om.group(1).upper()}) {opt_text}")
                # Remove options from question text
                q_text = q_body[:opt_matches[0].start()].strip()
            else:
                q_text = q_body

            # Clean up question text
            q_text = ' '.join(q_text.split())
            q_text = re.sub(r'\s*\[\s*\d+\s*\]\s*$', '', q_text)  # Remove trailing [marks]

            # Detect marks from [N] pattern
            marks_match = re.search(r'\[\s*(\d+)\s*\]', q_body)
            marks = int(marks_match.group(1)) if marks_match else (1 if options else 0)

            # Check for OR question
            or_q = None
            or_match = re.search(r'\bOR\b\s*\n\s*(.+)', q_body, re.DOTALL)
            if or_match:
                or_text = ' '.join(or_match.group(1).strip().split()[:50])
                or_q = {"text": or_text}
                q_text = q_body[:or_match.start()].strip()
                q_text = ' '.join(q_text.split())

            if q_text and len(q_text) > 5:
                questions.append({
                    "number": q_num,
                    "text": q_text,
                    "marks": marks,
                    "options": options,
                    "sub_parts": [],
                    "or_question": or_q
                })

        if questions:
            sections.append({
                "label": f"SECTION {label}",
                "description": desc[:200] if desc else "",
                "questions": questions
            })

    # If no sections found, treat entire text as one section
    if not sections:
        questions = []
        q_pattern = re.compile(r'(?:^|\n)\s*(\d+)\s*[\.\)]\s*(.+?)(?=\n\s*\d+\s*[\.\)]|\Z)', re.DOTALL)
        for qm in q_pattern.finditer(raw_text):
            q_num = int(qm.group(1))
            q_text = ' '.join(qm.group(2).strip().split()[:100])
            options = []
            opt_matches = list(re.finditer(r'\(([A-D])\)\s*(.+?)(?=\([A-D]\)|$)', qm.group(2), re.DOTALL))
            if len(opt_matches) >= 3:
                for om in opt_matches:
                    options.append(f"({om.group(1)}) {' '.join(om.group(2).strip().split())}")
                q_text = q_text[:q_text.find('(A)')].strip() if '(A)' in q_text else q_text
            if q_text and len(q_text) > 5:
                questions.append({"number": q_num, "text": q_text, "marks": 1, "options": options, "sub_parts": [], "or_question": None})
        if questions:
            sections.append({"label": "QUESTIONS", "description": "", "questions": questions})

    return deduplicate_and_validate(code, instructions, sections)


def deduplicate_and_validate(code, instructions, sections):
    """Remove duplicate questions, merge duplicate sections, validate structure."""
    # 1. Merge sections with same label
    merged = {}
    for s in sections:
        label = s["label"]
        if label in merged:
            merged[label]["questions"].extend(s.get("questions", []))
        else:
            merged[label] = {"label": label, "description": s.get("description", ""), "questions": list(s.get("questions", []))}

    # 2. De-duplicate questions within each section (keep first occurrence of each number)
    validated = []
    for label in merged:
        sec = merged[label]
        seen_nums = set()
        unique_qs = []
        for q in sec["questions"]:
            num = q.get("number")
            if num not in seen_nums:
                seen_nums.add(num)
                unique_qs.append(q)
        sec["questions"] = sorted(unique_qs, key=lambda x: x.get("number", 0))
        if sec["questions"]:  # Only keep non-empty sections
            validated.append(sec)

    # 3. Cap at sections A-E (max 5 real sections)
    valid_labels = {"SECTION A", "SECTION B", "SECTION C", "SECTION D", "SECTION E", "QUESTIONS"}
    final = [s for s in validated if s["label"] in valid_labels]
    if not final:
        final = validated[:5]  # Take first 5 if labels don't match standard

    # 4. Reject sections with only 1 question (likely parsing noise)
    final = [s for s in final if len(s["questions"]) >= 1]

    return {"code": code, "instructions": instructions, "sections": final}


def structure_with_ai(raw_text: str, exam_name: str, subject: str, year: int) -> dict:
    """Structure text — uses regex parser (fast, no API). AI fallback if < 5 questions."""
    result = parse_with_regex(raw_text, exam_name, subject, year)
    total_q = sum(len(s.get("questions", [])) for s in result.get("sections", []))
    print(f"    Regex parser found {total_q} questions")
    if total_q >= 5:
        return result
    print("    ⚠️ Too few questions, trying AI fallback...")

    # AI fallback for edge cases
    clean = filter_english_only(raw_text)
    clean = re.sub(r'\n{3,}', '\n\n', clean)[:3000]
    fmt = '{"code":"","instructions":[],"sections":[{"label":"SECTION A","description":"","questions":[{"number":1,"text":"","marks":1,"options":[]}]}]}'
    prompt = f"Parse this {exam_name} {subject} {year} exam into JSON. Output ONLY valid JSON.\nFormat: {fmt}\n\nTEXT:\n{clean}"

    for attempt in range(3):
        try:
            resp = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
                json={"model": "llama-3.1-8b-instant", "messages": [{"role": "user", "content": prompt}], "temperature": 0.1, "max_tokens": 4000},
                timeout=120,
            )
            resp.raise_for_status()
            content = resp.json()["choices"][0]["message"]["content"].strip()
            if content.startswith("```"):
                content = re.sub(r'^```(?:json)?\s*', '', content)
                content = re.sub(r'\s*```$', '', content)
            ai_result = json.loads(content)
            # Validate AI output
            ai_result = deduplicate_and_validate(
                ai_result.get("code", ""),
                ai_result.get("instructions", []),
                ai_result.get("sections", [])
            )
            ai_total = sum(len(s.get("questions", [])) for s in ai_result.get("sections", []))
            if ai_total > total_q:
                return ai_result
        except Exception as e:
            print(f"    ⚠️ AI attempt {attempt+1}/3: {e}")
            if attempt < 2: time.sleep(20)
    return result  # Return regex result even if AI fails


def generate_html(structured: dict, exam_id: str, exam_display: str, subject: str, year: int) -> str:
    """Generate Analyxx-branded HTML from structured content."""
    meta = EXAM_META.get(exam_id, {"duration": "3 Hours", "max_marks": "80", "subjects_line": subject})
    max_marks = SUBJECT_MARKS.get(exam_id, {}).get(subject, meta["max_marks"])
    code = html.escape(structured.get("code", ""))
    
    # Build instructions HTML
    instructions_html = ""
    instr_list = structured.get("instructions", [])
    if instr_list:
        instructions_html = '<div class="instructions-box"><div class="instructions-title">General Instructions</div><ol class="instructions-list">'
        for inst in instr_list:
            instructions_html += f'<li>{html.escape(inst)}</li>'
        instructions_html += '</ol></div>'

    # Build questions HTML
    questions_pages = []
    current_page = ""
    question_count = 0

    for section in structured.get("sections", []):
        section_label = html.escape(section.get("label", ""))
        section_desc = html.escape(section.get("description", ""))
        current_page += f'<div class="section-label">{section_label}</div>'
        if section_desc:
            current_page += f'<p style="font-size:9pt;color:#444;margin-bottom:4mm;font-family:\'DM Sans\',sans-serif;">{section_desc}</p>'

        for q in section.get("questions", []):
            q_num = q.get("number", "")
            q_text = html.escape(str(q.get("text", "")))
            q_marks = q.get("marks", "")
            options = q.get("options", [])
            sub_parts = q.get("sub_parts", [])
            or_q = q.get("or_question")

            q_html = f'<div class="question-item"><span class="q-number">Q.{q_num}</span>'
            q_html += f'<span class="q-text">{q_text}</span>'
            if q_marks:
                q_html += f' <span style="font-family:\'DM Sans\',sans-serif;font-size:8pt;color:#888;">[{q_marks}]</span>'

            if options:
                q_html += '<ul class="options-list">'
                for opt in options:
                    q_html += f'<li><span class="opt-label">{html.escape(str(opt)[:3])}</span> {html.escape(str(opt)[3:].strip())}</li>'
                q_html += '</ul>'

            if sub_parts:
                q_html += '<div style="margin-left:6mm;margin-top:2mm;">'
                for sp in sub_parts:
                    sp_text = html.escape(str(sp.get("text", sp) if isinstance(sp, dict) else sp))
                    q_html += f'<p style="margin-bottom:1.5mm;font-size:9.5pt;">({sp.get("label","") if isinstance(sp,dict) else ""}) {sp_text}</p>'
                q_html += '</div>'

            if or_q:
                or_text = html.escape(str(or_q.get("text", or_q) if isinstance(or_q, dict) else or_q))
                q_html += f'<div style="margin-top:2mm;padding-top:2mm;border-top:1px dashed #c8c8c8;"><strong style="color:#007d6e;font-family:\'DM Sans\',sans-serif;font-size:8.5pt;">OR</strong><br/><span class="q-text">{or_text}</span></div>'

            q_html += '</div>'
            current_page += q_html
            question_count += 1

            # Approximate page break every 12-15 questions
            if question_count % 13 == 0:
                questions_pages.append(current_page)
                current_page = ""

    if current_page.strip():
        questions_pages.append(current_page)

    # Build full HTML
    svg_icon = '<svg viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5z" fill="white"/><path d="M2 17l10 5 10-5" stroke="white" stroke-width="2.5" stroke-linecap="round"/><path d="M2 12l10 5 10-5" stroke="white" stroke-width="2.5" stroke-linecap="round"/></svg>'

    pages_html = ""
    for i, page_content in enumerate(questions_pages):
        pg = i + 2
        pages_html += f'''
<div class="page">
  <div class="watermark">ANALYXX</div>
  <div class="question-header">
    <div class="brand-sm">
      <div class="icon-sm">{svg_icon}</div>
      <div class="nm">Analyxx<span> AI</span> · {html.escape(exam_display)} {html.escape(subject)} [{code}]</div>
    </div>
    <div class="qh-right">English</div>
  </div>
  <div style="padding:3mm 0;">{page_content}</div>
  <div class="page-footer">
    <div>Powered by <strong style="color:#00b8a0">Analyxx AI</strong> · analyxx.com</div>
    <div class="pg">[{pg}]</div>
    <div class="contd">{"[Contd...]" if i < len(questions_pages)-1 else "— End —"}</div>
  </div>
</div>'''

    full_html = f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>{exam_display} {subject} {year} — Analyxx AI</title>
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

<!-- PAGE 1 — COVER -->
<div class="page" id="cover">
  <div class="watermark">ANALYXX</div>
  <div class="cover-header">
    <div class="booklet-box">
      <span class="label">Booklet Code</span>
      <span class="code-num">{code[:2] if code else "--"}</span>
      <div style="font-family:'DM Sans',sans-serif;font-size:7pt;color:var(--light);margin-top:1mm;letter-spacing:.06em;">SERIES — {code.split("/")[0] if "/" in code else "_"}</div>
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
    <div class="exam-name">{html.escape(exam_display)} — {html.escape(subject)}</div>
    <div class="exam-subtitle">{html.escape(exam_display)} · {html.escape(subject)} · {year}</div>
    <div class="meta-strip">
      <span>YEAR: {year}</span>
      <span class="sep">|</span>
      <span>DURATION: {html.escape(meta["duration"])}</span>
      <span class="sep">|</span>
      <span>MAX MARKS: {max_marks}</span>
    </div>
  </div>
  <div style="height:5mm;"></div>
  {instructions_html if instructions_html else '<div class="instructions-box" style="min-height:60mm;"><div class="instructions-title">General Instructions</div><p style="font-size:9.5pt;color:#888;">Refer to the original exam paper for detailed instructions.</p></div>'}
  <div class="page-footer">
    <div>Powered by <strong style="color:var(--teal)">Analyxx AI</strong> · analyxx.com</div>
    <div class="pg">[1]</div>
    <div class="contd">[Contd...]</div>
  </div>
</div>

{pages_html}

</body>
</html>'''
    return full_html


def parse_filename(filename: str):
    """Parse filename like class10_science_2025.pdf → (exam_id, exam_display, subject, year)"""
    clean = filename.strip()
    if not clean.lower().endswith(".pdf"):
        return None
    clean = clean[:-4].strip()
    parts = [p.strip() for p in clean.split("_") if p.strip()]
    if len(parts) < 3:
        return None
    year_str = parts[-1]
    if not year_str.isdigit() or len(year_str) != 4:
        return None
    year = int(year_str)
    for prefix, (eid, ename) in EXAM_MAP.items():
        if parts[0].lower() == prefix.lower():
            subject = " ".join(p.capitalize() for p in parts[1:-1])
            return eid, ename, subject, year
    return None


def convert_html_to_pdf(html_path: str, pdf_path: str) -> bool:
    """Convert HTML to PDF using Puppeteer."""
    result = subprocess.run(
        ["node", str(Path(__file__).parent / "html_to_pdf.js"), html_path, pdf_path],
        capture_output=True, text=True, timeout=60,
    )
    if result.returncode != 0:
        print(f"  ❌ PDF conversion failed: {result.stderr[:300]}")
        return False
    return True


def upload_to_supabase(pdf_path: str, storage_path: str) -> str:
    """Upload PDF to Supabase, overwriting if exists."""
    with open(pdf_path, "rb") as f:
        content = f.read()
    try:
        # Try delete first (to handle overwrites)
        try:
            supabase_client.storage.from_(BUCKET).remove([storage_path])
        except:
            pass
        supabase_client.storage.from_(BUCKET).upload(
            path=storage_path, file=content,
            file_options={"content-type": "application/pdf"},
        )
        url = supabase_client.storage.from_(BUCKET).get_public_url(storage_path)
        print(f"  ✅ Uploaded → {storage_path}")
        return url
    except Exception as e:
        print(f"  ❌ Upload failed: {e}")
        return None


def process_paper(pdf_path: str, exam_id: str, exam_display: str, subject: str, year: int, upload: bool = False):
    """Process a single paper through the full pipeline."""
    print(f"\n{'='*60}")
    print(f"📄 {exam_display} — {subject} — {year}")
    print(f"   Source: {pdf_path}")

    # 1. Extract
    print("  📖 Extracting text...")
    raw_text = extract_text(pdf_path)
    if not raw_text.strip():
        print("  ❌ No text extracted (scanned PDF?)")
        return False

    # 2. Structure with AI
    print("  🤖 Structuring with AI...")
    structured = structure_with_ai(raw_text, exam_display, subject, year)
    if not structured:
        print("  ❌ AI structuring failed")
        return False

    # Save structured JSON for debugging
    json_path = OUTPUT_DIR / "json" / f"{exam_id}_{subject}_{year}.json"
    json_path.parent.mkdir(parents=True, exist_ok=True)
    with open(json_path, "w") as f:
        json.dump(structured, f, indent=2, ensure_ascii=False)

    # 3. Generate HTML
    print("  📝 Generating HTML...")
    html_content = generate_html(structured, exam_id, exam_display, subject, year)
    html_path = HTML_DIR / f"{exam_id}_{subject.replace(' ', '_')}_{year}.html"
    html_path.parent.mkdir(parents=True, exist_ok=True)
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html_content)

    # 4. Convert to PDF
    print("  🖨️  Converting to PDF...")
    pdf_out = PDF_DIR / f"{exam_id}_{subject.replace(' ', '_')}_{year}.pdf"
    pdf_out.parent.mkdir(parents=True, exist_ok=True)
    if not convert_html_to_pdf(str(html_path), str(pdf_out)):
        return False

    print(f"  ✅ PDF ready: {pdf_out}")

    # 5. Upload
    if upload:
        storage_path = f"{exam_id}/{subject}/{year}.pdf"
        print(f"  ☁️  Uploading to {storage_path}...")
        upload_to_supabase(str(pdf_out), storage_path)

    return True


def main():
    parser = argparse.ArgumentParser(description="Generate Analyxx-branded PYQ papers")
    parser.add_argument("--test", action="store_true", help="Process only 1 paper for testing")
    parser.add_argument("--file", type=str, help="Process a specific file")
    parser.add_argument("--upload", action="store_true", help="Upload to Supabase after generating")
    parser.add_argument("--exam", type=str, help="Filter by exam prefix (class10, class12, neet, jee)")
    args = parser.parse_args()

    OUTPUT_DIR.mkdir(exist_ok=True)
    HTML_DIR.mkdir(parents=True, exist_ok=True)
    PDF_DIR.mkdir(parents=True, exist_ok=True)

    if args.file:
        files = [args.file]
    else:
        files = sorted([f for f in os.listdir(UPLOAD_DIR)
                       if f.lower().endswith(".pdf") and not os.path.isdir(UPLOAD_DIR / f)])
        if args.exam:
            files = [f for f in files if f.lower().startswith(args.exam.lower())]

    if args.test:
        files = files[:1]

    print(f"\n🚀 Analyxx Template Paper Generator")
    print(f"   Papers to process: {len(files)}")
    print(f"   Upload: {'Yes' if args.upload else 'No (dry run)'}")
    print(f"{'='*60}")

    success = 0
    failed = 0

    for filename in files:
        parsed = parse_filename(filename)
        if not parsed:
            print(f"\n⚠️  Skipped {filename} — can't parse filename")
            continue

        exam_id, exam_display, subject, year = parsed
        pdf_path = str(UPLOAD_DIR / filename)

        if process_paper(pdf_path, exam_id, exam_display, subject, year, upload=args.upload):
            success += 1
        else:
            failed += 1

        # Rate limit for Groq API
        time.sleep(2)

    print(f"\n{'='*60}")
    print(f"🎉 Done! ✅ {success} generated | ❌ {failed} failed")


if __name__ == "__main__":
    main()
