import uuid

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.order import Order


class OrderRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    @staticmethod
    def _load_relations():
        return (selectinload(Order.items), selectinload(Order.history), selectinload(Order.payments))

    async def list_admin(
        self,
        query: str | None,
        order_status: str | None,
        offset: int,
        limit: int,
    ) -> tuple[list[Order], int]:
        filters = []
        if query:
            pattern = f"%{query.strip()}%"
            filters.append(or_(Order.number.ilike(pattern), Order.customer_phone.ilike(pattern)))
        if order_status:
            filters.append(Order.status == order_status)
        total = await self.session.scalar(select(func.count(Order.id)).where(*filters))
        statement = (
            select(Order)
            .where(*filters)
            .options(*self._load_relations())
            .order_by(Order.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        result = await self.session.scalars(statement)
        return list(result.unique()), int(total or 0)

    async def get_admin_by_id(self, order_id: uuid.UUID, *, for_update: bool = False) -> Order | None:
        statement = select(Order).where(Order.id == order_id).options(*self._load_relations())
        if for_update:
            statement = statement.with_for_update()
        return await self.session.scalar(statement)

    async def list_customer(
        self,
        user_id: uuid.UUID,
        offset: int,
        limit: int,
    ) -> tuple[list[Order], int]:
        customer_filter = Order.user_id == user_id
        total = await self.session.scalar(select(func.count(Order.id)).where(customer_filter))
        statement = (
            select(Order)
            .where(customer_filter)
            .options(selectinload(Order.items))
            .order_by(Order.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        result = await self.session.scalars(statement)
        return list(result.unique()), int(total or 0)

    async def get_customer_by_id(self, order_id: uuid.UUID, user_id: uuid.UUID) -> Order | None:
        statement = (
            select(Order)
            .where(Order.id == order_id, Order.user_id == user_id)
            .options(selectinload(Order.items), selectinload(Order.history))
        )
        return await self.session.scalar(statement)
