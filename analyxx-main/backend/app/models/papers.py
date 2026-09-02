from sqlalchemy import Column, String, Integer, DateTime, Text, JSON
from app.database import Base
from datetime import datetime
import uuid

class Paper(Base):
    __tablename__ = "papers"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4())[:8])
    user_id = Column(String, nullable=False)
    exam_name = Column(String(255), nullable=False)
    years = Column(String(255), nullable=False)
    filename = Column(String(255), nullable=False)
    file_size = Column(Integer)
    file_url = Column(String(500), nullable=True)
    status = Column(String(50), default="uploaded")
    extracted_text = Column(Text, nullable=True)
    analysis_result = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)