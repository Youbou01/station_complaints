"""
Station Complaints API - Main Application


All routes are defined here, schemas are imported from schemas.py
"""

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime

from database import engine, get_db
from models import Base, Complaint, User, Station
from schemas import (
    UserCreate,
    UserResponse,
    TokenResponse,
    ComplaintCreate,
    ComplaintUpdate,
    ComplaintAssign,
    ComplaintStatusUpdate,
    ComplaintResponse,
    ComplaintDetailResponse,
    StationCreate,
    StationUpdate,
    StationResponse,
    AssignManagerRequest,
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
    Complaint is automatically linked to the manager's station.
    """
    # Get manager's station
    station = db.query(Station).filter(Station.manager_id == current_user.id).first()
    
    if not station:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are not assigned to any station"
        )
    
    db_complaint = Complaint(
        title=complaint.title,
        description=complaint.description,
        type=complaint.type.value,
        severity=complaint.severity,
        station_id=station.id,
        created_by_id=current_user.id,
        status="open"
    )

    db.add(db_complaint)
    db.commit()
    db.refresh(db_complaint)

    return db_complaint


@app.get("/complaints", response_model=list[ComplaintResponse], tags=["Complaints"])
def get_complaints(
    status_filter: ComplaintStatusEnum | None = None,
    type_filter: ComplaintTypeEnum | None = None,
    station_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get complaints based on user role:
    - Administrator: All complaints
    - Manager: Only their station's complaints
    - Assistant: All complaints (they manage workflow)
    - Intervenant: Only complaints assigned to them
    - Director: All complaints (for review)
    """
    query = db.query(Complaint)
    
    # Role-based filtering
    if current_user.role == "manager":
        station = db.query(Station).filter(Station.manager_id == current_user.id).first()
        if station:
            query = query.filter(Complaint.station_id == station.id)
        else:
            return []
    elif current_user.role == "intervenant":
        query = query.filter(Complaint.assigned_to_id == current_user.id)
    
    # Additional filters
    if status_filter:
        query = query.filter(Complaint.status == status_filter.value)
    
    if type_filter:
        query = query.filter(Complaint.type == type_filter.value)
    
    if station_id and current_user.role in ["administrator", "assistant", "director"]:
        query = query.filter(Complaint.station_id == station_id)
    
    return query.order_by(Complaint.created_at.desc()).all()


@app.get("/complaints/{complaint_id}", response_model=ComplaintDetailResponse, tags=["Complaints"])
def get_complaint(
    complaint_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific complaint with full details.
    """
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found"
        )
    
    # Check access based on role
    if current_user.role == "manager":
        station = db.query(Station).filter(Station.manager_id == current_user.id).first()
        if not station or complaint.station_id != station.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view complaints from your station"
            )
    elif current_user.role == "intervenant":
        if complaint.assigned_to_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view complaints assigned to you"
            )
    
    return complaint


@app.put("/complaints/{complaint_id}", response_model=ComplaintResponse, tags=["Complaints"])
def update_complaint(
    complaint_id: int,
    complaint_update: ComplaintUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("manager"))
):
    """
    Update a complaint. Only the manager who created it can update.
    Can only update if status is 'open'.
    """
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found"
        )
    
    if complaint.created_by_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update complaints you created"
        )
    
    if complaint.status != "open":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only update complaints with 'open' status"
        )
    
    if complaint_update.title is not None:
        complaint.title = complaint_update.title
    if complaint_update.description is not None:
        complaint.description = complaint_update.description
    if complaint_update.type is not None:
        complaint.type = complaint_update.type.value
    if complaint_update.severity is not None:
        complaint.severity = complaint_update.severity
    
    db.commit()
    db.refresh(complaint)
    
    return complaint


@app.delete("/complaints/{complaint_id}", tags=["Complaints"])
def delete_complaint(
    complaint_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("manager", "administrator"))
):
    """
    Delete a complaint. Manager can delete their own, admin can delete any.
    Can only delete if status is 'open'.
    """
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found"
        )
    
    if current_user.role == "manager" and complaint.created_by_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete complaints you created"
        )
    
    if complaint.status != "open":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only delete complaints with 'open' status"
        )
    
    db.delete(complaint)
    db.commit()
    
    return {"message": "Complaint deleted successfully"}


@app.put("/complaints/{complaint_id}/assign", response_model=ComplaintResponse, tags=["Complaints"])
def assign_complaint(
    complaint_id: int,
    assignment: ComplaintAssign,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("assistant"))
):
    """
    Assign a complaint to an intervenant. Only assistants can do this.
    """
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found"
        )
    
    if complaint.status not in ["open", "assigned"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only assign complaints with 'open' or 'assigned' status"
        )
    
    # Verify the assignee is an intervenant
    intervenant = db.query(User).filter(User.id == assignment.assigned_to_id).first()
    
    if not intervenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if intervenant.role != "intervenant":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only assign to users with 'intervenant' role"
        )
    
    if not intervenant.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot assign to inactive user"
        )
    
    complaint.assigned_to_id = assignment.assigned_to_id
    complaint.status = "assigned"
    
    db.commit()
    db.refresh(complaint)
    
    return complaint


@app.put("/complaints/{complaint_id}/status", response_model=ComplaintResponse, tags=["Complaints"])
def update_complaint_status(
    complaint_id: int,
    status_update: ComplaintStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("intervenant", "assistant"))
):
    """
    Update complaint status.
    - Intervenant: Can update their assigned complaints (in_progress, resolved)
    - Assistant: Can update any complaint (including rejected)
    """
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found"
        )
    
    # Intervenant can only update their own assigned complaints
    if current_user.role == "intervenant":
        if complaint.assigned_to_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only update complaints assigned to you"
            )
        
        # Intervenant can only set certain statuses
        allowed_statuses = ["in_progress", "resolved"]
        if status_update.status.value not in allowed_statuses:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"You can only set status to: {', '.join(allowed_statuses)}"
            )
    
    complaint.status = status_update.status.value
    
    if status_update.resolution_notes:
        complaint.resolution_notes = status_update.resolution_notes
    
    if status_update.status == ComplaintStatusEnum.RESOLVED:
        complaint.resolved_at = datetime.now()
    
    db.commit()
    db.refresh(complaint)
    
    return complaint


@app.get("/intervenants", response_model=list[UserResponse], tags=["Users"])
def get_intervenants(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("assistant", "administrator"))
):
    """
    Get all active intervenants. For assistants to assign complaints.
    """
    return db.query(User).filter(
        User.role == "intervenant",
        User.is_active == True
    ).all()

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

# ============== STATIONS ==============

@app.post("/stations", response_model=StationResponse, tags=["Stations"])
def create_station(
    station: StationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("administrator"))
):
    """
    Create a new station. Admin only.
    """
    # Check if code already exists
    existing = db.query(Station).filter(Station.code == station.code).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Station code already exists"
        )

    db_station = Station(
        name=station.name,
        code=station.code,
        address=station.address,
        governorate=station.governorate
    )
    db.add(db_station)
    db.commit()
    db.refresh(db_station)

    return db_station


@app.get("/stations", response_model=list[StationResponse], tags=["Stations"])
def get_stations(
    governorate: str | None = None,
    is_active: bool | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all stations. Any logged-in user can view.
    """
    query = db.query(Station)

    if governorate:
        query = query.filter(Station.governorate == governorate)

    if is_active is not None:
        query = query.filter(Station.is_active == is_active)

    return query.all()


@app.get("/stations/{station_id}", response_model=StationResponse, tags=["Stations"])
def get_station(
    station_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific station by ID.
    """
    station = db.query(Station).filter(Station.id == station_id).first()

    if not station:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Station not found"
        )

    return station


@app.put("/stations/{station_id}", response_model=StationResponse, tags=["Stations"])
def update_station(
    station_id: int,
    station_update: StationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("administrator"))
):
    """
    Update a station. Admin only.
    """
    station = db.query(Station).filter(Station.id == station_id).first()

    if not station:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Station not found"
        )

    # Update only provided fields
    if station_update.name is not None:
        station.name = station_update.name
    if station_update.address is not None:
        station.address = station_update.address
    if station_update.governorate is not None:
        station.governorate = station_update.governorate
    if station_update.is_active is not None:
        station.is_active = station_update.is_active

    db.commit()
    db.refresh(station)

    return station


@app.delete("/stations/{station_id}", tags=["Stations"])
def delete_station(
    station_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("administrator"))
):
    """
    Delete a station. Admin only.
    """
    station = db.query(Station).filter(Station.id == station_id).first()

    if not station:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Station not found"
        )

    db.delete(station)
    db.commit()

    return {"message": "Station deleted successfully"}


@app.put("/stations/{station_id}/manager", response_model=StationResponse, tags=["Stations"])
def assign_manager(
    station_id: int,
    request: AssignManagerRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("administrator"))
):
    """
    Assign or unassign a manager to a station. Admin only.
    """
    station = db.query(Station).filter(Station.id == station_id).first()

    if not station:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Station not found"
        )

    if request.manager_id is not None:
        # Verify manager exists and has manager role
        manager = db.query(User).filter(User.id == request.manager_id).first()

        if not manager:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        if manager.role != "manager":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User is not a manager"
            )

        # Check if manager is already assigned to another station
        existing_station = db.query(Station).filter(
            Station.manager_id == request.manager_id,
            Station.id != station_id
        ).first()

        if existing_station:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Manager is already assigned to station: {existing_station.name}"
            )

    station.manager_id = request.manager_id
    db.commit()
    db.refresh(station)

    return station