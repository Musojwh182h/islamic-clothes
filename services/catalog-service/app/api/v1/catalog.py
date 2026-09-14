from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db_session
from app.repositories.products import ProductRepository
from app.schemas.product import ProductPreview
from app.services.catalog import to_product_preview

router = APIRouter(prefix="/catalog", tags=["catalog"])


@router.get("/products", response_model=list[ProductPreview])
async def list_products(
    category: str | None = Query(default=None, max_length=80),
    session: AsyncSession = Depends(get_db_session),
) -> list[ProductPreview]:
    products = await ProductRepository(session).list_active(category)
    return [to_product_preview(product) for product in products]


@router.get("/products/{slug}", response_model=ProductPreview)
async def get_product(slug: str, session: AsyncSession = Depends(get_db_session)) -> ProductPreview:
    product = await ProductRepository(session).get_active_by_slug(slug)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Товар не найден")
    return to_product_preview(product)
