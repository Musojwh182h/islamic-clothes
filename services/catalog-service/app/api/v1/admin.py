import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db_session
from app.repositories.products import ProductRepository
from app.schemas.admin import (
    AdminProductCreate,
    AdminProductPage,
    AdminProductResponse,
    AdminProductUpdate,
    AdminStockUpdate,
)
from app.services.admin_auth import AdminAuthorizer, AuthenticatedAdmin, get_admin_authorizer
from app.services.admin_catalog import CatalogConflict, CatalogNotFound, ProductAdminService, to_admin_product

router = APIRouter(prefix="/admin/catalog", tags=["admin-catalog"])
bearer = HTTPBearer(auto_error=False)


async def require_admin(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    authorizer: AdminAuthorizer = Depends(get_admin_authorizer),
) -> AuthenticatedAdmin:
    return await authorizer.authorize(credentials)


@router.get("/products", response_model=AdminProductPage)
async def list_products(
    query: str | None = Query(default=None, max_length=120),
    is_active: bool | None = None,
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    _: AuthenticatedAdmin = Depends(require_admin),
    session: AsyncSession = Depends(get_db_session),
) -> AdminProductPage:
    products, total = await ProductRepository(session).list_admin(query, is_active, offset, limit)
    return AdminProductPage(
        items=[to_admin_product(product) for product in products],
        total=total,
        offset=offset,
        limit=limit,
    )


@router.get("/products/{product_id}", response_model=AdminProductResponse)
async def get_product(
    product_id: uuid.UUID,
    _: AuthenticatedAdmin = Depends(require_admin),
    session: AsyncSession = Depends(get_db_session),
) -> AdminProductResponse:
    product = await ProductRepository(session).get_admin_by_id(product_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Товар не найден")
    return to_admin_product(product)


@router.post("/products", response_model=AdminProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    body: AdminProductCreate,
    admin: AuthenticatedAdmin = Depends(require_admin),
    session: AsyncSession = Depends(get_db_session),
) -> AdminProductResponse:
    try:
        product = await ProductAdminService(session).create(body, admin.user_id)
    except CatalogConflict as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    return to_admin_product(product)


@router.put("/products/{product_id}", response_model=AdminProductResponse)
async def update_product(
    product_id: uuid.UUID,
    body: AdminProductUpdate,
    admin: AuthenticatedAdmin = Depends(require_admin),
    session: AsyncSession = Depends(get_db_session),
) -> AdminProductResponse:
    try:
        product = await ProductAdminService(session).update(product_id, body, admin.user_id)
    except CatalogNotFound as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except CatalogConflict as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    return to_admin_product(product)


@router.delete("/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: uuid.UUID,
    admin: AuthenticatedAdmin = Depends(require_admin),
    session: AsyncSession = Depends(get_db_session),
) -> Response:
    try:
        await ProductAdminService(session).delete(product_id, admin.user_id)
    except CatalogNotFound as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.patch("/products/{product_id}/variants/{variant_id}/stock", response_model=AdminProductResponse)
async def update_stock(
    product_id: uuid.UUID,
    variant_id: uuid.UUID,
    body: AdminStockUpdate,
    admin: AuthenticatedAdmin = Depends(require_admin),
    session: AsyncSession = Depends(get_db_session),
) -> AdminProductResponse:
    try:
        product = await ProductAdminService(session).update_stock(
            product_id,
            variant_id,
            body.stock_quantity,
            admin.user_id,
        )
    except CatalogNotFound as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return to_admin_product(product)
