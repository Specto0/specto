import os
from dotenv import load_dotenv

# Carrega o .env que está na pasta backend-specto
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
ENV_PATH = os.path.join(BASE_DIR, ".env")
load_dotenv(ENV_PATH)

class Settings:
    def __init__(self) -> None:
        # Lê a variável RAILWAY_DATABASE_URL do .env
        self.database_url: str | None = os.getenv("DATABASE_URL")
        self.secret_key: str = os.getenv("SECRET_KEY", "ChurrascoMorterini")
        self.access_token_expire_minutes: int = int(
            os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60")
        )

settings = Settings()
