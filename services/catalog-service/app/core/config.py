from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Sabr Store API"
    debug: bool = False
    api_v1_prefix: str = "/api/v1"
    database_url: str = "postgresql+asyncpg://app:change-me-in-production@postgres:5432/catalog_db"
    redis_url: str = "redis://redis:6379/0"
    rabbitmq_url: str = "amqp://app:change-me-in-production@rabbitmq:5672/"
    backend_cors_origins: str = "http://localhost:5173"
    media_public_base_url: str = "http://localhost:9000/sabr-product-media"
    auth_me_url: str = "http://auth-api:8000/api/v1/auth/me"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.backend_cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
