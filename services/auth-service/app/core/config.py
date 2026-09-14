from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    api_v1_prefix: str = "/api/v1"
    database_url: str = "postgresql+asyncpg://app:change-me-in-production@postgres:5432/auth_db"
    redis_url: str = "redis://redis:6379/0"
    rabbitmq_url: str = "amqp://app:change-me-in-production@rabbitmq:5672/"
    backend_cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    sms_provider: str = "mock"
    jwt_secret: str = "dev-only-jwt-secret-change-in-production"
    otp_secret: str = "dev-only-otp-secret-change-in-production"
    access_token_minutes: int = 15
    refresh_token_days: int = 30
    refresh_cookie_name: str = "sabr_refresh"
    cookie_secure: bool = False
    otp_ttl_seconds: int = 300
    otp_cooldown_seconds: int = 60
    otp_max_attempts: int = 5
    admin_phone: str = ""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.backend_cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
