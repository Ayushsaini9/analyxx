"""
Razorpay payment router.

Hybrid model:
  - Daily "day pass"   → one-time Razorpay Order (₹18 = 1800 paise, 24 h access)
  - Monthly recurring  → Razorpay Subscription (₹449/mo)
  - Annual recurring   → Razorpay Subscription (₹4,449/yr)

All amounts are in paise (1 INR = 100 paise).
Razorpay auto-sends invoices when `receipt` + `notes.email` are provided.
"""

import os
import hmac
import hashlib
from datetime import datetime, timezone, timedelta
from typing import Optional

import razorpay
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user_id
from app.models.subscription import Subscription, Payment
from app.models.user import User

# ── Razorpay client (initialized once) ──────────────────────
RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "")
RAZORPAY_WEBHOOK_SECRET = os.getenv("RAZORPAY_WEBHOOK_SECRET", "")

# Plan IDs created on Razorpay Dashboard (Subscriptions → Plans)
RAZORPAY_PLAN_MONTHLY = os.getenv("RAZORPAY_PLAN_MONTHLY", "")
RAZORPAY_PLAN_ANNUAL = os.getenv("RAZORPAY_PLAN_ANNUAL", "")

rz_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

# ── Plan pricing (paise) ────────────────────────────────────
PLAN_PRICES = {
    "pro_daily": 1800,       # ₹18
    "pro_monthly": 44900,    # ₹449
    "pro_annual": 444900,    # ₹4,449
}

PLAN_DURATIONS = {
    "pro_daily": timedelta(hours=24),
    "pro_monthly": timedelta(days=30),
    "pro_annual": timedelta(days=365),
}

router = APIRouter()


# ── Request / response schemas ──────────────────────────────
class CreateOrderRequest(BaseModel):
    plan: str  # "pro_daily"


class CreateSubscriptionRequest(BaseModel):
    plan: str  # "pro_monthly" | "pro_annual"


class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: str
    razorpay_signature: str
    razorpay_subscription_id: Optional[str] = None
    plan: str


# ── Helpers ─────────────────────────────────────────────────
def _get_user_email(user_id: str, db: Session) -> str:
    """Fetch user email for Razorpay receipt / invoice."""
    user = db.query(User).filter(User.id == user_id).first()
    return user.email if user else ""


def _upsert_subscription(
    db: Session,
    user_id: str,
    plan: str,
    razorpay_order_id: Optional[str] = None,
    razorpay_payment_id: Optional[str] = None,
    razorpay_subscription_id: Optional[str] = None,
):
    """Create or update the user's subscription row."""
    now = datetime.now(timezone.utc)
    expires_at = now + PLAN_DURATIONS.get(plan, timedelta(days=30))

    sub = db.query(Subscription).filter(Subscription.user_id == user_id).first()
    if sub:
        sub.plan = plan
        sub.status = "active"
        sub.starts_at = now
        sub.expires_at = expires_at
        sub.razorpay_order_id = razorpay_order_id or sub.razorpay_order_id
        sub.razorpay_payment_id = razorpay_payment_id or sub.razorpay_payment_id
        sub.razorpay_subscription_id = razorpay_subscription_id or sub.razorpay_subscription_id
        sub.updated_at = now
    else:
        sub = Subscription(
            user_id=user_id,
            plan=plan,
            status="active",
            starts_at=now,
            expires_at=expires_at,
            razorpay_order_id=razorpay_order_id,
            razorpay_payment_id=razorpay_payment_id,
            razorpay_subscription_id=razorpay_subscription_id,
        )
        db.add(sub)
    db.commit()
    db.refresh(sub)
    return sub


# ═══════════════════════════════════════════════════════════════
# 1. CREATE ORDER — for daily day-pass (one-time payment)
# ═══════════════════════════════════════════════════════════════
@router.post("/create-order")
def create_order(
    body: CreateOrderRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    if body.plan != "pro_daily":
        raise HTTPException(
            status_code=400,
            detail="Use /create-subscription for monthly/annual plans.",
        )

    amount = PLAN_PRICES["pro_daily"]
    email = _get_user_email(user_id, db)

    try:
        order = rz_client.order.create({
            "amount": amount,
            "currency": "INR",
            "receipt": f"rcpt_{user_id[:8]}_{int(datetime.now(timezone.utc).timestamp())}",
            "notes": {
                "user_id": user_id,
                "plan": "pro_daily",
                "email": email,
            },
        })
    except Exception as e:
        print(f"[payments] Razorpay order creation failed: {e}")
        raise HTTPException(status_code=500, detail="Could not create payment order.")

    # Record in payments ledger
    payment = Payment(
        user_id=user_id,
        razorpay_order_id=order["id"],
        amount=amount,
        plan="pro_daily",
        status="created",
    )
    db.add(payment)
    db.commit()

    return {
        "order_id": order["id"],
        "amount": amount,
        "currency": "INR",
        "key_id": RAZORPAY_KEY_ID,
        "plan": "pro_daily",
        "user_email": email,
    }


# ═══════════════════════════════════════════════════════════════
# 2. CREATE SUBSCRIPTION — for monthly / annual (recurring)
# ═══════════════════════════════════════════════════════════════
@router.post("/create-subscription")
def create_subscription(
    body: CreateSubscriptionRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    if body.plan not in ("pro_monthly", "pro_annual"):
        raise HTTPException(
            status_code=400,
            detail="Use /create-order for daily plan.",
        )

    plan_id_map = {
        "pro_monthly": RAZORPAY_PLAN_MONTHLY,
        "pro_annual": RAZORPAY_PLAN_ANNUAL,
    }

    rz_plan_id = plan_id_map.get(body.plan)
    if not rz_plan_id:
        raise HTTPException(
            status_code=500,
            detail=f"Razorpay plan not configured for {body.plan}. Contact support.",
        )

    email = _get_user_email(user_id, db)
    amount = PLAN_PRICES[body.plan]

    try:
        subscription = rz_client.subscription.create({
            "plan_id": rz_plan_id,
            "total_count": 12 if body.plan == "pro_monthly" else 5,  # billing cycles
            "quantity": 1,
            "notes": {
                "user_id": user_id,
                "plan": body.plan,
                "email": email,
            },
        })
    except Exception as e:
        import traceback
        print(f"[payments] Razorpay subscription creation failed: {e}")
        print(f"[payments] Plan ID used: {rz_plan_id}")
        print(f"[payments] Full traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Could not create subscription: {str(e)}")

    # Record in payments ledger
    payment = Payment(
        user_id=user_id,
        razorpay_subscription_id=subscription["id"],
        amount=amount,
        plan=body.plan,
        status="created",
    )
    db.add(payment)
    db.commit()

    return {
        "subscription_id": subscription["id"],
        "amount": amount,
        "currency": "INR",
        "key_id": RAZORPAY_KEY_ID,
        "plan": body.plan,
        "user_email": email,
    }


# ═══════════════════════════════════════════════════════════════
# 3. VERIFY PAYMENT — called after Razorpay checkout success
# ═══════════════════════════════════════════════════════════════
@router.post("/verify")
def verify_payment(
    body: VerifyPaymentRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    # ── Signature verification ──
    try:
        if body.razorpay_subscription_id:
            # Subscription payment: verify subscription signature
            rz_client.utility.verify_subscription_payment_signature({
                "razorpay_subscription_id": body.razorpay_subscription_id,
                "razorpay_payment_id": body.razorpay_payment_id,
                "razorpay_signature": body.razorpay_signature,
            })
        elif body.razorpay_order_id:
            # One-time payment: verify order signature
            rz_client.utility.verify_payment_signature({
                "razorpay_order_id": body.razorpay_order_id,
                "razorpay_payment_id": body.razorpay_payment_id,
                "razorpay_signature": body.razorpay_signature,
            })
        else:
            raise HTTPException(status_code=400, detail="Missing order_id or subscription_id.")
    except razorpay.errors.SignatureVerificationError:
        # Update payment as failed
        payment = db.query(Payment).filter(
            (Payment.razorpay_order_id == body.razorpay_order_id) |
            (Payment.razorpay_subscription_id == body.razorpay_subscription_id),
            Payment.user_id == user_id,
        ).first()
        if payment:
            payment.status = "failed"
            db.commit()
        raise HTTPException(status_code=400, detail="Payment signature verification failed.")

    # ── Update payment record ──
    if body.razorpay_order_id:
        payment = db.query(Payment).filter(
            Payment.razorpay_order_id == body.razorpay_order_id,
            Payment.user_id == user_id,
        ).first()
    else:
        payment = db.query(Payment).filter(
            Payment.razorpay_subscription_id == body.razorpay_subscription_id,
            Payment.user_id == user_id,
            Payment.status == "created",
        ).first()

    if payment:
        payment.razorpay_payment_id = body.razorpay_payment_id
        payment.razorpay_signature = body.razorpay_signature
        payment.status = "paid"
        db.commit()

    # ── Activate subscription ──
    sub = _upsert_subscription(
        db=db,
        user_id=user_id,
        plan=body.plan,
        razorpay_order_id=body.razorpay_order_id,
        razorpay_payment_id=body.razorpay_payment_id,
        razorpay_subscription_id=body.razorpay_subscription_id,
    )

    return {
        "status": "success",
        "plan": sub.plan,
        "expires_at": sub.expires_at.isoformat() if sub.expires_at else None,
        "message": f"Your {sub.plan.replace('pro_', 'Pro ')} plan is now active!",
    }


# ═══════════════════════════════════════════════════════════════
# 4. GET SUBSCRIPTION STATUS
# ═══════════════════════════════════════════════════════════════
@router.get("/subscription")
def get_subscription(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    sub = db.query(Subscription).filter(Subscription.user_id == user_id).first()

    # Auto-expire if past expiry date
    if sub and sub.expires_at and sub.plan != "free":
        if datetime.now(timezone.utc) > sub.expires_at:
            sub.status = "expired"
            sub.updated_at = datetime.now(timezone.utc)
            db.commit()
            db.refresh(sub)

    if not sub:
        return {
            "plan": "free",
            "status": "active",
            "starts_at": None,
            "expires_at": None,
        }

    return {
        "plan": sub.plan,
        "status": sub.status,
        "starts_at": sub.starts_at.isoformat() if sub.starts_at else None,
        "expires_at": sub.expires_at.isoformat() if sub.expires_at else None,
    }


# ═══════════════════════════════════════════════════════════════
# 5. GET PAYMENT HISTORY
# ═══════════════════════════════════════════════════════════════
@router.get("/history")
def get_payment_history(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    payments = (
        db.query(Payment)
        .filter(Payment.user_id == user_id)
        .order_by(Payment.created_at.desc())
        .limit(50)
        .all()
    )
    return [
        {
            "id": str(p.id),
            "razorpay_order_id": p.razorpay_order_id,
            "razorpay_payment_id": p.razorpay_payment_id,
            "amount": p.amount,
            "currency": p.currency,
            "plan": p.plan,
            "status": p.status,
            "created_at": p.created_at.isoformat() if p.created_at else None,
        }
        for p in payments
    ]


# ═══════════════════════════════════════════════════════════════
# 6. WEBHOOK — async backup from Razorpay
# ═══════════════════════════════════════════════════════════════
@router.post("/webhook")
async def razorpay_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Handles Razorpay webhook events.

    Events we care about:
      - payment.captured    → mark payment as paid, activate subscription
      - subscription.charged → recurring charge success
      - payment.failed      → mark payment as failed
    """
    body = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")

    # ── Verify webhook signature ──
    if RAZORPAY_WEBHOOK_SECRET:
        expected = hmac.HMAC(
            RAZORPAY_WEBHOOK_SECRET.encode(),
            body,
            hashlib.sha256,
        ).hexdigest()
        if not hmac.compare_digest(expected, signature):
            raise HTTPException(status_code=400, detail="Invalid webhook signature.")

    import json
    try:
        payload = json.loads(body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON.")

    event = payload.get("event", "")
    payment_entity = payload.get("payload", {}).get("payment", {}).get("entity", {})

    if event in ("payment.captured", "payment.authorized"):
        order_id = payment_entity.get("order_id")
        payment_id = payment_entity.get("id")
        notes = payment_entity.get("notes", {})
        user_id = notes.get("user_id")
        plan = notes.get("plan")

        if user_id and plan:
            # Update payment record
            payment = db.query(Payment).filter(
                Payment.razorpay_order_id == order_id,
                Payment.user_id == user_id,
            ).first()
            if payment:
                payment.razorpay_payment_id = payment_id
                payment.status = "paid"
                db.commit()

            # Activate subscription
            _upsert_subscription(
                db=db,
                user_id=user_id,
                plan=plan,
                razorpay_order_id=order_id,
                razorpay_payment_id=payment_id,
            )

    elif event == "subscription.charged":
        sub_entity = payload.get("payload", {}).get("subscription", {}).get("entity", {})
        notes = sub_entity.get("notes", {})
        user_id = notes.get("user_id")
        plan = notes.get("plan")
        sub_id = sub_entity.get("id")

        if user_id and plan:
            _upsert_subscription(
                db=db,
                user_id=user_id,
                plan=plan,
                razorpay_subscription_id=sub_id,
            )

    elif event == "payment.failed":
        order_id = payment_entity.get("order_id")
        notes = payment_entity.get("notes", {})
        user_id = notes.get("user_id")

        if user_id and order_id:
            payment = db.query(Payment).filter(
                Payment.razorpay_order_id == order_id,
                Payment.user_id == user_id,
            ).first()
            if payment:
                payment.status = "failed"
                db.commit()

    return {"status": "ok"}
