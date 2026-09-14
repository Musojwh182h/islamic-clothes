from fastapi import APIRouter

from app.schemas.product import ProductPreview

router = APIRouter(prefix="/catalog", tags=["catalog"])

# Временный контракт API: на следующем этапе этот список заменит запрос к PostgreSQL.
MOCK_PRODUCTS = [
    {
        "id": 1,
        "slug": "kandura-sand",
        "name": "Кандура «Песок»",
        "category": "Кандуры",
        "price": "6490",
        "sizes": ["S", "M", "L", "XL", "XXL"],
        "image": "/media/products/kandura-sand.png",
        "is_new": True,
    },
    {
        "id": 2,
        "slug": "jubba-noir",
        "name": "Джубба «Ночь»",
        "category": "Джуббы",
        "price": "7890",
        "sizes": ["M", "L", "XL", "XXL"],
        "image": "/media/products/jubba-noir.png",
        "is_new": False,
    },
]


@router.get("/products", response_model=list[ProductPreview])
async def list_products() -> list[ProductPreview]:
    return [ProductPreview(**product) for product in MOCK_PRODUCTS]
