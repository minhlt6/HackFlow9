from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text

from app.core.config import settings

# Create async engine with connection pooling and pre-ping
_engine_kwargs = {"echo": False, "pool_pre_ping": True, "pool_recycle": 300}
if not settings.async_database_url.startswith("sqlite"):
    _engine_kwargs["pool_size"] = 5
    _engine_kwargs["max_overflow"] = 10
    _engine_kwargs["connect_args"] = {"statement_cache_size": 0}

engine = create_async_engine(
    settings.async_database_url,
    **_engine_kwargs,
)

# Async session factory
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)


def switch_to_sqlite_fallback() -> None:
    """
    Switch the global async engine and session factory to local SQLite (hackflow.db)
    when the remote PostgreSQL host is unreachable (e.g. IPv6-only Supabase direct URL on IPv4 container).
    """
    global engine, AsyncSessionLocal
    sqlite_url = "sqlite+aiosqlite:///./hackflow.db"
    engine = create_async_engine(
        sqlite_url,
        echo=False,
        pool_pre_ping=True,
    )
    AsyncSessionLocal.configure(bind=engine)
    AsyncSessionLocal = async_sessionmaker(
        bind=engine,
        class_=AsyncSession,
        autocommit=False,
        autoflush=False,
        expire_on_commit=False,
    )


class Base(DeclarativeBase):
    """
    Base class for all SQLAlchemy 2.0 Declarative Models.
    """
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency yielding an async database session per request.
    Rolls back automatically in case of uncaught exceptions.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            if session.new or session.dirty or session.deleted:
                await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def check_db_connection() -> bool:
    """
    Utility to verify database connectivity (used in health checks).
    Returns True if database is reachable, False otherwise.
    """
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
            return True
    except Exception:
        return False
