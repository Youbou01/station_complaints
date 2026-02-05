"""
Station Complaints API - Main Application


All routes are defined here, schemas are imported from schemas.py
"""

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from database import engine, get_db
from models import Base, Complaint, User, Station, Department, Rating
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
    DepartmentCreate,
    DepartmentUpdate,
    DepartmentResponse,
    RatingCreate,
    RatingResponse,
    AssignAssistantRequest,
    ManagerFeedbackCreate,
)
from security import hash_password, verify_password
from auth import create_access_token
from auth_dependencies import get_current_user, require_roles
from enums import ComplaintStatusEnum, ComplaintTypeEnum, RoleEnum


# Create database tables
#i removed it, because i'll handle schema with alembic now
# Base.metadata.create_all(bind=engine)

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


@app.post("/register", response_model=UserResponse, tags=["Authentication"])
def register_user(
    user: UserCreate,
    db: Session = Depends(get_db)
):
    """
    Self-registration endpoint for new users.
    Creates inactive users that need admin approval.
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
        role=user.role.value,
        is_active=False  # Inactive until admin approves
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    return db_user


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
    If station_id is provided, validates that manager is assigned to that station.
    If not provided, uses manager's station (for single-station managers).
    Status starts as "open" and goes to assistant for review.
    """
    # Get manager's stations
    stations = db.query(Station).filter(Station.manager_id == current_user.id).all()
    
    if not stations:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are not assigned to any station"
        )
    
    # Determine which station to use
    if complaint.station_id is not None:
        # Verify manager is assigned to this station
        station = db.query(Station).filter(
            Station.id == complaint.station_id,
            Station.manager_id == current_user.id
        ).first()
        
        if not station:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not assigned to this station"
            )
    else:
        # Use first station (backward compatible for single-station managers)
        station = stations[0]
    
    # Create complaint with status "open" (no auto-assignment)
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
    - Assistant: Only complaints from their assigned stations
    - Intervenant: Only complaints assigned to them
    - Director: All complaints (for review)
    """
    query = db.query(Complaint)
    
    # Role-based filtering
    if current_user.role == "manager":
        stations = db.query(Station).filter(Station.manager_id == current_user.id).all()
        if stations:
            station_ids = [s.id for s in stations]
            query = query.filter(Complaint.station_id.in_(station_ids))
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
        stations = db.query(Station).filter(Station.manager_id == current_user.id).all()
        station_ids = [s.id for s in stations]
        if not stations or complaint.station_id not in station_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view complaints from your stations"
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
    Sets the assigned_at timestamp when assigning for the first time.
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
    
    # Set assigned_at timestamp if this is the first assignment
    if not complaint.assigned_at:
        complaint.assigned_at = datetime.now(timezone.utc)
    
    db.commit()
    db.refresh(complaint)
    
    return complaint


@app.post("/complaints/{complaint_id}/send", response_model=ComplaintResponse, tags=["Complaints"])
def send_complaint(
    complaint_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("assistant"))
):
    """
    Send complaint to appropriate intervenant (auto-assign based on complaint type).
    This is called when assistant clicks the "Send" button.
    Only works for complaints with status "open".
    """
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found"
        )
    
    if complaint.status != "open":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only send complaints with 'open' status"
        )
    
    # Auto-assign based on department
    department = db.query(Department).filter(
        Department.complaint_type == complaint.type
    ).first()
    
    if not department:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No department found for complaint type: {complaint.type}"
        )
    
    if not department.intervenant_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Department '{department.name}' has no intervenant assigned"
        )
    
    # Verify intervenant is active
    intervenant = db.query(User).filter(User.id == department.intervenant_id).first()
    if not intervenant or not intervenant.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Assigned intervenant is not active"
        )
    
    complaint.assigned_to_id = department.intervenant_id
    complaint.status = "assigned"
    complaint.assigned_at = datetime.now(timezone.utc)
    
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
    - Assistant: Can update any complaint (including on_hold)
    Tracks time spent on hold and excludes it from resolution time.
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
        allowed_statuses = ["in_progress", "resolved","on_hold"]
        if status_update.status.value not in allowed_statuses:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"You can only set status to: {', '.join(allowed_statuses)}"
            )
    
    # Handle on_hold time tracking
    # When setting to on_hold: record the timestamp
    if status_update.status == ComplaintStatusEnum.ON_HOLD:
        complaint.on_hold_at = datetime.now(timezone.utc)
    
    # When changing from on_hold to another status: calculate and accumulate time
    if complaint.status == "on_hold" and status_update.status != ComplaintStatusEnum.ON_HOLD:
        if complaint.on_hold_at:
            on_hold_duration = (datetime.now(timezone.utc) - complaint.on_hold_at).total_seconds()
            complaint.total_on_hold_seconds = (complaint.total_on_hold_seconds or 0) + on_hold_duration
            complaint.on_hold_at = None
    
    complaint.status = status_update.status.value
    
    if status_update.resolution_notes:
        complaint.resolution_notes = status_update.resolution_notes
    
    if status_update.status == ComplaintStatusEnum.RESOLVED:
        complaint.resolved_at = datetime.now(timezone.utc)
    
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

    station.manager_id = request.manager_id
    db.commit()
    db.refresh(station)

    return station


@app.put("/stations/{station_id}/assistant", response_model=StationResponse, tags=["Stations"])
def assign_assistant(
    station_id: int,
    request: AssignAssistantRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("administrator"))
):
    """
    Assign or unassign an assistant to a station. Admin only.
    """
    station = db.query(Station).filter(Station.id == station_id).first()

    if not station:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Station not found"
        )

    if request.assistant_id is not None:
        # Verify assistant exists and has assistant role
        assistant = db.query(User).filter(User.id == request.assistant_id).first()

        if not assistant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        if assistant.role != "assistant":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User is not an assistant"
            )

    station.assistant_id = request.assistant_id
    db.commit()
    db.refresh(station)

    return station


# ============== DEPARTMENTS ==============

@app.post("/departments", response_model=DepartmentResponse, tags=["Departments"])
def create_department(
    department: DepartmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("administrator"))
):
    """
    Create a new department. Admin only.
    Links complaint types to specific intervenants for auto-assignment.
    """
    # Check if complaint type already has a department
    existing = db.query(Department).filter(
        Department.complaint_type == department.complaint_type.value
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Department for complaint type '{department.complaint_type.value}' already exists"
        )
    
    # Verify intervenant if provided
    if department.intervenant_id:
        intervenant = db.query(User).filter(User.id == department.intervenant_id).first()
        if not intervenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Intervenant not found"
            )
        if intervenant.role != "intervenant":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User is not an intervenant"
            )
        # Check if intervenant is already assigned to another department
        existing_dept = db.query(Department).filter(
        Department.intervenant_id == department.intervenant_id).first()

        if existing_dept:
            raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"This intervenant is already assigned to department: {existing_dept.name}"
        )
    
    db_department = Department(
        name=department.name,
        complaint_type=department.complaint_type.value,
        intervenant_id=department.intervenant_id
    )
    db.add(db_department)
    db.commit()
    db.refresh(db_department)
    
    return db_department


@app.get("/departments", response_model=list[DepartmentResponse], tags=["Departments"])
def get_departments(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("administrator", "assistant"))
):
    """
    Get all departments. Admin and assistant only.
    """
    return db.query(Department).all()


@app.get("/departments/{department_id}", response_model=DepartmentResponse, tags=["Departments"])
def get_department(
    department_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("administrator", "assistant"))
):
    """
    Get a specific department by ID.
    """
    department = db.query(Department).filter(Department.id == department_id).first()
    
    if not department:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found"
        )
    
    return department


@app.put("/departments/{department_id}", response_model=DepartmentResponse, tags=["Departments"])
def update_department(
    department_id: int,
    department_update: DepartmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("administrator"))
):
    """
    Update a department. Admin only.
    """
    department = db.query(Department).filter(Department.id == department_id).first()
    
    if not department:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found"
        )
    
    if department_update.name is not None:
        department.name = department_update.name
    
    if department_update.intervenant_id is not None:
        # Verify intervenant
        intervenant = db.query(User).filter(User.id == department_update.intervenant_id).first()
        if not intervenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Intervenant not found"
            )
        if intervenant.role != "intervenant":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User is not an intervenant"
            )
        
        # Check if intervenant is already assigned to another department
        existing_dept = db.query(Department).filter(
        Department.intervenant_id == department_update.intervenant_id,
        Department.id != department_id  # Exclude current department
    ).first()
    
        if existing_dept:
            raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"This intervenant is already assigned to department: {existing_dept.name}"
        )
        department.intervenant_id = department_update.intervenant_id
    db.commit()
    db.refresh(department)
    
    return department


@app.delete("/departments/{department_id}", tags=["Departments"])
def delete_department(
    department_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("administrator"))
):
    """
    Delete a department. Admin only.
    """
    department = db.query(Department).filter(Department.id == department_id).first()
    
    if not department:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found"
        )
    
    db.delete(department)
    db.commit()
    
    return {"message": "Department deleted successfully"}


# ============== RATINGS ==============

@app.post("/ratings", response_model=RatingResponse, tags=["Ratings"])
def create_rating(
    rating: RatingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("director"))
):
    """
    Create a rating for a resolved complaint. Director only.
    Resolution time is calculated automatically.
    """
    complaint = db.query(Complaint).filter(Complaint.id == rating.complaint_id).first()
    
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found"
        )
    
    if complaint.status != "resolved":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only rate resolved complaints"
        )
    
    if not complaint.assigned_to_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Complaint has no assigned intervenant"
        )
    
    if not complaint.resolved_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Complaint has no resolution date"
        )
    
    # Check if already rated
    existing_rating = db.query(Rating).filter(
        Rating.complaint_id == rating.complaint_id
    ).first()
    
    if existing_rating:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Complaint already rated"
        )
    
    # Calculate resolution time in hours (from assignment to resolution)
    if complaint.assigned_at:
        resolution_time_seconds = (complaint.resolved_at - complaint.assigned_at).total_seconds()
        # Subtract time spent on hold
        resolution_time_seconds -= (complaint.total_on_hold_seconds or 0)
        # Ensure resolution time doesn't go negative
        resolution_time_seconds = max(0, resolution_time_seconds)
        resolution_time = resolution_time_seconds / 3600
    else:
        # Fallback to created_at if assigned_at is not set (for old complaints)
        resolution_time_seconds = (complaint.resolved_at - complaint.created_at).total_seconds()
        resolution_time_seconds -= (complaint.total_on_hold_seconds or 0)
        # Ensure resolution time doesn't go negative
        resolution_time_seconds = max(0, resolution_time_seconds)
        resolution_time = resolution_time_seconds / 3600
    
    db_rating = Rating(
        complaint_id=rating.complaint_id,
        intervenant_id=complaint.assigned_to_id,
        director_id=current_user.id,
        resolution_time_hours=resolution_time,
        rating_score=rating.rating_score
    )
    
    db.add(db_rating)
    db.commit()
    db.refresh(db_rating)
    
    return db_rating


@app.get("/ratings", response_model=list[RatingResponse], tags=["Ratings"])
def get_ratings(
    intervenant_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("director", "administrator"))
):
    """
    Get all ratings. Director and admin only.
    Can filter by intervenant.
    """
    query = db.query(Rating)
    
    if intervenant_id:
        query = query.filter(Rating.intervenant_id == intervenant_id)
    
    return query.order_by(Rating.created_at.desc()).all()


@app.get("/ratings/{rating_id}", response_model=RatingResponse, tags=["Ratings"])
def get_rating(
    rating_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("director", "administrator"))
):
    """
    Get a specific rating by ID.
    """
    rating = db.query(Rating).filter(Rating.id == rating_id).first()
    
    if not rating:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rating not found"
        )
    
    return rating

@app.get("/my-ratings", response_model=list[RatingResponse], tags=["Ratings"])
def get_my_ratings(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("intervenant"))
):
    """
    Get ratings for the current intervenant's complaints.
    """
    return db.query(Rating).filter(
        Rating.intervenant_id == current_user.id
    ).order_by(Rating.created_at.desc()).all()


# ============== MANAGER FEEDBACK ==============

@app.post("/complaints/{complaint_id}/feedback", response_model=ComplaintResponse, tags=["Complaints"])
def add_manager_feedback(
    complaint_id: int,
    feedback: ManagerFeedbackCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("manager"))
):
    """
    Manager adds feedback on a resolved complaint.
    Only the manager who created the complaint can add feedback.
    Only for resolved complaints.
    """
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    
    if complaint.created_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only add feedback to complaints you created")
    
    if complaint.status != "resolved":
        raise HTTPException(status_code=400, detail="Can only add feedback to resolved complaints")
    
    complaint.manager_feedback = feedback.feedback
    complaint.manager_feedback_at = datetime.now(timezone.utc)
    
    db.commit()
    db.refresh(complaint)
    
    return complaint