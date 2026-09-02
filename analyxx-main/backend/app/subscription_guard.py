"""
Subscription guard — enforces free-tier limits and Pro-only gating.

Free plan: 3 papers per day (UTC calendar day), basic AI analysis, top 5 predictions.
Pro plan:  unlimited papers, full AI analysis, all predictions, PDF export.

Dependencies:
    check_paper_upload_limit — blocks uploads when daily limit hit (free only)
    get_user_plan            — returns plan string for feature differentiation
    check_pro_required       — raises 403 if user is not on a Pro plan
"""

from datetime import datetime, timezone, timedelta

from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.deps import get_current_user_id
from app.models.subscription import Subscription
from app.models.papers import Paper


FREE_DAILY_LIMIT = 3
FREE_PREDICTION_LIMIT = 5  # Free users see only top 5 predictions


def _get_active_plan(user_id: str, db: Session) -> str:
    """Return the user's current active plan, or 'free' if none."""
    sub = db.query(Subscription).filter(Subscription.user_id == user_id).first()

    if not sub:
        return "free"

    # Auto-expire if past expiry
    if sub.plan != "free" and sub.expires_at:
        if datetime.now(timezone.utc) > sub.expires_at:
            sub.status = "expired"
            sub.updated_at = datetime.now(timezone.utc)
            db.commit()
            return "free"

    if sub.status != "active":
        return "free"

    return sub.plan


def _count_papers_today(user_id: str, db: Session) -> int:
    """Count how many papers the user uploaded today (UTC)."""
    today_start = datetime.now(timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0,
    )
    return (
        db.query(func.count(Paper.id))
        .filter(
            Paper.user_id == user_id,
            Paper.created_at >= today_start,
        )
        .scalar()
    ) or 0


def check_paper_upload_limit(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> None:
    """
    FastAPI dependency that blocks uploads when the free-tier
    daily limit is exceeded.

    Raises HTTP 403 with an upgrade-friendly message.
    """
    plan = _get_active_plan(user_id, db)

    # Pro users get unlimited access
    if plan.startswith("pro_"):
        return

    # Free plan — check daily limit
    used_today = _count_papers_today(user_id, db)
    if used_today >= FREE_DAILY_LIMIT:
        raise HTTPException(
            status_code=403,
            detail={
                "message": f"You've reached your daily limit of {FREE_DAILY_LIMIT} free papers. Upgrade to Pro for unlimited access.",
                "code": "DAILY_LIMIT_REACHED",
                "used": used_today,
                "limit": FREE_DAILY_LIMIT,
                "plan": "free",
            },
        )


def get_usage_stats(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> dict:
    """Return the user's current usage stats (for the billing page)."""
    plan = _get_active_plan(user_id, db)
    used_today = _count_papers_today(user_id, db)

    return {
        "plan": plan,
        "papers_today": used_today,
        "daily_limit": FREE_DAILY_LIMIT if not plan.startswith("pro_") else None,
        "is_limited": not plan.startswith("pro_"),
    }


def is_pro(plan: str) -> bool:
    """Check if a plan string represents any Pro tier."""
    return plan.startswith("pro_")


def get_user_plan(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> str:
    """
    FastAPI dependency that returns the user's active plan string.

    Does NOT enforce any limits — used by endpoints that need to vary
    their response based on plan (e.g. basic vs full AI analysis).

    Returns 'free' or one of 'pro_daily', 'pro_monthly', 'pro_annual'.
    """
    return _get_active_plan(user_id, db)


def check_pro_required(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> str:
    """
    FastAPI dependency that raises HTTP 403 if the user is not on a Pro plan.

    Used to gate Pro-only features like PDF export.
    Returns the plan string if the user is Pro.
    """
    plan = _get_active_plan(user_id, db)
    if not is_pro(plan):
        raise HTTPException(
            status_code=403,
            detail={
                "message": "This feature is available on Pro plans only. Upgrade to Pro to unlock PDF exports, full AI analysis, and more.",
                "code": "PRO_REQUIRED",
                "plan": plan,
            },
        )
    return plan
