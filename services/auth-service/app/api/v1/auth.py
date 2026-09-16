import uuid
from datetime import UTC, datetime

from aio_pika.exceptions import AMQPException
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import get_current_user, get_publisher, get_redis
from app.core.config import get_settings
from app.db.session import get_db_session
from app.models.user import RefreshSession, User
from app.schemas.auth import (
    MessageResponse,
    RequestCodeRequest,
    RequestCodeResponse,
    TokenPairResponse,
    UserResponse,
    VerifyCodeRequest,
)
from app.services.events import EventPublisher
from app.services.email import normalize_email
from app.services.otp import OtpService
from app.services.tokens import AuthTokenError, TokenService

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()
token_service = TokenService(settings)


def token_response(user: User, access: str) -> TokenPairResponse:
    return TokenPairResponse(
        access_token=access,
        expires_in=settings.access_token_minutes * 60,
        user=UserResponse.model_validate(user),
    )


def set_refresh_cookie(response: Response, refresh_token: str) -> None:
    response.set_cookie(
        key=settings.refresh_cookie_name,
        value=refresh_token,
        max_age=settings.refresh_token_days * 24 * 60 * 60,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path=f"{settings.api_v1_prefix}/auth",
    )


@router.post("/request-code", response_model=RequestCodeResponse, status_code=status.HTTP_202_ACCEPTED)
async def request_code(
    body: RequestCodeRequest,
    redis: Redis = Depends(get_redis),
    publisher: EventPublisher = Depends(get_publisher),
) -> RequestCodeResponse:
    email = normalize_email(body.email)
    otp = OtpService(redis, settings)
    code, allowed = await otp.issue(email)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Новый код можно запросить через {settings.otp_cooldown_seconds} секунд",
            headers={"Retry-After": str(settings.otp_cooldown_seconds)},
        )
    try:
        await publisher.publish(
            "auth.email_code_requested",
            {"email": email, "code": code, "expires_in_seconds": settings.otp_ttl_seconds},
        )
    except (AMQPException, RuntimeError) as exc:
        await otp.cancel(email)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Сервис отправки писем временно недоступен") from exc
    return RequestCodeResponse(
        message="Код отправлен",
        retry_after_seconds=settings.otp_cooldown_seconds,
        expires_in_seconds=settings.otp_ttl_seconds,
        debug_code=code if settings.email_provider == "mock" else None,
    )


@router.post("/verify-code", response_model=TokenPairResponse)
async def verify_code(
    body: VerifyCodeRequest,
    response: Response,
    redis: Redis = Depends(get_redis),
    session: AsyncSession = Depends(get_db_session),
) -> TokenPairResponse:
    email = normalize_email(body.email)
    result = await OtpService(redis, settings).verify(email, body.code)
    if result == -1:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Код истёк или не был запрошен")
    if result == -2:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Слишком много попыток. Запросите новый код")
    if result > 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Неверный код")

    user = await session.scalar(select(User).where(User.email == email))
    if user is None:
        user = User(email=email)
        session.add(user)
        await session.flush()
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Пользователь заблокирован")

    access, refresh = await token_service.issue_pair(user, session)
    await session.commit()
    set_refresh_cookie(response, refresh)
    return token_response(user, access)


@router.post("/refresh", response_model=TokenPairResponse)
async def refresh_tokens(request: Request, response: Response, session: AsyncSession = Depends(get_db_session)) -> TokenPairResponse:
    refresh_token = request.cookies.get(settings.refresh_cookie_name)
    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh-сессия отсутствует")
    try:
        payload = token_service.decode(refresh_token, "refresh")
        jti = uuid.UUID(payload["jti"])
        user_id = uuid.UUID(payload["sub"])
    except (AuthTokenError, ValueError, KeyError) as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Недействительный refresh-токен") from exc

    refresh_session = await session.scalar(select(RefreshSession).where(RefreshSession.jti == jti))
    user = await session.scalar(select(User).where(User.id == user_id, User.is_active.is_(True)))
    now = datetime.now(UTC)
    if refresh_session is None or refresh_session.revoked_at is not None or refresh_session.expires_at <= now or user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh-сессия недействительна")

    refresh_session.revoked_at = now
    access, refresh = await token_service.issue_pair(user, session)
    await session.commit()
    set_refresh_cookie(response, refresh)
    return token_response(user, access)


@router.post("/logout", response_model=MessageResponse)
async def logout(request: Request, response: Response, session: AsyncSession = Depends(get_db_session)) -> MessageResponse:
    refresh_token = request.cookies.get(settings.refresh_cookie_name)
    response.delete_cookie(key=settings.refresh_cookie_name, path=f"{settings.api_v1_prefix}/auth")
    if not refresh_token:
        return MessageResponse(message="Сессия завершена")
    try:
        payload = token_service.decode(refresh_token, "refresh")
        jti = uuid.UUID(payload["jti"])
    except (AuthTokenError, ValueError, KeyError):
        return MessageResponse(message="Сессия завершена")
    refresh_session = await session.scalar(select(RefreshSession).where(RefreshSession.jti == jti))
    if refresh_session and refresh_session.revoked_at is None:
        refresh_session.revoked_at = datetime.now(UTC)
        await session.commit()
    return MessageResponse(message="Сессия завершена")


@router.get("/me", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_user)) -> User:
    return user
