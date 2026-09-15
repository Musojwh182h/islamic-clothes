import uuid
import httpx
from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import get_settings
from app.db.session import get_db_session
from app.schemas.checkout import CheckoutRequest, CheckoutResponse
from app.schemas.customer import CustomerOrderPage, CustomerOrderResponse
from app.repositories.orders import OrderRepository
from app.services.checkout import create_order
from app.services.customer_orders import to_customer_order, to_customer_order_summary

router = APIRouter(prefix="/orders", tags=["checkout"])
bearer = HTTPBearer(auto_error=False)


async def require_user(request: Request, credentials: HTTPAuthorizationCredentials | None = Depends(bearer)) -> uuid.UUID:
    if credentials is None:
        raise HTTPException(401, "Войдите по номеру телефона", headers={"WWW-Authenticate": "Bearer"})
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


@router.get("", response_model=CustomerOrderPage)
async def list_customer_orders(
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=50),
    user_id: uuid.UUID = Depends(require_user),
    session: AsyncSession = Depends(get_db_session),
) -> CustomerOrderPage:
    orders, total = await OrderRepository(session).list_customer(user_id, offset, limit)
    return CustomerOrderPage(
        items=[to_customer_order_summary(order) for order in orders],
        total=total,
        offset=offset,
        limit=limit,
    )


@router.get("/{order_id}", response_model=CustomerOrderResponse)
async def get_customer_order(
    order_id: uuid.UUID,
    user_id: uuid.UUID = Depends(require_user),
    session: AsyncSession = Depends(get_db_session),
) -> CustomerOrderResponse:
    order = await OrderRepository(session).get_customer_by_id(order_id, user_id)
    if order is None:
        raise HTTPException(404, "Заказ не найден")
    return to_customer_order(order)


@router.post("", response_model=CheckoutResponse, status_code=201)
async def checkout(body: CheckoutRequest, request: Request,
                   idempotency_key: uuid.UUID = Header(), user_id: uuid.UUID = Depends(require_user),
                   session: AsyncSession = Depends(get_db_session)):
    return await create_order(session, request.app.state.checkout_client, get_settings().catalog_api_url,
                              user_id, idempotency_key, body)
