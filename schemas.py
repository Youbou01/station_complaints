"""
Pydantic schemas for request/response validation.

These define the shape of data coming into and out of the API.
They are NOT database models - those are in models.py
"""

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


# ============== COMPLAINT SCHEMAS ==============

class ComplaintCreate(BaseModel):
    """Schema for creating a new complaint."""
    station_id: int = Field(ge=1)
    type: ComplaintTypeEnum
    description: str = Field(min_length=10)
    severity: int = Field(ge=1, le=5)


class ComplaintStatusUpdate(BaseModel):
    """Schema for updating complaint status."""
    status: ComplaintStatusEnum  # Now validated against the enum!


class ComplaintResponse(BaseModel):
    """Schema for complaint data in responses."""
    id: int
    station_id: int
    type: str
    description: str
    severity: int
    status: str

    class Config:
        from_attributes = True
# Without from_attributes:
#return {"id": user.id, "email": user.email, ...}  # Manual, tedious

# With from_attributes:
#return UserResponse.from_orm(user)  # Automatic!

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

    class Config:
        from_attributes = True


class AssignManagerRequest(BaseModel):
    """Schema for assigning a manager to a station."""
    manager_id: int | None  # None to unassign