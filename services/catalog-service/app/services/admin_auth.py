import uuid
from dataclasses import dataclass

import httpx
from fastapi import HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials


@dataclass(frozen=True)
class AuthenticatedAdmin:
    user_id: uuid.UUID
    email: str


class AdminAuthorizer:
    def __init__(self, client: httpx.AsyncClient, auth_me_url: str):
        self.client = client
        self.auth_me_url = auth_me_url

    async def authorize(self, credentials: HTTPAuthorizationCredentials | None) -> AuthenticatedAdmin:
        if credentials is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Требуется авторизация администратора",
                headers={"WWW-Authenticate": "Bearer"},
            )
        try:
            response = await self.client.get(
                self.auth_me_url,
                headers={"Authorization": f"Bearer {credentials.credentials}"},
            )
        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Сервис авторизации временно недоступен",
            ) from exc
        if response.status_code == status.HTTP_401_UNAUTHORIZED:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Недействительная сессия",
                headers={"WWW-Authenticate": "Bearer"},
            )
        if response.status_code != status.HTTP_200_OK:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Не удалось проверить права доступа",
            )
        user = response.json()
        if user.get("role") != "admin" or not user.get("is_active"):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Недостаточно прав")
        try:
            user_id = uuid.UUID(user["id"])
        except (KeyError, TypeError, ValueError) as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Сервис авторизации вернул некорректный ответ",
            ) from exc
        return AuthenticatedAdmin(user_id=user_id, email=user["email"])


def get_admin_authorizer(request: Request) -> AdminAuthorizer:
    return request.app.state.admin_authorizer
