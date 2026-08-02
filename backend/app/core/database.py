import os
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://excelpilot:excelpilot@localhost:5432/excelpilot")

# TEMP DEBUG: log only the scheme, never credentials or host.
raw_scheme = DATABASE_URL.split("://", 1)[0] + "://"
print(f"[DB-DEBUG] Raw scheme: {raw_scheme}")

# Railway exposes DATABASE_URL as postgresql://... or postgres://... (sync driver format).
# create_async_engine requires an async dialect; normalize to postgresql+asyncpg://
# so SQLAlchemy uses asyncpg instead of trying to load psycopg2.
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
elif DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)

# TEMP DEBUG: log only the scheme, never credentials or host.
normalized_scheme = DATABASE_URL.split("://", 1)[0] + "://"
print(f"[DB-DEBUG] Normalized scheme: {normalized_scheme}")

engine = create_async_engine(DATABASE_URL, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with async_session() as session:
        yield session


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
