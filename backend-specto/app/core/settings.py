import os
from dotenv import load_dotenv

# Carrega o .env que está na pasta backend-specto
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
ENV_PATH = os.path.join(BASE_DIR, ".env")
load_dotenv(ENV_PATH)

class Settings:
    def __init__(self) -> None:
        # Prefer `DATABASE_URL` (used commonly) but fall back to `RAILWAY_DATABASE_URL`.
        # Keep None if neither are set so caller can decide. For local development
        # you can set `DATABASE_URL=sqlite+aiosqlite:///./specto.db` in `.env`.
        self.database_url: str | None = os.getenv("DATABASE_URL")
        self.secret_key: str = os.getenv("SECRET_KEY", "ChurrascoMorterini")
        self.access_token_expire_minutes: int = int(
            os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60")
        )

settings = Settings()
