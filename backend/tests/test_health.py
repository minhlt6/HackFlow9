import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_root_endpoint(client: AsyncClient):
    """
    Test GET / root endpoint returns welcome info.
    """
    response = await client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "data" in data
    assert data["data"]["name"] == "HackFlow Backend API"
    assert "X-Process-Time-Sec" in response.headers


@pytest.mark.asyncio
async def test_health_check_endpoint(client: AsyncClient):
    """
    Test GET /api/v1/health returns standardized health data envelope.
    """
    response = await client.get("/api/v1/health")
    assert response.status_code == 200
    res_json = response.json()

    assert res_json["success"] is True
    assert res_json["data"]["status"] == "ok"
    assert res_json["data"]["project"] == "HackFlow Backend API"
    assert "database" in res_json["data"]
    assert "timestamp" in res_json["data"]
    assert res_json["message"] == "Hệ thống Backend FastAPI đang hoạt động bình thường."


@pytest.mark.asyncio
async def test_cors_headers(client: AsyncClient):
    """
    Test CORS headers for frontend allowed origin.
    """
    headers = {
        "Origin": "http://localhost:5173",
        "Access-Control-Request-Method": "GET",
    }
    response = await client.options("/api/v1/health", headers=headers)
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:5173"
