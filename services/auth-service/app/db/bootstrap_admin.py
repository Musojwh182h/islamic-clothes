import asyncio

from sqlalchemy import select

from app.core.config import get_settings
from app.db.session import AsyncSessionLocal, engine
from app.models.user import User
from app.services.email import InvalidEmailAddress, normalize_email


async def bootstrap_admin() -> None:
    settings = get_settings()
    if not settings.admin_email.strip():
        return
    try:
        email = normalize_email(settings.admin_email)
    except InvalidEmailAddress as exc:
        raise RuntimeError("ADMIN_EMAIL must contain a valid email address") from exc

    async with AsyncSessionLocal() as session:
        user = await session.scalar(select(User).where(User.email == email))
        if user is None:
            user = await session.scalar(
                select(User)
                .where(User.role == "admin", User.email.like("legacy-%@invalid.local"))
                .order_by(User.created_at)
                .limit(1)
            )
        if user is None:
            user = User(email=email, role="admin", is_active=True)
            session.add(user)
        else:
            user.email = email
        user.role = "admin"
        user.is_active = True
        await session.commit()
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(bootstrap_admin())
