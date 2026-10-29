from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./pos.db"
    jwt_secret: str = "almurasel-pos-dev-secret-change-me"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 720
    timezone: str = "Africa/Tripoli"
    admin_username: str = "admin"
    admin_password: str = "1234"
    admin_recovery_key: str | None = None
    seed_on_startup: bool = True
    backup_dir: str = "backups"
    backup_auto_enabled: bool = True
    receipt_printer_name: str = "xprinter"
    receipt_print_timeout_seconds: int = 10


settings = Settings()
