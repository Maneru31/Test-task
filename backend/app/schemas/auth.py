import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    display_name: str = Field(min_length=1, max_length=100)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: uuid.UUID
    email: str
    display_name: str
    avatar_url: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class RefreshResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class GuestTokenResponse(BaseModel):
    guest_token: str
    display_name: str


class GuestCreateRequest(BaseModel):
    display_name: str = Field(min_length=1, max_length=100)


class UpdateMeRequest(BaseModel):
    display_name: str | None = Field(default=None, min_length=1, max_length=100)
    avatar_url: str | None = None
