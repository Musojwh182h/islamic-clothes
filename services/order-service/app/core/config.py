from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://app:change-me-in-production@postgres:5432/orders_db"
    rabbitmq_url: str = "amqp://app:change-me-in-production@rabbitmq:5672/"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
