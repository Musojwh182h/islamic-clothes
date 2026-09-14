from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class RequestCodeRequest(BaseModel):
    phone: str = Field(min_length=10, max_length=24, examples=["+7 999 123-45-67"])


class RequestCodeResponse(BaseModel):
    message: str
    retry_after_seconds: int
    expires_in_seconds: int
    debug_code: str | None = Field(default=None, description="Возвращается только с SMS_PROVIDER=mock")


class VerifyCodeRequest(BaseModel):
    phone: str = Field(min_length=10, max_length=24)
    code: str = Field(pattern=r"^\d{6}$")


class UserResponse(BaseModel):
    id: UUID
    phone: str
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
