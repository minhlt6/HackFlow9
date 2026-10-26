import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.main import app as fastapi_app
from app.core.database import Base, get_db
import app.models  # Ensure all models are loaded onto Base.metadata

from sqlalchemy.pool import StaticPool

# In-memory async SQLite engine with shared cache for lightning-fast, isolated tests
test_engine = create_async_engine(
    "sqlite+aiosqlite:///file:testmem?mode=memory&cache=shared&uri=true",
    echo=False,
    poolclass=StaticPool,
    connect_args={"check_same_thread": False},
)

TestSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)


@pytest.fixture(autouse=True)
async def setup_test_database():
    """
    Create all tables in memory before each test and drop them after.
    """
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await test_engine.dispose()


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture
async def db_session():
    """
    Async database session fixture for test setup and assertions.
    """
    async with TestSessionLocal() as session:
        yield session


@pytest.fixture
async def client():
    """
    Async HTTP client for testing FastAPI application with in-memory DB override.
    """
    async def override_get_db():
        async with TestSessionLocal() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise
            finally:
                await session.close()

    fastapi_app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=fastapi_app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac
    fastapi_app.dependency_overrides.clear()



@pytest.fixture(autouse=True)
def enable_test_personas(monkeypatch):
    """Legacy demo fixtures are explicitly enabled only inside the isolated test suite."""
    from app.core.config import settings
    monkeypatch.setattr(settings, "ENVIRONMENT", "test")
    monkeypatch.setattr(settings, "ENABLE_DEMO_DATA", True)


@pytest.fixture(autouse=True)
def isolate_sidecar_storage(monkeypatch):
    """Reset in-memory admin metadata caches between tests."""
    from app.api.v1.endpoints import admin
    monkeypatch.setattr(admin, "_TEAM_ADMIN_META", {})
    monkeypatch.setattr(admin, "_PERSONNEL_EXTRA_META", {})
