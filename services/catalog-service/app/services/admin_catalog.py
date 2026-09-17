import uuid
from datetime import UTC, datetime

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.product import AdminAuditLog, Product, ProductCategory, ProductImage, ProductVariant
from app.repositories.categories import CategoryRepository
from app.repositories.products import ProductRepository
from app.schemas.admin import (
    AdminProductCreate,
    AdminProductImageResponse,
    AdminProductResponse,
    AdminProductUpdate,
    AdminProductVariantResponse,
    AdminProductVisibilityUpdate,
)
from app.services.catalog import public_media_url


class CatalogConflict(ValueError):
    pass


class CatalogNotFound(ValueError):
    pass


def to_admin_product(product: Product) -> AdminProductResponse:
    return AdminProductResponse(
        id=product.id,
        slug=product.slug,
        name=product.name,
        description=product.description,
        category=product.category,
        price_kopecks=product.price_kopecks,
        color=product.color,
        material=product.material,
        tone=product.tone,
        is_active=product.is_active,
        is_new=product.is_new,
        variants=[
            AdminProductVariantResponse(
                id=variant.id,
                sku=variant.sku,
                size=variant.size,
                stock_quantity=variant.stock_quantity,
                sort_order=variant.sort_order,
                is_active=variant.is_active,
            )
            for variant in product.variants
        ],
        images=[
            AdminProductImageResponse(
                id=image.id,
                object_key=image.object_key,
                url=public_media_url(image.object_key),
                alt_text=image.alt_text,
                sort_order=image.sort_order,
            )
            for image in product.images
        ],
        created_at=product.created_at,
        updated_at=product.updated_at,
    )


class ProductAdminService:
    product_fields = (
        "slug",
        "name",
        "description",
        "category",
        "price_kopecks",
        "color",
        "material",
        "tone",
        "is_active",
        "is_new",
    )

    def __init__(self, session: AsyncSession):
        self.session = session
        self.repository = ProductRepository(session)
        self.category_repository = CategoryRepository(session)

    async def create(self, data: AdminProductCreate, actor_user_id: uuid.UUID) -> Product:
        category = await self._require_category(data.category)
        product_values = {field: getattr(data, field) for field in self.product_fields}
        product_values["category"] = category.name
        product = Product(**product_values)
        product.variants = [
            ProductVariant(
                sku=item.sku,
                size=item.size,
                stock_quantity=item.stock_quantity,
                sort_order=item.sort_order,
                is_active=item.is_active,
            )
            for item in data.variants
        ]
        product.images = [
            ProductImage(object_key=item.object_key, alt_text=item.alt_text, sort_order=item.sort_order)
            for item in data.images
        ]
        self.session.add(product)
        try:
            await self.session.flush()
        except IntegrityError as exc:
            await self.session.rollback()
            raise CatalogConflict("Адрес товара, артикул или размер уже используется. Укажите другое значение") from exc
        self._audit(actor_user_id, "catalog.product_created", product.id, {"slug": product.slug})
        await self._commit_or_conflict()
        return await self._reload(product.id)

    async def update(self, product_id: uuid.UUID, data: AdminProductUpdate, actor_user_id: uuid.UUID) -> Product:
        product = await self.repository.get_admin_by_id(product_id, for_update=True)
        if product is None:
            raise CatalogNotFound("Товар не найден")
        if data.expected_updated_at and product.updated_at != data.expected_updated_at:
            raise CatalogConflict("Товар уже изменён другим администратором. Обновите данные")
        category = await self._require_category(data.category)

        for field in self.product_fields:
            setattr(product, field, category.name if field == "category" else getattr(data, field))
        self._sync_variants(product, data)
        self._sync_images(product, data)
        product.updated_at = datetime.now(UTC)
        self._audit(actor_user_id, "catalog.product_updated", product.id, {"slug": product.slug})
        await self._commit_or_conflict()
        return await self._reload(product.id)

    async def update_stock(
        self,
        product_id: uuid.UUID,
        variant_id: uuid.UUID,
        stock_quantity: int,
        actor_user_id: uuid.UUID,
    ) -> Product:
        product = await self.repository.get_admin_by_id(product_id, for_update=True)
        variant = next((item for item in product.variants if item.id == variant_id), None) if product else None
        if variant is None:
            raise CatalogNotFound("Вариант товара не найден")
        previous = variant.stock_quantity
        variant.stock_quantity = stock_quantity
        product.updated_at = datetime.now(UTC)
        self._audit(
            actor_user_id,
            "catalog.stock_updated",
            product_id,
            {"variant_id": str(variant_id), "from": previous, "to": stock_quantity},
        )
        await self._commit_or_conflict()
        return await self._reload(product_id)

    async def set_visibility(
        self,
        product_id: uuid.UUID,
        data: AdminProductVisibilityUpdate,
        actor_user_id: uuid.UUID,
    ) -> Product:
        product = await self.repository.get_admin_by_id(product_id, for_update=True)
        if product is None:
            raise CatalogNotFound("Товар не найден")
        if data.expected_updated_at and product.updated_at != data.expected_updated_at:
            raise CatalogConflict("Товар уже изменён другим администратором. Обновите список")
        if data.is_active and not any(variant.is_active for variant in product.variants):
            raise CatalogConflict("Перед публикацией включите хотя бы один размер товара")

        previous = product.is_active
        product.is_active = data.is_active
        product.updated_at = datetime.now(UTC)
        self._audit(
            actor_user_id,
            "catalog.product_visibility_changed",
            product.id,
            {"from": previous, "to": data.is_active},
        )
        await self._commit_or_conflict()
        return await self._reload(product.id)

    async def delete(self, product_id: uuid.UUID, actor_user_id: uuid.UUID) -> None:
        """Archive a product while preserving references from historical orders."""
        product = await self.repository.get_admin_by_id(product_id, for_update=True)
        if product is None:
            raise CatalogNotFound("Товар не найден")

        # DELETE remains idempotent: a repeated request does not create another audit event.
        if not product.is_active:
            return

        product.is_active = False
        for variant in product.variants:
            variant.is_active = False
        product.updated_at = datetime.now(UTC)
        self._audit(
            actor_user_id,
            "catalog.product_deleted",
            product.id,
            {"slug": product.slug, "mode": "soft_delete"},
        )
        await self._commit_or_conflict()

    def _sync_variants(self, product: Product, data: AdminProductUpdate) -> None:
        existing = {variant.id: variant for variant in product.variants}
        retained: set[uuid.UUID] = set()
        for item in data.variants:
            if item.id is None:
                product.variants.append(
                    ProductVariant(
                        sku=item.sku,
                        size=item.size,
                        stock_quantity=item.stock_quantity,
                        sort_order=item.sort_order,
                        is_active=item.is_active,
                    )
                )
                continue
            variant = existing.get(item.id)
            if variant is None:
                raise CatalogConflict("Один из вариантов принадлежит другому товару или удалён")
            retained.add(item.id)
            variant.sku = item.sku
            variant.size = item.size
            variant.stock_quantity = item.stock_quantity
            variant.sort_order = item.sort_order
            variant.is_active = item.is_active
        for variant_id, variant in existing.items():
            if variant_id not in retained:
                variant.is_active = False

    def _sync_images(self, product: Product, data: AdminProductUpdate) -> None:
        existing = {image.id: image for image in product.images}
        synchronized: list[ProductImage] = []
        for item in data.images:
            if item.id is None:
                synchronized.append(
                    ProductImage(object_key=item.object_key, alt_text=item.alt_text, sort_order=item.sort_order)
                )
                continue
            image = existing.get(item.id)
            if image is None:
                raise CatalogConflict("Одно из изображений принадлежит другому товару или удалено")
            image.object_key = item.object_key
            image.alt_text = item.alt_text
            image.sort_order = item.sort_order
            synchronized.append(image)
        product.images = synchronized

    def _audit(
        self,
        actor_user_id: uuid.UUID,
        action: str,
        resource_id: uuid.UUID,
        details: dict,
    ) -> None:
        self.session.add(
            AdminAuditLog(
                actor_user_id=actor_user_id,
                action=action,
                resource_type="product",
                resource_id=resource_id,
                details=details,
            )
        )

    async def _commit_or_conflict(self) -> None:
        try:
            await self.session.commit()
        except IntegrityError as exc:
            await self.session.rollback()
            raise CatalogConflict("Адрес товара, артикул или размер уже используется. Укажите другое значение") from exc

    async def _reload(self, product_id: uuid.UUID) -> Product:
        product = await self.repository.get_admin_by_id(product_id)
        if product is None:
            raise CatalogNotFound("Товар не найден")
        return product

    async def _require_category(self, name: str) -> ProductCategory:
        category = await self.category_repository.get_active_by_name(name)
        if category is None:
            raise CatalogConflict("Категория не найдена. Сначала добавьте её в админке")
        return category
