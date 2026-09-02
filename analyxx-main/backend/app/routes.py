from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.papers import Paper
from app.analyzer import analyze_paper
from app.deps import get_current_user_id as get_current_user
import os, uuid, re

router = APIRouter()

UPLOAD_DIR = os.path.abspath("uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ── Security constants ──
MAX_UPLOAD_BYTES = 20 * 1024 * 1024  # 20 MB
PDF_MAGIC = b"%PDF"  # First 4 bytes of every valid PDF


def _sanitize_filename(filename: str) -> str:
    """Remove path traversal and unsafe characters from filename."""
    filename = filename.split("/")[-1].split("\\")[-1]
    filename = re.sub(r"[^\w.\-]", "_", filename)
    return filename[:200] or "upload.pdf"




@router.post("/upload")
async def upload_paper(
    file: UploadFile = File(...),
    exam_name: str = Form(...),
    years: str = Form(...),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    # ── 1. MIME-type check (client-supplied, first line of defence) ──
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are allowed.")

    # ── 2. Size-limited read (prevents memory exhaustion from oversized uploads) ──
    content = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=400, detail="File too large. Max 20 MB.")

    # ── 3. Magic-byte validation (rejects spoofed Content-Type headers) ──
    if not content[:4].startswith(PDF_MAGIC):
        raise HTTPException(
            status_code=400,
            detail="Invalid PDF file. The uploaded file is not a valid PDF.",
        )

    # ── 4. Safe filename + path confinement ──
    paper_id = str(uuid.uuid4())[:8]
    safe_name = _sanitize_filename(file.filename)
    filename = f"{paper_id}_{safe_name}"
    file_path = os.path.join(UPLOAD_DIR, filename)

    # Resolve and verify the path stays inside UPLOAD_DIR
    resolved = os.path.realpath(file_path)
    if not resolved.startswith(UPLOAD_DIR + os.sep):
        raise HTTPException(status_code=400, detail="Invalid filename.")

    with open(resolved, "wb") as f:
        f.write(content)

    # ── Run AI Analysis ──
    print(f"🔍 Analyzing paper: {filename}")
    analysis = analyze_paper(file_path)
    print(f"✅ Analysis done: {len(analysis.get('predictions', []))} topics found")

    # Save to DB
    paper = Paper(
        id=paper_id,
        user_id=user_id,
        exam_name=exam_name,
        years=years,
        filename=filename,
        file_size=len(content),
        status="analyzed" if analysis["status"] == "success" else "error",
        analysis_result=analysis,
    )
    db.add(paper)
    db.commit()
    db.refresh(paper)

    return {
        "message": "Paper uploaded and analyzed!",
        "paper_id": paper_id,
        "exam_name": exam_name,
        "years": years,
        "status": paper.status,
        "topics_found": analysis.get("topics_found", 0),
        "top_prediction": analysis.get("predictions", [{}])[0].get("topic", "N/A") if analysis.get("predictions") else "N/A",
    }


@router.get("/list")
def list_papers(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    papers = db.query(Paper).filter(Paper.user_id == user_id).order_by(Paper.created_at.desc()).all()
    return papers


@router.get("/{paper_id}")
def get_paper(
    paper_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    paper = db.query(Paper).filter(Paper.id == paper_id, Paper.user_id == user_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found.")
    return paper