import uuid

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.session import get_db_session
from app.models.user import User
from app.services.events import EventPublisher
from app.services.tokens import AuthTokenError, TokenService

bearer = HTTPBearer(auto_error=False)
token_service = TokenService(get_settings())


def get_redis(request: Request) -> Redis:
    return request.app.state.redis


def get_publisher(request: Request) -> EventPublisher:
    return request.app.state.publisher


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    session: AsyncSession = Depends(get_db_session),
) -> User:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Требуется авторизация",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None:
        raise unauthorized
    try:
        payload = token_service.decode(credentials.credentials, "access")
        user_id = uuid.UUID(payload["sub"])
    except (AuthTokenError, ValueError, KeyError):
        raise unauthorized from None
    user = await session.scalar(select(User).where(User.id == user_id, User.is_active.is_(True)))
    if user is None:
        raise unauthorized
    return user
