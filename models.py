from sqlalchemy import Column, Integer, String,Boolean,func
from database import Base
import datetime

class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(Integer, primary_key=True, index=True)
    station_id = Column(Integer, nullable=False)
    type = Column(String, nullable=False)
    description = Column(String, nullable=False)
    severity = Column(Integer, nullable=False)
    status = Column(String, nullable=False, default="open")

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer,primary_key=True,index=True)
    email = Column(String,nullable=False,unique=True,index=True)
    password_hash = Column(String,nullable=False)
    role = Column(String,nullable=False)
    is_active = Column(Boolean,default=True)
    created_at = Column(String, default=func.now())