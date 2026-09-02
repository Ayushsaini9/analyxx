"""
Analyze router — cross-year AI pattern analysis.

Endpoints:
  GET  /exams           → list exams with paper counts
  GET  /subjects        → list subjects for a given exam
  POST /                → run multi-year Gemini analysis
"""

import os
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, Request, Depends
from pydantic import BaseModel
from sqlalchemy import func, distinct, and_
from sqlalchemy.orm import Session

from app.database import SessionLocal, get_db
from app.models.library_paper import LibraryPaper
from app.rate_limiter import limiter, AI_RATE
from app.deps import get_current_user_id
from app.subscription_guard import _get_active_plan, is_pro

logger = logging.getLogger(__name__)

router = APIRouter()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# ── System prompt for cross-year analysis ──────────────────────────────────────
SYSTEM_PROMPT = """You are an expert exam pattern analyst for Indian competitive and university examinations.

You have been given MULTIPLE years of question papers for the SAME subject and exam. Your job is to find patterns ACROSS years — not summarise any single paper.

A student needs to know: given everything that has appeared before, what is most likely to appear next? Give them analysis they cannot get by reading the papers themselves.

STRICT RULES:
- Never list questions from any paper as predictions.
- Never give generic advice like "practice regularly".
- Base every claim on cross-year evidence. If you say a topic is overdue, name the last year it appeared.
- Be honest about confidence levels. Do not fake precision.

OUTPUT FORMAT — follow exactly:

## Papers Analysed
List each paper: [Subject] [Year] [Total Marks] [Parts]
Note any format changes between years.

## Topic Frequency Table
For every major topic found across all papers:
| Topic | Years Appeared | Total Marks (cumulative) | Avg Marks/Year | Last Seen |
Sort by Total Marks highest first.

## Trend Classification
Classify every topic into one of four categories:

CONSISTENT CORE — appeared in 3+ consecutive years, high marks every time. Student must master these completely.

CYCLICAL — appears every 2-3 years in a pattern.
State the pattern: "Appeared 2021, 2023 — likely 2025"

EMERGING — appeared for the first time in the most recent 1-2 papers.
May indicate syllabus shift or examiner preference change.

DECLINING — used to appear regularly, has not appeared in last 2 years.
Low priority.

## Top 7 High-Probability Topics for Next Exam
For each topic:
[Topic Name] — Confidence: High / Medium / Low
- Evidence: appeared in X out of Y papers, Z total marks
- Pattern: describe the trend clearly
- Typical question type: MCQ / derivation / numerical / case-based
- Typical marks: X marks in Part-B / Y marks in Part-C
- What to prepare: specific subtopics based on how it was asked before

## Topics Overdue for Appearance
Topics that appeared consistently but skipped the last 1-2 years.
For each: last appearance year, marks it carried, why it may return.

## Topics to Deprioritise
Topics that appeared only once, carried low marks, or are declining.
Tell the student it is low ROI to spend significant time here.

## Marks Distribution Shift
Has the paper become harder or easier over time?
Has any part (A/B/C) grown or shrunk in marks weight?
Has the question style shifted from recall to application?

## Personalised Priority Study Plan
Build a day-by-day plan.
Rules:
- Allocate days proportional to predicted marks weight
- Sequence topics from foundational to advanced
- Name specific subtopics to cover each day from paper content only
- Build in 2 buffer days per week for revision
- Final 7 days: past paper practice only, no new content

## Honest Confidence Statement
One short paragraph:
- How many years of data this is based on
- What would increase prediction confidence
- Any syllabus changes the student should independently verify
- One thing this AI analysis cannot tell them that a human expert could"""


# ── Free-tier system prompt (limited analysis) ─────────────────────────────────
FREE_SYSTEM_PROMPT = """You are an expert exam pattern analyst for Indian competitive and university examinations.

You have been given MULTIPLE years of question papers for the SAME subject and exam. Provide a basic free-tier analysis.

STRICT RULES:
- Never list questions from any paper as predictions.
- Never give generic advice like "practice regularly".
- Base every claim on cross-year evidence.
- Be honest about confidence levels.

OUTPUT FORMAT — follow exactly:

## Papers Analysed
List each paper: [Subject] [Year] [Total Marks] [Parts]

## Topic Frequency Table
For every major topic found across all papers:
| Topic | Years Appeared | Total Marks (cumulative) | Avg Marks/Year | Last Seen |
Sort by Total Marks highest first.

## Top 5 High-Probability Topics for Next Exam
For each topic:
[Topic Name] — Confidence: High / Medium / Low
- Evidence: appeared in X out of Y papers, Z total marks
- Pattern: describe the trend clearly

Keep the response focused on the above sections only. Do not include study plans, marks distribution analysis, or deprioritisation advice — those are available in the Pro analysis."""


# ── Schemas ────────────────────────────────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    exam: str
    subject: str


# ── Helpers ────────────────────────────────────────────────────────────────────

def _get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _db_session():
    """Non-generator DB session for simple use."""
    return SessionLocal()


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("/exams")
def list_exams():
    """List all exams with paper counts."""
    db = _db_session()
    try:
        results = (
            db.query(
                LibraryPaper.exam,
                func.count(LibraryPaper.id).label("papers"),
                func.count(distinct(LibraryPaper.subject)).label("subjects"),
            )
            .filter(LibraryPaper.extraction_status == "done")
            .group_by(LibraryPaper.exam)
            .all()
        )
        return [
            {"exam": r.exam, "papers": r.papers, "subjects": r.subjects}
            for r in results
        ]
    finally:
        db.close()


@router.get("/subjects")
def list_subjects(exam: str = Query(..., description="Exam name, e.g. RTU")):
    """List all subjects available for a given exam."""
    db = _db_session()
    try:
        results = (
            db.query(
                LibraryPaper.subject,
                func.count(LibraryPaper.id).label("papers"),
                func.count(distinct(LibraryPaper.year)).label("years"),
            )
            .filter(
                and_(
                    LibraryPaper.exam == exam,
                    LibraryPaper.extraction_status == "done",
                    LibraryPaper.text.isnot(None),
                    LibraryPaper.text != "",
                )
            )
            .group_by(LibraryPaper.subject)
            .order_by(LibraryPaper.subject)
            .all()
        )
        return [
            {"subject": r.subject, "years": r.years, "papers": r.papers}
            for r in results
        ]
    finally:
        db.close()


@router.get("/papers-preview")
def papers_preview(
    exam: str = Query(...),
    subject: str = Query(...),
):
    """Preview the papers that will be analysed for a given exam + subject."""
    db = _db_session()
    try:
        papers = (
            db.query(LibraryPaper)
            .filter(
                and_(
                    LibraryPaper.exam == exam,
                    LibraryPaper.subject == subject,
                    LibraryPaper.extraction_status == "done",
                    LibraryPaper.text.isnot(None),
                    LibraryPaper.text != "",
                )
            )
            .order_by(LibraryPaper.year.asc())
            .all()
        )
        return [
            {
                "subject": p.subject,
                "year": p.year,
                "branch": p.branch,
                "semester": p.semester,
                "total_marks": p.total_marks,
                "text_length": len(p.text) if p.text else 0,
            }
            for p in papers
        ]
    finally:
        db.close()


@router.post("/")
@limiter.limit(AI_RATE)
def run_analysis(request: Request, body: AnalyzeRequest):
    """Run cross-year AI pattern analysis on all papers for exam + subject."""
    # Optional auth — determine plan without requiring login
    plan = "free"
    try:
        auth_header = request.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1]
            from app.database import supabase
            response = supabase.auth.get_user(token)
            if response and response.user:
                user_id = str(response.user.id)
                db_auth = SessionLocal()
                try:
                    plan = _get_active_plan(user_id, db_auth)
                finally:
                    db_auth.close()
    except Exception:
        plan = "free"

    db = _db_session()
    try:
        papers = (
            db.query(LibraryPaper)
            .filter(
                and_(
                    LibraryPaper.exam == body.exam,
                    LibraryPaper.subject == body.subject,
                    LibraryPaper.extraction_status == "done",
                    LibraryPaper.text.isnot(None),
                    LibraryPaper.text != "",
                )
            )
            .order_by(LibraryPaper.year.asc())
            .all()
        )

        if not papers:
            raise HTTPException(
                status_code=404,
                detail=f"No papers found for {body.exam} — {body.subject}",
            )

        # ── Build combined text block ──
        combined_parts = []
        papers_info = []
        for p in papers:
            combined_parts.append(
                f"--- {p.subject} {p.year} PAPER ---\n{p.text}\n"
            )
            papers_info.append({
                "subject": p.subject,
                "year": p.year,
                "branch": p.branch,
                "semester": p.semester,
            })

        combined_text = "\n".join(combined_parts)

        # ── Truncate to fit Groq free-tier limits ──
        # Groq free tier: 12k TPM for llama-3.3-70b-versatile
        # Budget: system prompt ~1500 tokens + response 3000 tokens = 4500
        # Leaves ~7500 tokens for user prompt ≈ 30000 chars
        # Subtract prompt overhead (~200 chars) → ~29000 chars for paper text
        MAX_TEXT_BUDGET = 28000  # chars for all papers combined
        total_text_len = sum(len(p.text or "") for p in papers)

        if total_text_len > MAX_TEXT_BUDGET:
            chars_per_paper = max(1500, MAX_TEXT_BUDGET // len(papers))
            truncated_parts = []
            for p in papers:
                paper_text = (p.text or "")[:chars_per_paper]
                if len(p.text or "") > chars_per_paper:
                    paper_text += "\n[...truncated]"
                truncated_parts.append(
                    f"--- {p.subject} {p.year} ---\n{paper_text}\n"
                )
            combined_text = "\n".join(truncated_parts)
            logger.info(
                "Truncated %d papers: %d → %d chars (%d/paper)",
                len(papers), total_text_len, len(combined_text), chars_per_paper,
            )

        # ── Call Groq ──
        user_prompt = (
            f"Analyse these {len(papers)} question papers for "
            f"{body.exam} — {body.subject} "
            f"({papers[0].year}–{papers[-1].year}):\n\n"
            f"{combined_text}"
        )

        try:
            from groq import Groq

            client = Groq(api_key=GROQ_API_KEY)
            model = "llama-3.3-70b-versatile"
            logger.info("Calling %s with %d chars user prompt", model, len(user_prompt))

            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT if is_pro(plan) else FREE_SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                max_tokens=3000 if is_pro(plan) else 1500,
                temperature=0.3,
            )
            analysis = response.choices[0].message.content

            if not is_pro(plan):
                analysis += "\n\n---\n\n\ud83d\udd12 **Upgrade to Pro** for the complete analysis \u2014 including all 7+ predicted topics, overdue topic alerts, marks distribution trends, personalised study plan, and confidence statements. [Go Pro \u2192](/billing)"

            logger.info("Success \u2014 %d chars response", len(analysis))

        except HTTPException:
            raise
        except Exception as e:
            logger.error("Groq API error: %s", e)
            raise HTTPException(
                status_code=500,
                detail="AI analysis failed. Please try again.",
            )

        return {
            "analysis": analysis,
            "papers_analyzed": papers_info,
            "exam": body.exam,
            "subject": body.subject,
            "year_range": f"{papers[0].year}–{papers[-1].year}",
            "total_papers": len(papers),
            "status": "success",
        }
    finally:
        db.close()

