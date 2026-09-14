from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    api_v1_prefix: str = "/api/v1"
    database_url: str = "postgresql+asyncpg://app:change-me-in-production@postgres:5432/orders_db"
    rabbitmq_url: str = "amqp://app:change-me-in-production@rabbitmq:5672/"
    auth_me_url: str = "http://auth-api:8000/api/v1/auth/me"
    backend_cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.backend_cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
