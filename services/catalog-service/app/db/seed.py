import asyncio
import uuid

from sqlalchemy import select

from app.db.session import AsyncSessionLocal, engine
from app.models.product import Product, ProductImage, ProductVariant

PRODUCTS = [
    {
        "id": "11111111-1111-4111-8111-111111111111",
        "slug": "kandura-sand",
        "name": "Кандура «Песок»",
        "description": "Лёгкая мужская кандура свободного прямого кроя.",
        "category": "Кандуры",
        "price_kopecks": 649000,
        "color": "Песочный",
        "material": "Хлопок и лён",
        "tone": "sand",
        "is_new": True,
        "image": "/images/products/kandura-sand.png",
        "sizes": ["S", "M", "L", "XL", "XXL"],
    },
    {
        "id": "22222222-2222-4222-8222-222222222222",
        "slug": "jubba-noir",
        "name": "Джубба «Ночь»",
        "description": "Строгая мужская джубба из плотного матового хлопка.",
        "category": "Джуббы",
        "price_kopecks": 789000,
        "color": "Чёрный",
        "material": "Премиальный хлопок",
        "tone": "noir",
        "is_new": False,
        "image": "/images/products/jubba-noir.png",
        "sizes": ["M", "L", "XL", "XXL"],
    },
    {
        "id": "33333333-3333-4333-8333-333333333333",
        "slug": "thobe-olive",
        "name": "Тоб «Олива»",
        "description": "Повседневный мужской тоб в спокойном оливковом оттенке.",
        "category": "Тобы",
        "price_kopecks": 719000,
        "color": "Оливковый",
        "material": "Мягкий хлопок",
        "tone": "olive",
        "is_new": True,
        "image": "/images/products/thobe-olive.png",
        "sizes": ["S", "M", "L", "XL"],
    },
    {
        "id": "44444444-4444-4444-8444-444444444444",
        "slug": "jubba-milk",
        "name": "Джубба «Молоко»",
        "description": "Светлая мужская джубба с аккуратным воротником-стойкой.",
        "category": "Джуббы",
        "price_kopecks": 759000,
        "color": "Молочный",
        "material": "Хлопок и лён",
        "tone": "milk",
        "is_new": False,
        "image": "/images/products/jubba-milk.png",
        "sizes": ["M", "L", "XL", "XXL"],
    },
]


def variant_id(product_id: str, size: str) -> uuid.UUID:
    return uuid.uuid5(uuid.UUID(product_id), size)


async def seed() -> None:
    async with AsyncSessionLocal() as session:
        existing = await session.scalar(select(Product.id).limit(1))
        if existing:
            return
        for data in PRODUCTS:
            product_id = uuid.UUID(data["id"])
            product = Product(
                id=product_id,
                slug=data["slug"],
                name=data["name"],
                description=data["description"],
                category=data["category"],
                price_kopecks=data["price_kopecks"],
                color=data["color"],
                material=data["material"],
                tone=data["tone"],
                is_new=data["is_new"],
            )
            product.images.append(ProductImage(url=data["image"], alt_text=data["name"], sort_order=0))
            product.variants.extend(
                ProductVariant(
                    id=variant_id(data["id"], size),
                    sku=f"{data['slug'].upper()}-{size}",
                    size=size,
                    stock_quantity=12,
                    sort_order=index,
                )
                for index, size in enumerate(data["sizes"])
            )
            session.add(product)
        await session.commit()
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
