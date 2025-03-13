from .database import Base
from sqlalchemy import Integer, String, Column, ForeignKey
from sqlalchemy.orm import relationship

class User(Base) :
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
    user_id = Column(Integer, ForeignKey("users.id"))
    user = relationship("User", back_populates="editHistory")
    
class Segments(Base):
    __tablename__ = "segments"
    id = Column(Integer, primary_key=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"))
    segment = Column(String(255), nullable=False)
    video = Column(String(255), nullable=False)
    user = relationship("User", back_populates="segments")