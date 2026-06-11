"""
AgriVision AI — User Model
===========================
Stores farmer profile information including location and language preference.
"""

from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    phone = Column(String(15), unique=True, nullable=True)
    state = Column(String(50), nullable=True)
    district = Column(String(50), nullable=True)
    language = Column(String(10), default="en")  # en, te, hi, ta, kn
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    predictions = relationship("Prediction", back_populates="user", cascade="all, delete-orphan")
    history = relationship("History", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User(id={self.id}, name='{self.name}', state='{self.state}')>"
