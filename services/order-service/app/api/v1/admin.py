import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db_session
from app.repositories.orders import OrderRepository
from app.schemas.admin import AdminOrderPage, AdminOrderResponse, AdminOrderStatusUpdate, OrderStatus
from app.services.admin_auth import AdminAuthorizer, AuthenticatedAdmin, get_admin_authorizer
from app.services.admin_orders import OrderAdminService, OrderConflict, OrderNotFound, to_admin_order

router = APIRouter(prefix="/admin/orders", tags=["admin-orders"])
bearer = HTTPBearer(auto_error=False)


async def require_admin(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    authorizer: AdminAuthorizer = Depends(get_admin_authorizer),
) -> AuthenticatedAdmin:
    return await authorizer.authorize(credentials)


@router.get("", response_model=AdminOrderPage)
async def list_orders(
    query: str | None = Query(default=None, max_length=120),
    order_status: OrderStatus | None = None,
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    _: AuthenticatedAdmin = Depends(require_admin),
    session: AsyncSession = Depends(get_db_session),
) -> AdminOrderPage:
    orders, total = await OrderRepository(session).list_admin(query, order_status, offset, limit)
    return AdminOrderPage(
        items=[to_admin_order(order) for order in orders],
        total=total,
        offset=offset,
        limit=limit,
    )


@router.get("/{order_id}", response_model=AdminOrderResponse)
async def get_order(
    order_id: uuid.UUID,
    _: AuthenticatedAdmin = Depends(require_admin),
    session: AsyncSession = Depends(get_db_session),
) -> AdminOrderResponse:
    order = await OrderRepository(session).get_admin_by_id(order_id)
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Заказ не найден")
    return to_admin_order(order)


@router.patch("/{order_id}/status", response_model=AdminOrderResponse)
async def update_order_status(
    order_id: uuid.UUID,
    body: AdminOrderStatusUpdate,
    admin: AuthenticatedAdmin = Depends(require_admin),
    session: AsyncSession = Depends(get_db_session),
) -> AdminOrderResponse:
    try:
        order = await OrderAdminService(session).update_status(order_id, body, admin.user_id)
    except OrderNotFound as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except OrderConflict as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    return to_admin_order(order)
