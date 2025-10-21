import ssl
import certifi
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from .settings import settings

def make_ssl_context(strict: bool = True) -> ssl.SSLContext:
    if strict:
        # Verifica usando certifi
        ctx = ssl.create_default_context(cafile=certifi.where())
        return ctx
    else:
        # Fallback: aceita certificado sem verificação (usar só se o strict falhar)
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        return ctx


ssl_context = make_ssl_context(strict=False)

engine = create_async_engine(
    settings.database_url,        
    pool_pre_ping=True,
    connect_args={"ssl": ssl_context},
)

SessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

async def get_session() -> AsyncSession:
    async with SessionLocal() as session:
        yield session
