from sqlalchemy import Column, String, DateTime, Integer, Text
from app.database import Base
from datetime import datetime, timezone
import uuid


class PaperRequest(Base):
    __tablename__ = "paper_requests"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=True)  # nullable for anonymous requests
    user_email = Column(String(255), nullable=True)
    exam = Column(String(255), nullable=False)
    exam_id = Column(String(100), nullable=False)
    year = Column(Integer, nullable=False)
    subject = Column(String(255), nullable=True)
    status = Column(String(50), default="pending")  # pending, fulfilled, rejected
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    notes = Column(Text, nullable=True)
