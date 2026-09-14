import asyncio

from sqlalchemy import select

from app.core.config import get_settings
from app.db.session import AsyncSessionLocal, engine
from app.models.user import User
from app.services.phone import InvalidPhoneNumber, normalize_russian_phone


async def bootstrap_admin() -> None:
    settings = get_settings()
    if not settings.admin_phone.strip():
        return
    try:
        phone = normalize_russian_phone(settings.admin_phone)
    except InvalidPhoneNumber as exc:
        raise RuntimeError("ADMIN_PHONE must contain a valid Russian phone number") from exc

    async with AsyncSessionLocal() as session:
        user = await session.scalar(select(User).where(User.phone == phone))
        if user is None:
            session.add(User(phone=phone, role="admin", is_active=True))
        else:
            user.role = "admin"
            user.is_active = True
        await session.commit()
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(bootstrap_admin())
