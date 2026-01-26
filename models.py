from sqlalchemy import Column, Integer, String, Boolean, Text, func, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


class Station(Base):
    __tablename__ = "stations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    code = Column(String, nullable=False, unique=True)
    address = Column(String, nullable=True)
    governorate = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    manager_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    manager = relationship("User", back_populates="managed_station", foreign_keys=[manager_id])
    complaints = relationship("Complaint", back_populates="station")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, nullable=False, unique=True, index=True)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    managed_station = relationship("Station", back_populates="manager", foreign_keys="Station.manager_id")
    assigned_complaints = relationship("Complaint", back_populates="assigned_to", foreign_keys="Complaint.assigned_to_id")
    created_complaints = relationship("Complaint", back_populates="created_by", foreign_keys="Complaint.created_by_id")


class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    type = Column(String, nullable=False)
    severity = Column(Integer, nullable=False)
    status = Column(String, nullable=False, default="open")
    
    station_id = Column(Integer, ForeignKey("stations.id"), nullable=False)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    assigned_to_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    resolution_notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    station = relationship("Station", back_populates="complaints")
    created_by = relationship("User", back_populates="created_complaints", foreign_keys=[created_by_id])
    assigned_to = relationship("User", back_populates="assigned_complaints", foreign_keys=[assigned_to_id])