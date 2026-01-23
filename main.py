from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware 
from pydantic import BaseModel, Field
from fastapi import HTTPException, Depends, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import Optional

from database import engine, get_db
from models import Base, Complaint, User
from security import hash_password, verify_password
from auth import create_access_token
from auth_dependencies import get_current_user, require_roles


Base.metadata.create_all(bind=engine)

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],  #  Angular app's address
    allow_credentials=True,  # Allows cookies/auth headers to be sent
    allow_methods=["*"],  # Allows all HTTP methods (GET, POST, PUT, DELETE, etc.)
    allow_headers=["*"],  # Allows all headers (including Authorization)
)

class ComplaintCreate(BaseModel):
    station_id:int = Field(ge=1)
    type:str
    description:str = Field(min_length=10)
    severity:int = Field(ge=1,le=5)


@app.post("/complaints")
def create_complaint(
    complaint: ComplaintCreate,
    db: Session = Depends(get_db), #fastapi opens session,injects it and then closes auto
    current_user : User = Depends(require_roles("manager"))
):
    db_complaint = Complaint(
        station_id=complaint.station_id,
        type=complaint.type,
        description=complaint.description,
        severity=complaint.severity
    )

    db.add(db_complaint) #Stage object for insertion
    db.commit() #Actually writes to DB
    db.refresh(db_complaint) #Reloads object from DB, Gives the auto-generated id



    return db_complaint

@app.get("/complaints") #get returns data, no body
def get_complaints(
    status: Optional[str] = None,
    station_id: Optional[int] = None,
    type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("assistant", "director"))
):
    query = db.query(Complaint)
    #db.query(Complaint) → SELECT * FROM complaints, .all() fetches everything as python list
    if status:
        query = query.filter(Complaint.status == status)

    if station_id:
        query = query.filter(Complaint.station_id == station_id)

    if type:
        query = query.filter(Complaint.type == type)
    
    return query.all() #query is sqlalchemy Query object
    
#FastAPI automatically converts SQLAlchemy objects → JSON.

@app.get("/complaints/{complaint_id}")
def get_specific_complaint(
    complaint_id: int,
    db: Session = Depends(get_db)
):
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
                                    #→ WHERE id = ?                     returns one row or None
    if complaint is None:
        raise HTTPException(status_code=404, detail="Complaint not found")

    return complaint

class ComplaintStatusUpdate(BaseModel):
    status: str

@app.put("/complaints/{complaint_id}/status")
def update_complaint_status(
    complaint_id: int,
    payload: ComplaintStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("intervenant"))
):
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()

    if complaint is None:
        raise HTTPException(status_code=404, detail="Complaint not found")

    complaint.status = payload.status
    db.commit()
    db.refresh(complaint)

    return complaint

class UserCreate(BaseModel):
    email: str
    password: str
    role: str
@app.post("/users")
def create_user(
    user:UserCreate,
    db: Session = Depends(get_db)
):
    hashed=hash_password(user.password)
    db_user = User(
        email=user.email,
        password_hash=hashed,
        role=user.role
    )
    db.add(db_user) #notice similiarity to git
    db.commit()
    db.refresh(db_user)
    return {
        "id": db_user.id,
        "email": db_user.email,
        "role": db_user.role
    }

@app.post("/login")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)

):

    user = db.query(User).filter(User.email == form_data.username).first()

    if not user:
        raise HTTPException(status_code=400, detail="Incorrect email or password")

    if not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect email or password")

    access_token = create_access_token(
        data={
            "user_id": user.id,
            "role": user.role
        }
    )

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }



@app.get("/")
def root():
    return {"message": "Backend is running"}

@app.get("/me")
def read_my_profile(current_user: User = Depends(get_current_user)):
    #Protected route = route that depends on something that can fail

    #Depends(get_current_user) is the gatekeeper
    return {
        "id": current_user.id,
        "email": current_user.email,
        "role": current_user.role,
        "is_active": current_user.is_active
    }
