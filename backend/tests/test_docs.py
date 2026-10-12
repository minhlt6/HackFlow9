import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_swagger_ui_accessible(client: AsyncClient):
    """
    Test Swagger UI endpoint (/docs) returns HTTP 200 HTML page.
    """
    response = await client.get("/docs")
    assert response.status_code == 200
    assert "swagger-ui" in response.text.lower()


@pytest.mark.asyncio
async def test_redoc_ui_accessible(client: AsyncClient):
    """
    Test ReDoc endpoint (/redoc) returns HTTP 200 HTML page.
    """
    response = await client.get("/redoc")
    assert response.status_code == 200
    assert "redoc" in response.text.lower()


@pytest.mark.asyncio
async def test_openapi_json_schema(client: AsyncClient):
    """
    Test OpenAPI 3.1.0 JSON schema endpoint (/api/v1/openapi.json)
    validates title, version, tags, paths, and security schemes.
    """
    response = await client.get("/api/v1/openapi.json")
    assert response.status_code == 200
    schema = response.json()

    assert "openapi" in schema
    assert "info" in schema
    assert "HackFlow" in schema["info"]["title"]
    assert "paths" in schema
    assert "/api/v1/health" in schema["paths"]
    assert "/api/v1/auth/login" in schema["paths"]
    assert "/api/v1/teams" in schema["paths"]
    assert "/api/v1/topics" in schema["paths"]
    assert "/api/v1/admin/whitelist" in schema["paths"]
    assert "/api/v1/checkpoints" in schema["paths"]

    # Validate tags
    tag_names = [t["name"] for t in schema.get("tags", [])]
    assert "Auth (HF-19)" in tag_names
    assert "Teams (HF-20)" in tag_names
    assert "Topics (HF-21)" in tag_names
    assert "Admin" in tag_names
    assert "Checkpoints (HF-32)" in tag_names
