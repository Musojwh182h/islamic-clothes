import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
from jwt import InvalidTokenError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.models.user import RefreshSession, User


class AuthTokenError(ValueError):
    pass


class TokenService:
    algorithm = "HS256"

    def __init__(self, settings: Settings):
        self.settings = settings

    def decode(self, token: str, expected_type: str) -> dict[str, Any]:
        try:
            payload = jwt.decode(
                token,
                self.settings.jwt_secret,
                algorithms=[self.algorithm],
                options={"require": ["sub", "jti", "type", "iat", "exp"]},
            )
        except InvalidTokenError as exc:
            raise AuthTokenError("Недействительный или просроченный токен") from exc
        if payload.get("type") != expected_type:
            raise AuthTokenError("Неверный тип токена")
        return payload

    async def issue_pair(self, user: User, session: AsyncSession) -> tuple[str, str]:
        now = datetime.now(UTC)
        access_jti = uuid.uuid4()
        refresh_jti = uuid.uuid4()
        access_expires = now + timedelta(minutes=self.settings.access_token_minutes)
        refresh_expires = now + timedelta(days=self.settings.refresh_token_days)
        common = {"sub": str(user.id), "iat": now}

        access = jwt.encode(
            {**common, "jti": str(access_jti), "type": "access", "exp": access_expires},
            self.settings.jwt_secret,
            algorithm=self.algorithm,
        )
        refresh = jwt.encode(
            {**common, "jti": str(refresh_jti), "type": "refresh", "exp": refresh_expires},
            self.settings.jwt_secret,
            algorithm=self.algorithm,
        )
        session.add(RefreshSession(jti=refresh_jti, user_id=user.id, created_at=now, expires_at=refresh_expires))
        return access, refresh
