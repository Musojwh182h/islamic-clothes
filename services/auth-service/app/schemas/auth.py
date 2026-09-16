from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class RequestCodeRequest(BaseModel):
    email: EmailStr = Field(examples=["customer@example.com"])


class RequestCodeResponse(BaseModel):
    message: str
    retry_after_seconds: int
    expires_in_seconds: int
    debug_code: str | None = Field(default=None, description="Возвращается только с EMAIL_PROVIDER=mock")


class VerifyCodeRequest(BaseModel):
    email: EmailStr
    code: str = Field(pattern=r"^\d{6}$")


class UserResponse(BaseModel):
    id: UUID
    email: EmailStr
    role: str
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TokenPairResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse


class MessageResponse(BaseModel):
    message: str
