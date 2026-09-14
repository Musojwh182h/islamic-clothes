from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "SABR Media API"
    api_v1_prefix: str = "/api/v1"
    minio_endpoint: str = "minio:9000"
    minio_access_key: str
    minio_secret_key: str
    minio_bucket: str = "sabr-product-media"
    minio_secure: bool = False
    media_public_base_url: str = "http://localhost:9000/sabr-product-media"
    auth_me_url: str = "http://auth-api:8000/api/v1/auth/me"
    backend_cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    max_upload_bytes: int = 12 * 1024 * 1024
    max_image_pixels: int = 36_000_000
    max_output_dimension: int = 2400

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.backend_cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
