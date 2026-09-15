import uuid
import httpx
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import get_settings
from app.db.session import get_db_session
from app.schemas.checkout import CheckoutRequest, CheckoutResponse
from app.services.checkout import create_order

router = APIRouter(prefix="/orders", tags=["checkout"])
bearer = HTTPBearer(auto_error=False)


async def require_user(request: Request, credentials: HTTPAuthorizationCredentials | None = Depends(bearer)) -> uuid.UUID:
    if credentials is None:
        raise HTTPException(401, "Для оформления заказа войдите по номеру телефона", headers={"WWW-Authenticate": "Bearer"})
    try:
        response = await request.app.state.checkout_client.get(get_settings().auth_me_url,
                    headers={"Authorization": f"Bearer {credentials.credentials}"})
        if response.status_code in (401, 403):
            raise HTTPException(401, "Сессия завершена. Войдите снова")
        if response.status_code != 200:
            raise HTTPException(503, "Сервис авторизации временно недоступен")
        user = response.json()
        if not user["is_active"]:
            raise HTTPException(401, "Сессия завершена. Войдите снова")
        return uuid.UUID(user["id"])
    except (httpx.RequestError, ValueError, KeyError, TypeError) as exc:
        raise HTTPException(503, "Не удалось проверить пользователя") from exc


@router.post("", response_model=CheckoutResponse, status_code=201)
async def checkout(body: CheckoutRequest, request: Request,
                   idempotency_key: uuid.UUID = Header(), user_id: uuid.UUID = Depends(require_user),
                   session: AsyncSession = Depends(get_db_session)):
    return await create_order(session, request.app.state.checkout_client, get_settings().catalog_api_url,
                              user_id, idempotency_key, body)
