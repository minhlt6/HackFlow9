import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_envelope_success(client: AsyncClient):
    """
    Test success envelope format: {"success": true, "data": ..., "message": "..."}
    """
    response = await client.get("/api/v1/examples/success")
    assert response.status_code == 200
    res_json = response.json()

    assert res_json["success"] is True
    assert res_json["data"] == {
        "framework": "FastAPI",
        "architecture": "3-Tier",
        "envelope": "ApiResponse[T]",
    }
    assert res_json["message"] == "Dữ liệu mẫu trả về thành công!"


@pytest.mark.asyncio
async def test_envelope_not_found_error(client: AsyncClient):
    """
    Test NotFoundException returns 404 with error envelope.
    """
    response = await client.get("/api/v1/examples/error-not-found")
    assert response.status_code == 404
    res_json = response.json()

    assert res_json["success"] is False
    assert res_json["data"] is None
    assert "Không tìm thấy" in res_json["message"]


@pytest.mark.asyncio
async def test_envelope_bad_request_error(client: AsyncClient):
    """
    Test BadRequestException returns 400 with error envelope.
    """
    response = await client.get("/api/v1/examples/error-bad-request")
    assert response.status_code == 400
    res_json = response.json()

    assert res_json["success"] is False
    assert res_json["data"] is None
    assert "Tham số yêu cầu không hợp lệ" in res_json["message"]


@pytest.mark.asyncio
async def test_envelope_validation_error(client: AsyncClient):
    """
    Test Pydantic RequestValidationError (422) is converted into standard envelope.
    """
    # Gửi body rỗng hoặc sai kiểu để kích hoạt validation error
    response = await client.post("/api/v1/examples/validation", json={"name": "a"})
    assert response.status_code == 422
    res_json = response.json()

    assert res_json["success"] is False
    assert "Validation Error" in res_json["message"]
    assert isinstance(res_json["data"], list)
    assert len(res_json["data"]) > 0
