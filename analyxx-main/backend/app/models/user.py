from sqlalchemy import Column, String, Boolean, DateTime, Date, Text, JSON
from app.database import Base
from datetime import datetime, timezone
import uuid

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Profile fields
    gender = Column(String(50), nullable=True)
    date_of_birth = Column(Date, nullable=True)
    institution = Column(String(255), nullable=True)
    school_name = Column(String(255), nullable=True)
    college_email = Column(String(255), nullable=True)
    college_email_verified = Column(Boolean, default=False)
    exam_target = Column(String(100), nullable=True)
    profile_completed = Column(Boolean, default=False)
    profile_picture = Column(Text, nullable=True)  # base64 or URL to profile picture
    cookie_preferences = Column(JSON, nullable=True)  # {essential, analytics, marketing, timestamp}
    onboarding_completed = Column(Boolean, default=False)
    referral_source = Column(String(100), nullable=True)
    subscribed_to_emails = Column(Boolean, default=False)