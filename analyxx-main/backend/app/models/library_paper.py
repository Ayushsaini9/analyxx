"""ORM model for the library_papers table — indexed catalog of library papers."""

from sqlalchemy import Column, String, Integer, Text, DateTime
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
import uuid


class LibraryPaper(Base):
    __tablename__ = "library_papers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    exam = Column(String(100), nullable=False)
    subject = Column(String(255), nullable=False)
    year = Column(Integer, nullable=False)
    branch = Column(String(100), nullable=True)
    semester = Column(Integer, nullable=True)
    storage_path = Column(String(500), nullable=False, unique=True)
    total_marks = Column(Integer, nullable=True)
    paper_parts = Column(String(100), nullable=True)
    text = Column(Text, nullable=True)
    extraction_status = Column(String(20), default="pending")
    created_at = Column(DateTime(timezone=True), server_default="now()")
