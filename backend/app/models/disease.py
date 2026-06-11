"""
AgriVision AI — Disease Model
===============================
Catalog of crop diseases with symptoms and descriptions.
"""

from sqlalchemy import Column, Integer, String, Text
from sqlalchemy.orm import relationship
from app.database import Base


class Disease(Base):
    __tablename__ = "diseases"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False, unique=True)
    crop = Column(String(50), nullable=False)
    symptoms = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
    severity_info = Column(Text, nullable=True)

    # Relationships
    treatments = relationship("Treatment", back_populates="disease", cascade="all, delete-orphan")
    remedies = relationship("Remedy", back_populates="disease", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Disease(id={self.id}, name='{self.name}', crop='{self.crop}')>"
