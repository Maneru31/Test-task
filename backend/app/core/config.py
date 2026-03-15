from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/wishify"

    # Redis
    REDIS_URL: str = "redis://localhost:6379"

    # JWT
    JWT_SECRET: str = "changeme-use-64-random-chars-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Google OAuth
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    # App
    FRONTEND_URL: str = "http://localhost:3000"
    ALLOWED_ORIGINS: str = "http://localhost:3000"


settings = Settings()
