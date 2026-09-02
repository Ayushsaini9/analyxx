"""
Shared authentication dependencies.

Uses Supabase Auth for JWT verification. All routers should import
`get_current_user` or `get_current_user_id` from here — do NOT create
local copies.
"""

import os
from fastapi import Header, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db, supabase
from app.models.user import User


def get_current_user_id(
    authorization: str = Header(..., description="Bearer <token>"),
) -> str:
    """Verify a Supabase JWT and return the user ID.

    Calls Supabase Auth API to validate the token server-side.
    Returns the Supabase `auth.users.id` (UUID string).
    Raises 401 on invalid/missing/expired token.
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header.")
    token = authorization[7:]

    try:
        response = supabase.auth.get_user(token)
        if response and response.user:
            return str(response.user.id)
        raise HTTPException(status_code=401, detail="Invalid or expired token.")
    except Exception as e:
        error_msg = str(e)
        if "401" in error_msg or "invalid" in error_msg.lower() or "expired" in error_msg.lower():
            raise HTTPException(status_code=401, detail="Invalid or expired token.")
        raise HTTPException(status_code=401, detail="Authentication failed.")


def get_current_user(
    authorization: str = Header(..., description="Bearer <token>"),
    db: Session = Depends(get_db),
) -> User:
    """Verify a Supabase JWT and return the full User ORM object.

    Looks up the user in `public.users` by the Supabase auth user ID.
    Creates a profile automatically if one doesn't exist yet (first login).
    Raises 401 on invalid token.
    """
    user_id = get_current_user_id(authorization)

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        # User not found by Supabase Auth ID — could be a provider switch
        # (e.g., user signed up with email/password, now logging in via Google)
        try:
            response = supabase.auth.get_user(authorization[7:])
            su = response.user
            su_email = su.email if su else ""

            # Check if a profile already exists for this email (provider switch)
            if su_email:
                existing = db.query(User).filter(User.email == su_email).first()
                if existing:
                    # Re-link the existing profile to the new auth ID
                    existing.id = user_id
                    if su.user_metadata.get("full_name"):
                        existing.name = su.user_metadata["full_name"]
                    db.commit()
                    db.refresh(existing)
                    user = existing
                else:
                    # Truly new user — create profile
                    user = User(
                        id=user_id,
                        name=su.user_metadata.get("full_name", su_email.split("@")[0]) if su else user_id,
                        email=su_email,
                    )
                    db.add(user)
                    db.commit()
                    db.refresh(user)
            else:
                # No email from Supabase — create a bare profile
                user = User(id=user_id, name=user_id, email="")
                db.add(user)
                db.commit()
                db.refresh(user)
        except HTTPException:
            raise
        except Exception as e:
            db.rollback()
            print(f"[deps] Failed to auto-create user profile: {e}")
            raise HTTPException(status_code=500, detail="Failed to load user profile.")
    return user
