import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from typing import Generator

# Load environment variables from .env file
load_dotenv()

# Read database URL from environment
DATABASE_URL = os.getenv("DATABASE_URL")

# Safety check - crash early if DATABASE_URL is missing
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is not set!")



# SQLAlchemy = Python classes that describe tables
# One class → one table
# One attribute → one column
# You do NOT write SQL
# SQLAlchemy generates it for you


# 2. create_engine Creates the connection manager
# Does NOT connect immediately
# Connects only when needed
# echo=True Prints SQL queries in terminal(Can be turned off in production)
engine = create_engine(DATABASE_URL,echo=True)

# 3. session maker Creates database sessions
# A session = one unit of work (query, insert, commit)
SessionLocal= sessionmaker(bind=engine)

# DeclarativeBase Parent class for all tables
# SQLAlchemy scans subclasses to create schema
class Base(DeclarativeBase):
    pass

def get_db() -> Generator:
    db = SessionLocal() #opens a db session
    try:
        yield db #gives it to the endpoint
    finally:
        db.close() #closes session even on error