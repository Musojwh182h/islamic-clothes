import asyncio
import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.admin_catalog import CatalogNotFound, ProductAdminService


def make_service(product: object | None) -> tuple[ProductAdminService, MagicMock]:
    session = MagicMock()
    session.commit = AsyncMock()
    session.rollback = AsyncMock()
    service = ProductAdminService(session)
    service.repository.get_admin_by_id = AsyncMock(return_value=product)
    return service, session


def test_delete_archives_product_variants_and_writes_audit_log() -> None:
    product_id = uuid.uuid4()
    product = SimpleNamespace(
        id=product_id,
        slug="classic-thobe",
        is_active=True,
        updated_at=None,
        variants=[SimpleNamespace(is_active=True), SimpleNamespace(is_active=True)],
    )
    service, session = make_service(product)

    asyncio.run(service.delete(product_id, uuid.uuid4()))

    assert product.is_active is False
    assert all(variant.is_active is False for variant in product.variants)
    assert product.updated_at is not None
    session.commit.assert_awaited_once()
    audit_log = session.add.call_args.args[0]
    assert audit_log.action == "catalog.product_deleted"
    assert audit_log.resource_id == product_id
    assert audit_log.details == {"slug": "classic-thobe", "mode": "soft_delete"}


def test_delete_is_idempotent_for_archived_product() -> None:
    product_id = uuid.uuid4()
    product = SimpleNamespace(
        id=product_id,
        slug="classic-thobe",
        is_active=False,
        updated_at=None,
        variants=[SimpleNamespace(is_active=False)],
    )
    service, session = make_service(product)

    asyncio.run(service.delete(product_id, uuid.uuid4()))

    session.commit.assert_not_awaited()
    session.add.assert_not_called()


def test_delete_rejects_unknown_product() -> None:
    product_id = uuid.uuid4()
    service, _ = make_service(None)

    with pytest.raises(CatalogNotFound, match="Товар не найден"):
        asyncio.run(service.delete(product_id, uuid.uuid4()))
