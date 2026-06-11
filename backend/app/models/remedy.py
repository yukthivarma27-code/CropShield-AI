"""
AgriVision AI — Remedy Model
==============================
Organic/natural remedies for disease management.
"""

from sqlalchemy import Column, Integer, String, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class Remedy(Base):
    __tablename__ = "remedies"

    id = Column(Integer, primary_key=True, autoincrement=True)
    disease_id = Column(Integer, ForeignKey("diseases.id"), nullable=False)
    name = Column(String(150), nullable=False)
    preparation = Column(Text, nullable=True)
    application = Column(Text, nullable=True)
    frequency = Column(String(100), nullable=True)

    # Relationships
    disease = relationship("Disease", back_populates="remedies")

    def __repr__(self):
        return f"<Remedy(id={self.id}, name='{self.name}')>"
