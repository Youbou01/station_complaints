"""
Station Complaints API - Main Application


All routes are defined here, schemas are imported from schemas.py
"""

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from database import engine, get_db
from models import Base, Complaint, User
from schemas import (
    UserCreate,
    UserResponse,
    TokenResponse,
    ComplaintCreate,
    ComplaintStatusUpdate,
    ComplaintResponse,
)
from security import hash_password, verify_password
from auth import create_access_token
from auth_dependencies import get_current_user, require_roles
from enums import ComplaintStatusEnum, ComplaintTypeEnum, RoleEnum


# Create database tables
Base.metadata.create_all(bind=engine)

# Initialize FastAPI app
app = FastAPI(
    title="Station Complaints API",
    description="API for managing oil station complaints for SNDP Agil",
    version="1.0.0",
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"], #  Angular app's address
    allow_credentials=True, # Allows cookies/auth headers to be sent
    allow_methods=["*"], # Allows all HTTP methods (GET, POST, PUT, DELETE, etc.)
    allow_headers=["*"], # Allows all headers (including Authorization)
)


# ============== HEALTH CHECK ==============

@app.get("/", tags=["Health"])
def root():
    """Health check endpoint."""
    return {"message": "Backend is running"}


# ============== AUTHENTICATION ==============

@app.post("/setup/first-admin", response_model=UserResponse, tags=["Setup"])
def create_first_admin(
    user: UserCreate,
    db: Session = Depends(get_db)
):
    """
    One-time setup: Create the first administrator.
    Only works when there are NO users in the database.
    """
    # check if any users exist
    user_count = db.query(User).count()
    
    if user_count > 0:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Setup already completed. Users exist in the database."
        )
    
    # Force the role to be administrator (ignore what they send)
    hashed = hash_password(user.password)
    db_user = User(
        email=user.email,
        password_hash=hashed,
        role="administrator" # Always administrator, no matter what
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    return db_user


@app.post("/login", response_model=TokenResponse, tags=["Authentication"])
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    Authenticate user and return JWT token.
    Use email as username.
    """
    user = db.query(User).filter(User.email == form_data.username).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    if not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account pending approval. Please wait for admin to activate your account."
        )
    access_token = create_access_token(
        data={"user_id": user.id, "role": user.role}
    )

    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/me", response_model=UserResponse, tags=["Authentication"])
def read_my_profile(current_user: User = Depends(get_current_user)):
    """Get the current logged-in user's profile."""
    #Protected route = route that depends on something that can fail
    #Depends(get_current_user) is the gatekeeper
    return current_user


# ============== USER MANAGEMENT ==============

@app.post("/users", response_model=UserResponse, tags=["Users"])
def create_user(
    user: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("administrator"))
):
    """
    Create a new user. Only administrators can do this.
    """
    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    hashed = hash_password(user.password)
    db_user = User(
        email=user.email,
        password_hash=hashed,
        role=user.role.value
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    return db_user


# ============== COMPLAINTS ==============

@app.post("/complaints", response_model=ComplaintResponse, tags=["Complaints"])
def create_complaint(
    complaint: ComplaintCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("manager"))
):
    """
    Create a new complaint. Only managers can do this.
    """
    db_complaint = Complaint(
        station_id=complaint.station_id,
        type=complaint.type.value,
        description=complaint.description,
        severity=complaint.severity
    )

    db.add(db_complaint)
    db.commit()
    db.refresh(db_complaint)

    return db_complaint


@app.get("/complaints", response_model=list[ComplaintResponse], tags=["Complaints"])
def get_complaints(
    complaint_status: ComplaintStatusEnum | None = None,
    station_id: int | None = None,
    complaint_type: ComplaintTypeEnum | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("assistant", "director"))
):
    """
    Get all complaints with optional filters.
    Only assistants and directors can view complaints.
    """
    query = db.query(Complaint)
    #db.query(Complaint) → SELECT * FROM complaints, .all() fetches everything as python list
    if complaint_status:
        query = query.filter(Complaint.status == complaint_status.value)

    if station_id:
        query = query.filter(Complaint.station_id == station_id)

    if complaint_type:
        query = query.filter(Complaint.type == complaint_type.value)
    
    return query.all() #query is sqlalchemy Query object
#FastAPI automatically converts SQLAlchemy objects → JSON.

@app.get("/complaints/{complaint_id}", response_model=ComplaintResponse, tags=["Complaints"])
def get_specific_complaint(
    complaint_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user) #  any logged-in user
):
    """
    Get a specific complaint by ID.
    Any logged-in user can view a complaint.
    """
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
                                    #→ WHERE id = ?                     returns one row or None
    if complaint is None:
        raise HTTPException(status_code=404, detail="Complaint not found")

    return complaint


@app.put("/complaints/{complaint_id}/status", response_model=ComplaintResponse, tags=["Complaints"])
def update_complaint_status(
    complaint_id: int,
    payload: ComplaintStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("intervenant"))
):
    """
    Update a complaint's status. Only intervenants can do this.
    """
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()

    if complaint is None:
        raise HTTPException(status_code=404, detail="Complaint not found")

    complaint.status = payload.status.value
    db.commit()
    db.refresh(complaint)

    return complaint


@app.post("/register", response_model=UserResponse, tags=["Authentication"])
def register(
    user: UserCreate,
    db: Session = Depends(get_db)
):
    """
    Public registration endpoint.
    Creates a new user with is_active=False (pending approval).
    Admin must approve before user can login.
    """
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Don't allow self-registration as administrator
    if user.role == RoleEnum.ADMINISTRATOR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot register as administrator"
        )
    
    hashed = hash_password(user.password)
    db_user = User(
        email=user.email,
        password_hash=hashed,
        role=user.role.value,
        is_active=False  # Pending approval!
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    return db_user

# ============== USER MANAGEMENT (ADMIN) ==============

@app.get("/users", response_model=list[UserResponse], tags=["Users"])
def get_all_users(
    is_active: bool | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("administrator"))
):
    """
    Get all users. Admin only.
    Can filter by is_active status.
    """
    query = db.query(User)
    
    if is_active is not None:
        query = query.filter(User.is_active == is_active)
    
    return query.all()


@app.put("/users/{user_id}/activate", response_model=UserResponse, tags=["Users"])
def activate_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("administrator"))
):
    """
    Activate a user (approve registration). Admin only.
    """
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already active"
        )
    
    user.is_active = True
    db.commit()
    db.refresh(user)
    
    return user


@app.put("/users/{user_id}/deactivate", response_model=UserResponse, tags=["Users"])
def deactivate_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("administrator"))
):
    """
    Deactivate a user. Admin only.
    """
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Prevent admin from deactivating themselves
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate yourself"
        )
    
    user.is_active = False
    db.commit()
    db.refresh(user)
    
    return user


@app.delete("/users/{user_id}", tags=["Users"])
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("administrator"))
):
    """
    Delete a user. Admin only.
    """
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Prevent admin from deleting themselves
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete yourself"
        )
    
    db.delete(user)
    db.commit()
    
    return {"message": "User deleted successfully"}