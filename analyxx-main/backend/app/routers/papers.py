from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.database import get_db, supabase, r2_client, R2_BUCKET_NAME, R2_PUBLIC_URL
from app.models.papers import Paper
from app.analyzer import analyze_paper
from app.rate_limiter import limiter, UPLOAD_RATE, AI_RATE
from app.deps import get_current_user_id as get_current_user
from app.subscription_guard import (
    check_paper_upload_limit,
    get_user_plan,
    check_pro_required,
    is_pro,
    FREE_PREDICTION_LIMIT,
)
import os, uuid, tempfile, base64, re, io, copy
from typing import List


# ── Security constants ──
MAX_PDF_BYTES = 20 * 1024 * 1024   # 20 MB
MAX_IMAGE_BYTES = 10 * 1024 * 1024  # 10 MB
PDF_MAGIC = b"%PDF"  # First 4 bytes of every valid PDF

# Allowed image types (block SVG — can carry XSS payloads)
ALLOWED_IMAGE_TYPES = {"image/png", "image/jpeg", "image/gif", "image/webp", "image/bmp"}

# Magic-byte signatures for allowed image formats
IMAGE_MAGIC_SIGS = [
    (b"\x89PNG", "image/png"),
    (b"\xff\xd8\xff", "image/jpeg"),
    (b"GIF87a", "image/gif"),
    (b"GIF89a", "image/gif"),
    (b"RIFF", "image/webp"),  # WebP starts with RIFF...WEBP
    (b"BM", "image/bmp"),
]

# ── Security helpers ──
def _sanitize_filename(filename: str) -> str:
    """Remove path traversal and unsafe characters from filename."""
    # Take only the basename (strip directory traversal)
    filename = filename.split("/")[-1].split("\\")[-1]
    # Allow only alphanumeric, dashes, underscores, dots
    filename = re.sub(r"[^\w.\-]", "_", filename)
    return filename[:200] or "upload.pdf"


def _sanitize_prompt_input(value: str, max_length: int = 200) -> str:
    """Sanitize user input before embedding in LLM prompts."""
    value = value.strip()[:max_length]
    # Remove control characters
    value = re.sub(r"[\x00-\x1f\x7f]", "", value)
    return value

def _pdf_pages_to_base64(pdf_bytes: bytes, max_pages: int = 3, dpi: int = 150) -> list[str]:
    """Convert PDF pages to base64-encoded PNG images for vision analysis."""
    import fitz
    images = []
    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        for i, page in enumerate(doc):
            if i >= max_pages:
                break
            pix = page.get_pixmap(dpi=dpi)
            img_bytes = pix.tobytes("png")
            b64 = base64.b64encode(img_bytes).decode("utf-8")
            images.append(b64)
        doc.close()
    except Exception as e:
        print(f"PDF to image conversion error: {e}")
    return images


router = APIRouter()
BUCKET_NAME = "pyq-papers"


# ── Prediction truncation helpers ──
def _truncate_predictions_in_paper(paper):
    """Return a dict copy of the paper with predictions truncated for free users."""
    data = {
        "id": paper.id,
        "user_id": paper.user_id,
        "exam_name": paper.exam_name,
        "years": paper.years,
        "filename": paper.filename,
        "file_size": paper.file_size,
        "file_url": paper.file_url,
        "status": paper.status,
        "created_at": paper.created_at,
        "extracted_text": paper.extracted_text,
        "analysis_result": paper.analysis_result,
    }
    if data["analysis_result"] and isinstance(data["analysis_result"], dict):
        ar = copy.deepcopy(data["analysis_result"])
        if "predictions" in ar and isinstance(ar["predictions"], list):
            ar["predictions"] = ar["predictions"][:FREE_PREDICTION_LIMIT]
            ar["predictions_truncated"] = True
            ar["predictions_limit"] = FREE_PREDICTION_LIMIT
        data["analysis_result"] = ar
    return data


def _truncate_predictions_in_papers(papers):
    """Return a list of paper dicts with predictions truncated."""
    return [_truncate_predictions_in_paper(p) for p in papers]


@router.post("/upload")
@limiter.limit(UPLOAD_RATE)
async def upload_paper(
    request: Request,
    file: UploadFile = File(...),
    exam_name: str = Form(...),
    years: str = Form(...),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
    _limit: None = Depends(check_paper_upload_limit),
):
    # ── 1. MIME-type check (client-supplied, first line of defence) ──
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are allowed.")

    # ── 2. Size-limited read (prevents memory exhaustion) ──
    content = await file.read(MAX_PDF_BYTES + 1)
    if len(content) > MAX_PDF_BYTES:
        raise HTTPException(status_code=400, detail="File too large. Max 20 MB.")

    # ── 3. Magic-byte validation (rejects spoofed Content-Type) ──
    if not content[:4].startswith(PDF_MAGIC):
        raise HTTPException(
            status_code=400,
            detail="Invalid PDF file. The uploaded file is not a valid PDF.",
        )

    paper_id = str(uuid.uuid4())[:8]
    safe_name = _sanitize_filename(file.filename)
    filename = f"{user_id}/{paper_id}_{safe_name}"

    # Upload to storage (R2 with Supabase Storage fallback)
    uploaded_to_r2 = False
    public_url = ""
    try:
        if r2_client:
            r2_client.put_object(
                Bucket=R2_BUCKET_NAME,
                Key=f"pyq-papers/{filename}",
                Body=content,
                ContentType="application/pdf",
            )
            public_url = f"{R2_PUBLIC_URL.rstrip('/')}/pyq-papers/{filename}"
            uploaded_to_r2 = True
            print(f"✅ Uploaded to R2: {filename}")
    except Exception as e:
        print(f"⚠️ R2 upload failed, trying Supabase Storage: {e}")

    if not uploaded_to_r2:
        try:
            # Upload to Supabase Storage 'pyq-papers' bucket
            supabase.storage.from_("pyq-papers").upload(
                path=filename,
                file=content,
                file_options={"content-type": "application/pdf"},
            )
            # Get public URL
            public_url = supabase.storage.from_("pyq-papers").get_public_url(filename)
            print(f"✅ Uploaded to Supabase Storage: {filename}")
        except Exception as e:
            print(f"Upload error (Supabase): {e}")
            raise HTTPException(
                status_code=500,
                detail="File upload failed. Please try again.",
            )

    # Run AI Analysis
    print(f"🔍 Analyzing: {file.filename}")
    try:
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
            tmp.write(content)
            tmp_path = tmp.name
        analysis = analyze_paper(tmp_path)
        os.unlink(tmp_path)
    except Exception as e:
        print(f"⚠️ Analysis error: {e}")
        analysis = {"status": "error", "predictions": [], "topics_found": 0}

    analysis_state = analysis.get("status")
    if analysis_state == "success":
        status = "analyzed"
    elif analysis_state == "unreadable":
        status = "unreadable"
    else:
        status = "uploaded"
    print(f"✅ Done: {analysis.get('topics_found', 0)} topics found, status={status}")

    paper = Paper(
        id=paper_id,
        user_id=user_id,
        exam_name=exam_name,
        years=years,
        filename=filename,
        file_size=len(content),
        file_url=public_url,
        status=status,
        analysis_result=analysis,
        extracted_text=analysis.get("raw_text", "")[:10000],
    )
    db.add(paper)
    db.commit()
    db.refresh(paper)

    return {
        "message": analysis.get("message", "Paper uploaded and analyzed!"),
        "paper_id": paper_id,
        "exam_name": exam_name,
        "years": years,
        "file_url": public_url,
        "status": status,
        "topics_found": analysis.get("topics_found", 0),
    }


@router.get("/list")
def list_papers(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
    plan: str = Depends(get_user_plan),
):
    papers = db.query(Paper).filter(Paper.user_id == user_id).order_by(Paper.created_at.desc()).all()
    if not is_pro(plan):
        return _truncate_predictions_in_papers(papers)
    return papers


@router.get("/{paper_id}")
def get_paper(
    paper_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
    plan: str = Depends(get_user_plan),
):
    paper = db.query(Paper).filter(Paper.id == paper_id, Paper.user_id == user_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found.")
    if not is_pro(plan):
        return _truncate_predictions_in_paper(paper)
    return paper


@router.post("/{paper_id}/ai-summary")
@limiter.limit(AI_RATE)
def generate_ai_summary(
    request: Request,
    paper_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
    plan: str = Depends(get_user_plan),
):
    paper = db.query(Paper).filter(Paper.id == paper_id, Paper.user_id == user_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found.")
    if not paper.analysis_result:
        raise HTTPException(status_code=400, detail="Paper not yet analyzed.")

    # Get raw extracted text — this is the actual PDF content
    raw_text = (paper.extracted_text or "").strip()

    # Determine if this is a scanned/image-based PDF
    is_scanned = (
        paper.analysis_result.get("status") == "unreadable"
        or not raw_text
        or len(raw_text) < 50
    )

    if is_scanned:
        # ── Vision-based fallback for scanned PDFs ──
        print(f"📸 Scanned PDF detected — using vision analysis for paper {paper_id}")
        try:
            pdf_bytes = None
            if r2_client:
                try:
                    response = r2_client.get_object(Bucket=R2_BUCKET_NAME, Key=f"pyq-papers/{paper.filename}")
                    pdf_bytes = response["Body"].read()
                except Exception as e:
                    print(f"⚠️ R2 read failed, trying Supabase Storage: {e}")

            if not pdf_bytes:
                try:
                    pdf_bytes = supabase.storage.from_("pyq-papers").download(paper.filename)
                except Exception as e:
                    print(f"❌ Supabase read failed: {e}")
                    raise RuntimeError(f"Could not retrieve PDF bytes from any storage provider: {e}")

            page_images = _pdf_pages_to_base64(pdf_bytes, max_pages=3)
            if not page_images:
                raise HTTPException(
                    status_code=400,
                    detail="Could not process this PDF. Please try uploading a clearer copy.",
                )

            year_label = (paper.years or "").strip() or "year unspecified"
            safe_exam = _sanitize_prompt_input(paper.exam_name)
            safe_year = _sanitize_prompt_input(year_label)

            if is_pro(plan):
                vision_prompt = f"""You are an expert exam analyst. A student uploaded a previous year question paper (PYQ) for: "{safe_exam}" ({safe_year}).

IMPORTANT: Look at the images carefully. They contain pages from a question paper. Read ALL the text visible in the images.

Based on what you can see, provide a detailed analysis:

## 📊 Paper Overview
What specific subject/topics does this paper cover? Summarize the actual questions/content visible.

## 🔥 High Probability Questions (Based on This Paper)
Based on the patterns in THIS paper, what specific questions or question types are most likely to repeat? Give 5-10 actual questions derived from what you see.

## ⭐ Most Important Topics (Study These First)
Rank the specific topics found in THIS paper by importance. Reference actual questions from the images.

## 📝 Smart Study Tips
3-4 specific tips tailored to the actual content of this paper.

## 🗺️ Study Roadmap
A time-based plan to cover the specific material found in this paper.

REMINDER: Be specific to the ACTUAL content visible in the images. Do not give generic advice. If you cannot read parts clearly, mention that.
MATH FORMATTING: For ALL mathematical expressions, use LaTeX with dollar-sign delimiters: $x^2$ for inline math and $$\frac{{a}}{{b}}$$ for display math. NEVER use \( \) or \[ \] delimiters."""
            else:
                vision_prompt = f"""You are an expert exam analyst. A student uploaded a previous year question paper (PYQ) for: "{safe_exam}" ({safe_year}).

Look at the images carefully. They contain pages from a question paper. Read the text visible in the images.

Provide a BASIC analysis (this is a free-tier analysis):

## 📊 Paper Overview
What specific subject/topics does this paper cover? Give a brief summary of the topics and question areas.

## ⭐ Key Topics Found
List the main topics identified in this paper (no detailed ranking or importance analysis).

Keep the response concise. Do not provide predictions, study tips, or study roadmaps — those are available in the full Pro analysis.
MATH FORMATTING: For ALL mathematical expressions, use LaTeX with dollar-sign delimiters: $x^2$ for inline math and $$\frac{{a}}{{b}}$$ for display math. NEVER use \( \) or \[ \] delimiters."""

            content_parts = [{"type": "text", "text": vision_prompt}]
            for b64_img in page_images:
                content_parts.append({
                    "type": "image_url",
                    "image_url": {"url": f"data:image/png;base64,{b64_img}"}
                })

            from groq import Groq
            client = Groq(api_key=os.getenv("GROQ_API_KEY"))
            response = client.chat.completions.create(
                model="meta-llama/llama-4-scout-17b-16e-instruct",
                messages=[{"role": "user", "content": content_parts}],
                max_tokens=2048,
            )
            summary = response.choices[0].message.content
            if not is_pro(plan):
                summary += "\n\n---\n\n🔒 **Upgrade to Pro** for the full analysis — including high-probability predictions, importance rankings, smart study tips, and a personalised study roadmap. [Go Pro →](/billing)"
            return {"summary": summary, "status": "success"}
        except HTTPException:
            raise
        except Exception as e:
            print(f"❌ Vision analysis error: {e}")
            raise HTTPException(status_code=500, detail="AI analysis failed. Please try again.")

    print(f"📄 Extracted {len(raw_text)} chars from paper {paper_id}")
    print(f"📄 First 200 chars: {raw_text[:200]}")

    year_label = (paper.years or "").strip() or "year unspecified"

    # Sanitize user-controlled inputs before embedding in prompt
    safe_exam = _sanitize_prompt_input(paper.exam_name)
    safe_year = _sanitize_prompt_input(year_label)
    safe_text = raw_text[:4000]

    if is_pro(plan):
        prompt = f"""You are an expert exam analyst. A student uploaded a previous year question paper (PYQ) for: "{safe_exam}" ({safe_year}).

IMPORTANT: Below is the ACTUAL TEXT extracted from the uploaded PDF. You MUST analyze THIS specific content. Do NOT give generic advice. Every prediction, question, and tip MUST be based on the actual content below.

--- START OF EXTRACTED PDF CONTENT ---
{safe_text}
--- END OF EXTRACTED PDF CONTENT ---

Based ONLY on the actual content above, provide a detailed analysis:

## 📊 Paper Overview
What specific subject/topics does this paper cover? Summarize the actual questions/content found in the paper.

## 🔥 High Probability Questions (Based on This Paper)
Based on the patterns in THIS paper, what specific questions or question types are most likely to repeat? Give 5-10 actual questions derived from the content above.

## ⭐ Most Important Topics (Study These First)
Rank the specific topics found in THIS paper by importance. Reference actual questions from the paper.

## 📝 Smart Study Tips
3-4 specific tips tailored to the actual content of this paper.

## 🗺️ Study Roadmap
A time-based plan to cover the specific material found in this paper.

REMINDER: Be specific to the ACTUAL content extracted from the PDF above. Do not give generic advice.
MATH FORMATTING: For ALL mathematical expressions, use LaTeX with dollar-sign delimiters: $x^2$ for inline math and $$\frac{{a}}{{b}}$$ for display math. NEVER use \( \) or \[ \] delimiters."""
    else:
        prompt = f"""You are an expert exam analyst. A student uploaded a previous year question paper (PYQ) for: "{safe_exam}" ({safe_year}).

Below is the text extracted from the uploaded PDF. Analyze this content.

--- START OF EXTRACTED PDF CONTENT ---
{safe_text}
--- END OF EXTRACTED PDF CONTENT ---

Provide a BASIC analysis (this is a free-tier analysis):

## 📊 Paper Overview
What specific subject/topics does this paper cover? Give a brief summary of the topics and question areas found.

## ⭐ Key Topics Found
List the main topics identified in this paper (no detailed ranking or importance analysis).

Keep the response concise. Do not provide predictions, study tips, or study roadmaps — those are available in the full Pro analysis.
MATH FORMATTING: For ALL mathematical expressions, use LaTeX with dollar-sign delimiters: $x^2$ for inline math and $$\frac{{a}}{{b}}$$ for display math. NEVER use \( \) or \[ \] delimiters."""

    try:
        from groq import Groq
        client = Groq(api_key=os.getenv("GROQ_API_KEY"))
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=2048,
        )
        summary = response.choices[0].message.content
        if not is_pro(plan):
            summary += "\n\n---\n\n🔒 **Upgrade to Pro** for the full analysis — including high-probability predictions, importance rankings, smart study tips, and a personalised study roadmap. [Go Pro →](/billing)"
        return {"summary": summary, "status": "success"}
    except Exception as e:
        print(f"AI summary error: {e}")
        raise HTTPException(status_code=500, detail="AI analysis failed. Please try again.")


@router.post("/analyze-image")
@limiter.limit(AI_RATE)
async def analyze_image(
    request: Request,
    file: UploadFile = File(...),
    exam_name: str = Form("General Exam"),
    message: str = Form(""),
    user_id: str = Depends(get_current_user),
    _limit: None = Depends(check_paper_upload_limit),
):
    """Analyze an image of a question paper using Groq's vision model."""
    # ── 1. Restrict to safe raster image types (block SVG/XSS vectors) ──
    if not file.content_type or file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Only image files are allowed (PNG, JPEG, GIF, WebP, BMP). Got: {file.content_type}",
        )

    # ── 2. Size-limited read ──
    content = await file.read(MAX_IMAGE_BYTES + 1)
    if len(content) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=400, detail="Image too large. Max 10 MB.")

    # ── 3. Magic-byte validation ──
    header = content[:8]
    if not any(header.startswith(sig) for sig, _ in IMAGE_MAGIC_SIGS):
        raise HTTPException(
            status_code=400,
            detail="Invalid image file. The uploaded file does not appear to be a valid image.",
        )

    # Convert image to base64
    b64_image = base64.b64encode(content).decode("utf-8")
    mime_type = file.content_type or "image/png"

    # Sanitize user-controlled inputs before embedding in prompt
    safe_exam = _sanitize_prompt_input(exam_name)
    safe_message = _sanitize_prompt_input(message, max_length=500).strip()

    print(f"🖼️ Analyzing image: {file.filename} ({len(content)} bytes, {mime_type}), message: '{safe_message}'")

    # ── Build the prompt based on whether the user asked a specific question ──
    if safe_message:
        # User asked a specific question about the image
        prompt = f"""You are an expert exam tutor and study assistant. A student uploaded an image from a question paper ("{safe_exam}") and asked the following:

"{safe_message}"

INSTRUCTIONS:
1. Look at the image carefully and read ALL the text visible.
2. Directly answer the student's question/request based on what you see in the image.
3. If the student asks to answer or solve a specific question, provide a clear, step-by-step solution with the correct answer.
4. If the student asks to explain a concept from the image, explain it thoroughly.
5. Be specific to the ACTUAL content in the image. If you cannot read parts of the image clearly, mention that.
6. Format your response in clean markdown with proper headings where appropriate.
7. For ALL mathematical expressions, formulas, and scientific notation, use LaTeX with dollar-sign delimiters: $x^2$ for inline math and $$\\frac{{a}}{{b}}$$ for display math. NEVER use \\( \\) or \\[ \\] delimiters."""
    else:
        # No specific question — do full paper analysis
        prompt = f"""You are an expert exam analyst. A student uploaded an image of a previous year question paper (PYQ) for: "{safe_exam}".

IMPORTANT: Look at the image carefully. It contains a question paper or exam content. Read ALL the text visible in the image.

Based on what you can see in the image, provide a detailed analysis:

## Paper Overview
What specific subject/topics does this paper cover? Summarize the actual questions/content visible in the image.

## High Probability Questions (Based on This Paper)
Based on the patterns in THIS paper, what specific questions or question types are most likely to repeat? Give 5-10 actual questions derived from what you see.

## Most Important Topics (Study These First)
Rank the specific topics found in THIS paper by importance. Reference actual questions from the image.

## Smart Study Tips
3-4 specific tips tailored to the actual content of this paper.

## Study Roadmap
A time-based plan to cover the specific material found in this paper.

REMINDER: Be specific to the ACTUAL content visible in the image. Do not give generic advice. If you cannot read the image clearly, say so.
MATH FORMATTING: For ALL mathematical expressions, use LaTeX with dollar-sign delimiters: $x^2$ for inline math and $$\\frac{{a}}{{b}}$$ for display math. NEVER use \\( \\) or \\[ \\] delimiters."""

    try:
        from groq import Groq
        client = Groq(api_key=os.getenv("GROQ_API_KEY"))
        response = client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=[{
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{mime_type};base64,{b64_image}"
                        }
                    }
                ]
            }],
            max_tokens=2048,
        )
        summary = response.choices[0].message.content
        return {"summary": summary, "status": "success"}
    except Exception as e:
        print(f"❌ Vision AI error: {e}")
        raise HTTPException(status_code=500, detail="AI image analysis failed. Please try again.")


# ── PDF Export (Pro only) ──────────────────────────────────────────────────────


@router.post("/{paper_id}/export-pdf")
@limiter.limit(AI_RATE)
def export_paper_pdf(
    request: Request,
    paper_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
    _pro: str = Depends(check_pro_required),
):
    """Generate a PDF report of the paper analysis. Pro users only."""
    paper = db.query(Paper).filter(Paper.id == paper_id, Paper.user_id == user_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found.")
    if not paper.analysis_result:
        raise HTTPException(status_code=400, detail="Paper has not been analyzed yet. Please analyze the paper first.")

    analysis = paper.analysis_result or {}
    predictions = analysis.get("predictions", [])
    topics_found = analysis.get("topics_found", 0)
    raw_summary = analysis.get("message", "")

    from datetime import datetime, timezone

    try:
        from fpdf import FPDF

        class AnalyxxPDF(FPDF):
            def header(self):
                self.set_font("Helvetica", "B", 20)
                self.set_text_color(5, 150, 105)
                self.cell(0, 12, "ANALYXX AI", new_x="LMARGIN", new_y="NEXT")
                self.set_font("Helvetica", "", 9)
                self.set_text_color(107, 114, 128)
                self.cell(0, 5, "Paper Analysis Report  |  PRO", new_x="LMARGIN", new_y="NEXT")
                self.line(10, self.get_y() + 2, 200, self.get_y() + 2)
                self.ln(6)

            def footer(self):
                self.set_y(-20)
                self.set_font("Helvetica", "I", 8)
                self.set_text_color(156, 163, 175)
                gen_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
                self.cell(0, 5, f"Generated by ANALYXX AI on {gen_at}  -  analyxx.com", align="C", new_x="LMARGIN", new_y="NEXT")
                self.cell(0, 5, f"Page {self.page_no()}/{{nb}}", align="C")

        pdf = AnalyxxPDF()
        pdf.alias_nb_pages()
        pdf.add_page()
        pdf.set_auto_page_break(auto=True, margin=25)

        # Paper Metadata
        pdf.set_font("Helvetica", "B", 14)
        pdf.set_text_color(6, 95, 70)
        pdf.cell(0, 10, f"Exam: {paper.exam_name}", new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("Helvetica", "", 10)
        pdf.set_text_color(75, 85, 99)
        pdf.cell(0, 6, f"Year: {paper.years or 'N/A'}  |  Paper ID: {paper.id}  |  Topics Found: {topics_found}", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(4)

        # Analysis Summary
        if raw_summary:
            pdf.set_font("Helvetica", "B", 13)
            pdf.set_text_color(6, 78, 59)
            pdf.cell(0, 10, "Analysis Summary", new_x="LMARGIN", new_y="NEXT")
            pdf.set_font("Helvetica", "", 10)
            pdf.set_text_color(26, 26, 26)
            clean_text = raw_summary.replace("##", "").replace("**", "").replace("*", "")
            for line in clean_text.split("\n"):
                line = line.strip()
                if not line:
                    pdf.ln(3)
                    continue
                pdf.multi_cell(0, 5, line)
            pdf.ln(4)

        # Predictions Table
        if predictions:
            pdf.set_font("Helvetica", "B", 13)
            pdf.set_text_color(6, 78, 59)
            pdf.cell(0, 10, "Predictions", new_x="LMARGIN", new_y="NEXT")
            pdf.set_font("Helvetica", "B", 9)
            pdf.set_fill_color(240, 253, 244)
            pdf.set_text_color(6, 95, 70)
            pdf.cell(15, 8, "#", border=1, fill=True)
            pdf.cell(120, 8, "Topic", border=1, fill=True)
            pdf.cell(55, 8, "Confidence", border=1, fill=True, new_x="LMARGIN", new_y="NEXT")
            pdf.set_font("Helvetica", "", 9)
            pdf.set_text_color(26, 26, 26)
            for idx, pred in enumerate(predictions, 1):
                topic = pred if isinstance(pred, str) else pred.get("topic", str(pred))
                confidence = pred.get("confidence", "-") if isinstance(pred, dict) else "-"
                if len(topic) > 70:
                    topic = topic[:67] + "..."
                fill = idx % 2 == 0
                if fill:
                    pdf.set_fill_color(249, 250, 251)
                pdf.cell(15, 7, str(idx), border=1, fill=fill)
                pdf.cell(120, 7, topic, border=1, fill=fill)
                pdf.cell(55, 7, str(confidence), border=1, fill=fill, new_x="LMARGIN", new_y="NEXT")

        pdf_bytes = pdf.output()

    except ImportError:
        raise HTTPException(
            status_code=500,
            detail="PDF generation is temporarily unavailable. Please try again later.",
        )
    except Exception as e:
        print(f"PDF generation error: {e}")
        raise HTTPException(status_code=500, detail="PDF generation failed. Please try again.")

    safe_name = _sanitize_filename(f"analyxx_{paper.exam_name}_{paper.years}_{paper.id}.pdf")

    from fastapi.responses import Response
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{safe_name}"'},
    )



