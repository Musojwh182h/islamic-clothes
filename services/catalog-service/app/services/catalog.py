from urllib.parse import quote

from app.core.config import get_settings
from app.models.product import Product
from app.schemas.product import ProductPreview, ProductVariantResponse

settings = get_settings()


def public_media_url(object_key: str) -> str:
    if not object_key:
        return ""
    return f"{settings.media_public_base_url.rstrip('/')}/{quote(object_key, safe='/')}"


def to_product_preview(product: Product) -> ProductPreview:
    available_variants = [variant for variant in product.variants if variant.stock_quantity > 0]
    image = public_media_url(product.images[0].object_key) if product.images else ""
    return ProductPreview(
        id=product.id,
        slug=product.slug,
        name=product.name,
        description=product.description,
        category=product.category,
        price_kopecks=product.price_kopecks,
        color=product.color,
        material=product.material,
        tone=product.tone,
        sizes=[variant.size for variant in available_variants],
        variants=[
            ProductVariantResponse(
                id=variant.id,
                sku=variant.sku,
                size=variant.size,
                stock_quantity=variant.stock_quantity,
            )
            for variant in available_variants
        ],
        image=image,
        is_new=product.is_new,
    )
