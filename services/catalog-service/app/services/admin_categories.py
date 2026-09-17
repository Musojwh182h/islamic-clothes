import uuid

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.product import AdminAuditLog, ProductCategory
from app.repositories.categories import CategoryRepository
from app.schemas.admin import AdminCategoryCreate
from app.services.admin_catalog import CatalogConflict


class CategoryAdminService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repository = CategoryRepository(session)

    async def create(self, data: AdminCategoryCreate, actor_user_id: uuid.UUID) -> ProductCategory:
        existing = await self.repository.get_by_name(data.name)
        if existing is not None:
            raise CatalogConflict("Такая категория уже существует")

        category = ProductCategory(name=data.name, is_active=True)
        self.session.add(category)
        try:
            await self.session.flush()
            self.session.add(
                AdminAuditLog(
                    actor_user_id=actor_user_id,
                    action="catalog.category_created",
                    resource_type="category",
                    resource_id=category.id,
                    details={"name": category.name},
                )
            )
            await self.session.commit()
        except IntegrityError as exc:
            await self.session.rollback()
            raise CatalogConflict("Такая категория уже существует") from exc
        await self.session.refresh(category)
        return category
