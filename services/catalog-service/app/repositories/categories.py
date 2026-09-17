from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.product import ProductCategory


class CategoryRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_active(self) -> list[ProductCategory]:
        result = await self.session.scalars(
            select(ProductCategory)
            .where(ProductCategory.is_active.is_(True))
            .order_by(ProductCategory.name)
        )
        return list(result)

    async def get_active_by_name(self, name: str) -> ProductCategory | None:
        return await self.session.scalar(
            select(ProductCategory).where(
                func.lower(ProductCategory.name) == name.strip().lower(),
                ProductCategory.is_active.is_(True),
            )
        )

    async def get_by_name(self, name: str) -> ProductCategory | None:
        return await self.session.scalar(
            select(ProductCategory).where(func.lower(ProductCategory.name) == name.strip().lower())
        )
