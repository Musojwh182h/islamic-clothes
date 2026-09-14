from app.services.storage import ObjectStorage


def test_public_url_encodes_unsafe_characters() -> None:
    storage = ObjectStorage(
        endpoint="minio:9000",
        access_key="test",
        secret_key="test-secret",
        bucket="media",
        secure=False,
        public_base_url="https://media.example.com/media/",
    )

    assert storage.public_url("products/мужская одежда.webp") == (
        "https://media.example.com/media/products/"
        "%D0%BC%D1%83%D0%B6%D1%81%D0%BA%D0%B0%D1%8F%20%D0%BE%D0%B4%D0%B5%D0%B6%D0%B4%D0%B0.webp"
    )
