"""
Auth router — profile management & paper requests.

Authentication (signup, login, OAuth) is handled entirely by Supabase Auth
on the frontend. This router only handles:
  - GET /me — quick auth check
  - GET /profile — full profile data
  - PUT /profile — update profile fields
  - POST /paper-request — create a paper request
  - GET /paper-requests — list all paper requests (admin)
"""

from fastapi import APIRouter, HTTPException, Depends, Header, BackgroundTasks, Request
from sqlalchemy.orm import Session
from app.database import get_db, supabase
from app.models.user import User
from app.deps import get_current_user, get_current_user_id
from app.rate_limiter import limiter, AUTH_RATE, DEFAULT_RATE
from datetime import date
from pydantic import BaseModel, EmailStr
from typing import Optional
import re
import os
import smtplib
from email.message import EmailMessage

router = APIRouter()

# --- Schemas ---
class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = None
    gender: Optional[str] = None
    date_of_birth: Optional[str] = None  # ISO format YYYY-MM-DD
    institution: Optional[str] = None
    school_name: Optional[str] = None
    college_email: Optional[str] = None
    exam_target: Optional[str] = None
    profile_picture: Optional[str] = None  # base64 or URL to profile picture

class OnboardingRequest(BaseModel):
    name: str
    exam_target: str
    referral_source: Optional[str] = None
    subscribed_to_emails: bool = False
    privacy_policy_accepted: bool = True

class PaperRequestCreate(BaseModel):
    exam: str
    examId: str
    year: int
    subject: Optional[str] = None

# --- Helpers for field updates ---
MAX_FIELD_LENGTHS = {
    "name": 255,
    "gender": 50,
    "institution": 255,
    "school_name": 255,
    "college_email": 320,
    "exam_target": 255,
    "referral_source": 100,
}

def _validate_length(field: str, value: str):
    limit = MAX_FIELD_LENGTHS.get(field, 255)
    if len(value) > limit:
        raise HTTPException(
            status_code=400,
            detail=f"{field} must be at most {limit} characters."
        )

def _update_optional_field(user: User, field: str, value: Optional[str]):
    if value is not None:
        if value == "":
            setattr(user, field, None)
        else:
            _validate_length(field, value)
            setattr(user, field, value)

def _profile_response(user: User) -> dict:
    """Build a consistent profile response dict."""
    # Existing users with profile_completed or exam_target set skip onboarding automatically
    is_onboarded = bool(user.onboarding_completed or user.profile_completed or user.exam_target)
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "gender": user.gender,
        "date_of_birth": str(user.date_of_birth) if user.date_of_birth else None,
        "institution": user.institution,
        "school_name": user.school_name,
        "college_email": user.college_email,
        "college_email_verified": user.college_email_verified,
        "exam_target": user.exam_target,
        "profile_completed": user.profile_completed,
        "profile_picture": user.profile_picture,
        "onboarding_completed": is_onboarded,
        "referral_source": user.referral_source,
        "subscribed_to_emails": user.subscribed_to_emails,
        "created_at": str(user.created_at) if user.created_at else None,
    }

# --- Routes ---

@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    """Returns basic info for the authenticated user."""
    return {
        "message": "Auth working!",
        "user_id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
    }

@router.get("/profile")
def get_profile(current_user: User = Depends(get_current_user)):
    """Return full profile data for the authenticated user."""
    return _profile_response(current_user)

@router.put("/profile")
def update_profile(
    req: ProfileUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update profile fields for the authenticated user."""
    # Name requires special handling — cannot be cleared to empty
    if req.name is not None:
        if req.name == "":
            raise HTTPException(status_code=400, detail="Name cannot be empty.")
        _validate_length("name", req.name)
        current_user.name = req.name

    _update_optional_field(current_user, "gender", req.gender)
    _update_optional_field(current_user, "institution", req.institution)
    _update_optional_field(current_user, "school_name", req.school_name)
    _update_optional_field(current_user, "exam_target", req.exam_target)

    if req.date_of_birth is not None:
        if req.date_of_birth == "":
            current_user.date_of_birth = None
        else:
            try:
                current_user.date_of_birth = date.fromisoformat(req.date_of_birth)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

    if req.college_email is not None:
        if req.college_email == "":
            current_user.college_email = None
        else:
            _validate_length("college_email", req.college_email)
            current_user.college_email = req.college_email
            current_user.college_email_verified = False  # Reset verification on email change

    # Validate profile picture — only allow safe schemes
    ALLOWED_PICTURE_PREFIXES = ("data:image/", "https://")
    MAX_PROFILE_PICTURE_LENGTH = 2 * 1024 * 1024  # ~2MB base64

    if req.profile_picture is not None:
        if req.profile_picture == "":
            current_user.profile_picture = None
        else:
            if len(req.profile_picture) > MAX_PROFILE_PICTURE_LENGTH:
                raise HTTPException(status_code=400, detail="Profile picture too large (max 2MB).")
            if not any(req.profile_picture.startswith(p) for p in ALLOWED_PICTURE_PREFIXES):
                raise HTTPException(status_code=400, detail="Invalid profile picture format. Must be a data:image/ URI or https:// URL.")
            current_user.profile_picture = req.profile_picture

    # Auto-set profile_completed when key fields are filled
    if current_user.name and current_user.gender and current_user.exam_target:
        current_user.profile_completed = True

    db.commit()
    db.refresh(current_user)

    return {
        "message": "Profile updated successfully.",
        **_profile_response(current_user),
    }

@router.post("/onboarding")
def complete_onboarding(
    req: OnboardingRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Complete the onboarding flow for a new user."""
    if not req.name or len(req.name.strip()) < 2:
        raise HTTPException(status_code=400, detail="Name must be at least 2 characters.")
    
    _validate_length("name", req.name)
    current_user.name = req.name.strip()
    
    _validate_length("exam_target", req.exam_target)
    current_user.exam_target = req.exam_target
    
    if req.referral_source:
        current_user.referral_source = req.referral_source[:100]
    
    current_user.subscribed_to_emails = req.subscribed_to_emails
    current_user.onboarding_completed = True
    
    # Also mark profile as partially completed
    if current_user.name and current_user.exam_target:
        current_user.profile_completed = True
    
    db.commit()
    db.refresh(current_user)
    
    return {
        "message": "Onboarding completed successfully.",
        **_profile_response(current_user),
    }


def send_admin_notification_email(req_data: dict):
    smtp_email = os.getenv("SMTP_EMAIL")
    smtp_password = os.getenv("SMTP_PASSWORD")
    admin_email = "analyxai@gmail.com"

    if not smtp_email or not smtp_password:
        print("⚠️ SMTP credentials not set. Skipping admin notification email.")
        return

    try:
        msg = EmailMessage()
        msg["Subject"] = f"New Paper Request: {req_data.get('exam')} {req_data.get('year')}"
        msg["From"] = smtp_email
        msg["To"] = admin_email

        body = f"""
New paper request received:

Exam: {req_data.get('exam')}
Year: {req_data.get('year')}
Subject: {req_data.get('subject') or 'N/A'}
User Email: {req_data.get('user_email') or 'Anonymous'}

Check the admin dashboard for details.
"""
        msg.set_content(body)

        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(smtp_email, smtp_password)
            server.send_message(msg)
            
    except Exception as e:
        print(f"Failed to send email: {e}")

@router.delete("/account")
def delete_account(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Permanently delete the authenticated user's account and all associated data.

    Compliant with Indian IT regulations requiring user account deletion capability.
    This will:
      1. Delete the user's profile from the application database.
      2. Delete the user's auth record from Supabase Auth (via admin API).
    """
    user_id = current_user.id

    try:
        # Delete user profile from the application database
        db.delete(current_user)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete user data: {e}")

    try:
        # Delete user from Supabase Auth using the admin API
        supabase.auth.admin.delete_user(user_id)
    except Exception as e:
        # Log but don't fail — the DB record is already gone
        print(f"[auth] Warning: Failed to delete Supabase Auth user {user_id}: {e}")

    return {"message": "Account deleted successfully."}


# --- Cookie Preferences ---
class CookiePreferencesRequest(BaseModel):
    essential: bool = True
    analytics: bool = False
    marketing: bool = False

@router.get("/cookie-preferences")
def get_cookie_preferences(current_user: User = Depends(get_current_user)):
    """Return the user's stored cookie consent preferences."""
    prefs = getattr(current_user, "cookie_preferences", None)
    if not prefs:
        return {"essential": True, "analytics": False, "marketing": False}
    return prefs

@router.put("/cookie-preferences")
def update_cookie_preferences(
    req: CookiePreferencesRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update the user's cookie consent preferences."""
    import json
    from datetime import datetime
    prefs = {
        "essential": True,  # Always true
        "analytics": req.analytics,
        "marketing": req.marketing,
        "timestamp": datetime.utcnow().isoformat(),
    }
    current_user.cookie_preferences = prefs
    db.commit()
    return {"message": "Cookie preferences saved.", **prefs}


@router.post("/paper-request")
@limiter.limit("10/minute")
def create_paper_request(
    request: Request,
    req: PaperRequestCreate,
    background_tasks: BackgroundTasks,
    authorization: Optional[str] = Header(None, description="Bearer <token>"),
    db: Session = Depends(get_db),
):
    from app.models.paper_request import PaperRequest
    user_id = None
    user_email = None

    # Optionally attach user info if authenticated
    if authorization and authorization.startswith("Bearer "):
        try:
            user_id = get_current_user_id(authorization)
            if user_id:
                user = db.query(User).filter(User.id == user_id).first()
                if user:
                    user_email = user.email
        except HTTPException:
            pass  # Anonymous request is OK
            
    pr = PaperRequest(
        user_id=user_id,
        user_email=user_email,
        exam=req.exam,
        exam_id=req.examId,
        year=req.year,
        subject=req.subject,
    )
    db.add(pr)
    db.commit()
    db.refresh(pr)

    # Queue email task
    background_tasks.add_task(send_admin_notification_email, {
        "exam": pr.exam,
        "year": pr.year,
        "subject": pr.subject,
        "user_email": pr.user_email
    })

    return {"message": "Request saved", "id": pr.id}

@router.get("/paper-requests")
def get_paper_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all paper requests. Requires authentication."""
    from app.models.paper_request import PaperRequest
    reqs = db.query(PaperRequest).order_by(PaperRequest.created_at.desc()).all()
    # Return as dicts
    return [
        {
            "id": r.id,
            "user_id": r.user_id,
            "user_email": r.user_email,
            "exam": r.exam,
            "exam_id": r.exam_id,
            "year": r.year,
            "subject": r.subject,
            "status": r.status,
            "created_at": str(r.created_at) if r.created_at else None,
            "notes": r.notes
        }
        for r in reqs
    ]