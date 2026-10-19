from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./pos.db"
    jwt_secret: str = "almurasel-pos-dev-secret-change-me"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 720
    timezone: str = "Africa/Tripoli"
    admin_username: str = "admin"
    admin_password: str = "admin123"
    seed_on_startup: bool = True


settings = Settings()
