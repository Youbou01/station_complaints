from sqlalchemy import Column, Integer, String,Boolean,func,DateTime,ForeignKey
from database import Base
from sqlalchemy.orm import relationship

class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(Integer, primary_key=True, index=True)
    station_id = Column(Integer,ForeignKey("stations.id"), nullable=False)
    type = Column(String, nullable=False)
    description = Column(String, nullable=False)
    severity = Column(Integer, nullable=False)
    status = Column(String, nullable=False, default="open")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    # Relationships
    station = relationship("Station", back_populates="complaints")

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer,primary_key=True,index=True)
    email = Column(String,nullable=False,unique=True,index=True)
    password_hash = Column(String,nullable=False)
    role = Column(String,nullable=False) # Will be validated by Pydantic, stored as string
    is_active = Column(Boolean,default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    #default=func.now() → Python generates the time, then sends it to DB
    #server_default=func.now() → Database generates the time itself

    # Relationships
    managed_station = relationship("Station", back_populates="manager", foreign_keys="Station.manager_id")

class Station(Base):
    __tablename__ = "stations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    code = Column(String, nullable=False, unique=True)  # e.g., "TUN-001"
    address = Column(String, nullable=True)
    governorate = Column(String, nullable=False)  # e.g., "Tunis", "Bizerte", "Nabeul"
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    manager_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    manager = relationship("User", back_populates="managed_station", foreign_keys=[manager_id])
    complaints = relationship("Complaint", back_populates="station")
