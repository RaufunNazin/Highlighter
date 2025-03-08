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
    
class EditHistory(Base):
    __tablename__ = "edit_history"
    id = Column(Integer, primary_key=True, nullable=False)
    inputVideo = Column(String(100), nullable=False)
    outputVideo = Column(String(100), nullable=False)
    subtitle = Column(String(100), nullable=False)
    time = Column(String(100), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"))
    user = relationship("User", back_populates="edit_history")