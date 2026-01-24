from sqlalchemy import Column, Integer, String,Boolean,func,DateTime,ForeignKey
from database import Base


class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(Integer, primary_key=True, index=True)
    station_id = Column(Integer, nullable=False)
    type = Column(String, nullable=False)
    description = Column(String, nullable=False)
    severity = Column(Integer, nullable=False)
    status = Column(String, nullable=False, default="open")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

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