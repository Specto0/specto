from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from .settings import settings

# Cria o engine assíncrono com a URL da DB vinda do .env
engine = create_async_engine(
    settings.database_url,
    pool_pre_ping=True,
)

# Session factory
SessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

# Dependency para FastAPI
async def get_session() -> AsyncSession:
    async with SessionLocal() as session:
        yield session
