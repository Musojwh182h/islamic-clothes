from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.product import Product


class ProductRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_active(self, category: str | None = None) -> list[Product]:
        statement = (
            select(Product)
            .where(Product.is_active.is_(True))
            .options(selectinload(Product.variants), selectinload(Product.images))
            .order_by(Product.created_at, Product.name)
        )
        if category:
            statement = statement.where(Product.category == category)
        result = await self.session.scalars(statement)
        return list(result.unique())

    async def get_active_by_slug(self, slug: str) -> Product | None:
        statement = (
            select(Product)
            .where(Product.slug == slug, Product.is_active.is_(True))
            .options(selectinload(Product.variants), selectinload(Product.images))
        )
        return await self.session.scalar(statement)
