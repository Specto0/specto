from typing import Optional

from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    database_ssl_mode: str = "verify"
    database_ssl_cert: Optional[str] = None
    secret_key: str
    access_token_expire_minutes: int = 60


    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()
