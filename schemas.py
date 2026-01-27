"""
Pydantic schemas for request/response validation.

These define the shape of data coming into and out of the API.
They are NOT database models - those are in models.py
"""

from datetime import datetime
from pydantic import BaseModel, Field, EmailStr
from enums import RoleEnum, ComplaintTypeEnum, ComplaintStatusEnum


# ============== USER SCHEMAS ==============

class UserCreate(BaseModel):
    """Schema for creating a new user."""
    email: EmailStr
    password: str = Field(min_length=8)
    role: RoleEnum


class UserResponse(BaseModel):
    """Schema for user data in responses (no password!)."""
    id: int
    email: str
    role: str
    is_active: bool

    class Config:
        from_attributes = True  # Allows converting SQLAlchemy models to this schema


class UserLogin(BaseModel):
    """Schema for login request."""
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    """Schema for login response."""
    access_token: str
    token_type: str = "bearer"

# ============== STATION SCHEMAS ==============

class StationCreate(BaseModel):
    """Schema for creating a new station."""
    name: str = Field(min_length=2)
    code: str = Field(min_length=3)
    address: str | None = None
    governorate: str = Field(min_length=2)


class StationUpdate(BaseModel):
    """Schema for updating a station."""
    name: str | None = None
    address: str | None = None
    governorate: str | None = None
    is_active: bool | None = None


class StationResponse(BaseModel):
    """Schema for station data in responses."""
    id: int
    name: str
    code: str
    address: str | None
    governorate: str
    is_active: bool
    manager_id: int | None
    assistant_id: int | None

    class Config:
        from_attributes = True


class AssignManagerRequest(BaseModel):
    """Schema for assigning a manager to a station."""
    manager_id: int | None  # None to unassign

# ============== COMPLAINT SCHEMAS ==============

class ComplaintCreate(BaseModel):
    """Schema for creating a new complaint."""
    title: str = Field(min_length=5)
    type: ComplaintTypeEnum
    description: str = Field(min_length=3)
    severity: int = Field(ge=1, le=10)

class ComplaintAssign(BaseModel):
    assigned_to_id: int

class ComplaintUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    type: ComplaintTypeEnum | None = None
    severity: int | None = Field(default=None, ge=1, le=5)

class ComplaintStatusUpdate(BaseModel):
    """Schema for updating complaint status."""
    status: ComplaintStatusEnum 
    resolution_notes: str | None = None

class ComplaintResponse(BaseModel):
    id: int
    title: str
    description: str
    type: str
    severity: int
    status: str
    station_id: int
    created_by_id: int
    assigned_to_id: int | None
    resolution_notes: str | None
    created_at: datetime
    updated_at: datetime | None
    resolved_at: datetime | None

    class Config:
        from_attributes = True
# Without from_attributes:
#return {"id": user.id, "email": user.email, ...}  # Manual, tedious

# With from_attributes:
#return UserResponse.from_orm(user)  # Automatic!

class ComplaintDetailResponse(ComplaintResponse):
    station: StationResponse
    created_by: UserResponse
    assigned_to: UserResponse | None

    class Config:
        from_attributes = True


# ============== DEPARTMENT SCHEMAS ==============

class DepartmentCreate(BaseModel):
    """Schema for creating a new department."""
    name: str = Field(min_length=2)
    complaint_type: ComplaintTypeEnum
    intervenant_id: int | None = None


class DepartmentUpdate(BaseModel):
    """Schema for updating a department."""
    name: str | None = None
    intervenant_id: int | None = None


class DepartmentResponse(BaseModel):
    """Schema for department data in responses."""
    id: int
    name: str
    complaint_type: str
    intervenant_id: int | None

    class Config:
        from_attributes = True


# ============== RATING SCHEMAS ==============

class RatingCreate(BaseModel):
    """Schema for creating a new rating."""
    complaint_id: int
    rating_score: int = Field(ge=1, le=5)


class RatingResponse(BaseModel):
    """Schema for rating data in responses."""
    id: int
    complaint_id: int
    intervenant_id: int
    director_id: int
    resolution_time_hours: float
    rating_score: int
    created_at: datetime

    class Config:
        from_attributes = True


# ============== ASSISTANT ASSIGNMENT SCHEMAS ==============

class AssignAssistantRequest(BaseModel):
    """Schema for assigning an assistant to a station."""
    assistant_id: int | None  # None to unassign


