from .database import Base
from sqlalchemy import Integer, String, Column, ForeignKey, Float
from sqlalchemy.orm import relationship
from datetime import datetime

class ProcessingJob(Base):
    __tablename__ = "processing_jobs"
    id = Column(String(50), primary_key=True, nullable=False) # celery task id
    user_id = Column(Integer, ForeignKey("users.id"))
    status = Column(String(50), nullable=False, default="pending") # pending, processing, completed, failed
    video_filename = Column(String(255), nullable=True)
    subtitle_filename = Column(String(255), nullable=True)
    model_key = Column(String(50), nullable=True)
    created_at = Column(String(50), nullable=True, default=lambda: str(datetime.utcnow()))
    completed_at = Column(String(50), nullable=True)
    error_message = Column(String(1000), nullable=True)
    
    # We can store live logs as a JSON array or just fetch them from Redis/Celery if we want.
    # For now, we'll keep it simple and just rely on status.
    
    user = relationship("User")

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, nullable=False)
    username = Column(String(50), nullable=False)
    email = Column(String(100), nullable=False)
    password = Column(String(100), nullable=False)
    role = Column(Integer, nullable=False)
    editHistory = relationship("EditHistory", back_populates="user")
    segments = relationship("Segments", back_populates="user")

class EditHistory(Base):
    __tablename__ = "edit_history"
    id = Column(Integer, primary_key=True, nullable=False)
    inputVideo = Column(String(255), nullable=False)
    outputVideo = Column(String(255), nullable=True, default=None)
    subtitle = Column(String(255), nullable=False)
    time = Column(String(100), nullable=True, default=None)
    # ── new columns ──
    model_key = Column(String(50), nullable=True, default="bert")
    analysis_time = Column(Float, nullable=True, default=None)
    highlights_found = Column(Integer, nullable=True, default=None)
    avg_confidence = Column(Float, nullable=True, default=None)
    model_load_time = Column(Float, nullable=True, default=None)
    # ─────────────────
    user_id = Column(Integer, ForeignKey("users.id"))
    user = relationship("User", back_populates="editHistory")

class Segments(Base):
    __tablename__ = "segments"
    id = Column(Integer, primary_key=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"))
    segment = Column(String(255), nullable=False)
    video = Column(String(255), nullable=False)
    user = relationship("User", back_populates="segments")
