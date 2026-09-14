import uuid

from sqlalchemy import func, or_, select
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

    async def list_admin(
        self,
        query: str | None,
        is_active: bool | None,
        offset: int,
        limit: int,
    ) -> tuple[list[Product], int]:
        filters = []
        if query:
            pattern = f"%{query.strip()}%"
            filters.append(or_(Product.name.ilike(pattern), Product.slug.ilike(pattern)))
        if is_active is not None:
            filters.append(Product.is_active.is_(is_active))

        total = await self.session.scalar(select(func.count(Product.id)).where(*filters))
        statement = (
            select(Product)
            .where(*filters)
            .options(selectinload(Product.variants), selectinload(Product.images))
            .order_by(Product.updated_at.desc(), Product.name)
            .offset(offset)
            .limit(limit)
        )
        result = await self.session.scalars(statement)
        return list(result.unique()), int(total or 0)

    async def get_admin_by_id(self, product_id: uuid.UUID, *, for_update: bool = False) -> Product | None:
        statement = (
            select(Product)
            .where(Product.id == product_id)
            .options(selectinload(Product.variants), selectinload(Product.images))
        )
        if for_update:
            statement = statement.with_for_update()
        return await self.session.scalar(statement)
