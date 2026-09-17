import asyncio
import uuid
from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.schemas.admin import AdminProductVisibilityUpdate
from app.services.admin_catalog import CatalogConflict, ProductAdminService


def make_service(product: object) -> tuple[ProductAdminService, MagicMock]:
    session = MagicMock()
    session.commit = AsyncMock()
    session.rollback = AsyncMock()
    service = ProductAdminService(session)
    service.repository.get_admin_by_id = AsyncMock(return_value=product)
    service._reload = AsyncMock(return_value=product)
    return service, session


def test_hides_product_without_disabling_sizes() -> None:
    product = SimpleNamespace(
        id=uuid.uuid4(),
        is_active=True,
        updated_at=datetime.now(UTC),
        variants=[SimpleNamespace(is_active=True)],
    )
    service, session = make_service(product)

    result = asyncio.run(
        service.set_visibility(
            product.id,
            AdminProductVisibilityUpdate(is_active=False),
            uuid.uuid4(),
        )
    )

    assert result.is_active is False
    assert product.variants[0].is_active is True
    session.commit.assert_awaited_once()


def test_cannot_publish_product_without_active_size() -> None:
    product = SimpleNamespace(
        id=uuid.uuid4(),
        is_active=False,
        updated_at=datetime.now(UTC),
        variants=[SimpleNamespace(is_active=False)],
    )
    service, _ = make_service(product)

    with pytest.raises(CatalogConflict, match="хотя бы один размер"):
        asyncio.run(
            service.set_visibility(
                product.id,
                AdminProductVisibilityUpdate(is_active=True),
                uuid.uuid4(),
            )
        )
