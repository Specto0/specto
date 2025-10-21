import asyncio
import os
import sys
import ssl
from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine

# --- garantir import do pacote app ---
BASE_DIR = os.path.dirname(os.path.dirname(__file__))  # raiz do backend
if BASE_DIR not in sys.path:
    sys.path.append(BASE_DIR)

# --- importa settings e Base ---
from app.core.settings import settings
from app.models import Base

# Alembic Config
config = context.config

# Logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Metadata p/ autogenerate
target_metadata = Base.metadata

def get_url() -> str:
    return settings.database_url

def make_ssl_context() -> ssl.SSLContext:
    """
    *** MODO PERMISSIVO ***
    Necessário quando o Railway está atrás de proxy com certificado self-signed.
    """
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx

def run_migrations_offline() -> None:
    url = get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()

def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()

async def run_migrations_online() -> None:
    connectable: AsyncEngine = create_async_engine(
        get_url(),
        poolclass=pool.NullPool,
        connect_args={"ssl": make_ssl_context()},   # <-- usa o contexto permissivo
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()

def run_online() -> None:
    asyncio.run(run_migrations_online())

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_online()
