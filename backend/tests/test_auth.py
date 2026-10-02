import pytest
from httpx import AsyncClient


@pytest.mark.anyio
async def test_get_github_oauth_url(client: AsyncClient):
    """
    Ensure GET /api/v1/auth/github returns the GitHub authorization URL.
    """
    res = await client.get("/api/v1/auth/github")
    assert res.status_code == 200
    body = res.json()
    assert body["success"] is True
    assert "github.com/login/oauth/authorize" in body["data"]["url"]
    assert "client_id=" in body["data"]["url"]


@pytest.mark.anyio
async def test_register_and_login_local(client: AsyncClient):
    """
    Test registration of a new candidate and subsequent login.
    """
    email = "candidate_test@example.com"
    password = "SecretPassword123"

    # 1. Register candidate
    reg_res = await client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": password,
            "full_name": "Nguyễn Văn Test",
            "role": "candidate",
        },
    )
    assert reg_res.status_code == 201
    reg_body = reg_res.json()
    assert reg_body["success"] is True
    assert reg_body["data"]["access_token"] is not None
    assert reg_body["data"]["user"]["approval_status"] == "pending"
    assert reg_body["data"]["user"]["role"] == "candidate"

    # 2. Login with correct password
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert login_res.status_code == 200
    login_body = login_res.json()
    assert login_body["success"] is True
    token = login_body["data"]["access_token"]

    # 3. Access /auth/me with Bearer token
    me_res = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_res.status_code == 200
    me_body = me_res.json()
    assert me_body["success"] is True
    assert me_body["data"]["email"] == email


@pytest.mark.anyio
async def test_login_invalid_password(client: AsyncClient):
    """
    Test login with wrong password returns 401 Unauthorized in envelope.
    """
    # 1. Register candidate user
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "wrong_pwd_user@example.com",
            "password": "CorrectPassword123",
            "full_name": "Test User",
            "role": "candidate",
        },
    )

    # 2. Attempt login with wrong password
    res = await client.post(
        "/api/v1/auth/login",
        json={"email": "wrong_pwd_user@example.com", "password": "WrongPassword!"},
    )
    assert res.status_code == 401
    body = res.json()
    assert body["success"] is False
    assert "Email hoặc mật khẩu không chính xác" in body["message"]


@pytest.mark.anyio
async def test_register_duplicate_email(client: AsyncClient):
    """
    Test registration with existing email returns 409 Conflict.
    """
    email = "duplicate_check@example.com"
    # 1. Register first time
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "firstpassword123",
            "full_name": "Người Đầu Tiên",
            "role": "candidate",
        },
    )

    # 2. Register same email second time
    res = await client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "anotherpassword",
            "full_name": "Trùng Email",
            "role": "candidate",
        },
    )
    assert res.status_code == 409
    body = res.json()
    assert body["success"] is False
    assert "đã được đăng ký" in body["message"]


@pytest.mark.anyio
async def test_github_oauth_not_whitelisted_gets_pending(client: AsyncClient):
    """
    Thí sinh đăng nhập GitHub nhưng email KHÔNG có trong Whitelist
    → tài khoản được tạo với approval_status='pending'.
    """
    res = await client.post(
        "/api/v1/auth/github/callback",
        json={"code": "unknown_code_abc123"},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["success"] is True
    assert body["data"]["user"]["approval_status"] == "pending"
    assert body["data"]["user"]["role"] == "candidate"


@pytest.mark.anyio
async def test_github_oauth_whitelisted_gets_approved(client: AsyncClient):
    """
    BTC thêm email vào Whitelist → Thí sinh đăng nhập GitHub với email đó
    → tài khoản được tạo với approval_status='approved'.
    """
    # 1. Register an admin to manage whitelist
    admin_res = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "btc_whitelist_admin@example.com",
            "password": "adminpass123",
            "full_name": "BTC Quản Trị",
            "role": "admin",
        },
    )
    admin_token = admin_res.json()["data"]["access_token"]

    # 2. BTC adds email to whitelist
    # The mock code "whitelist_code_999" produces dev_whitelist_code_999@example.com
    whitelist_email = "dev_whitelist_code_999@example.com"
    wl_res = await client.post(
        "/api/v1/admin/whitelist",
        json={"email": whitelist_email, "note": "Thí sinh đã được chọn lọc"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert wl_res.status_code == 201

    # 3. Thí sinh đăng nhập GitHub với code sinh ra email trùng whitelist
    github_res = await client.post(
        "/api/v1/auth/github/callback",
        json={"code": "whitelist_code_999"},
    )
    assert github_res.status_code == 200
    body = github_res.json()
    assert body["success"] is True
    assert body["data"]["user"]["approval_status"] == "approved"
    assert body["data"]["user"]["role"] == "candidate"




@pytest.mark.anyio
async def test_rbac_admin_protection(client: AsyncClient):
    """
    Test that /auth/test-admin is accessible only by Admin, and rejects Candidate with 403 Forbidden.
    """
    # 1. Register candidate user
    cand_res = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "student_user@example.com",
            "password": "password123",
            "full_name": "Thí Sinh",
            "role": "candidate",
        },
    )
    cand_token = cand_res.json()["data"]["access_token"]

    # 2. Candidate attempts admin endpoint -> 403 Forbidden
    cand_admin_res = await client.get(
        "/api/v1/auth/test-admin",
        headers={"Authorization": f"Bearer {cand_token}"},
    )
    assert cand_admin_res.status_code == 403
    assert cand_admin_res.json()["success"] is False
    assert "Truy cập trái phép" in cand_admin_res.json()["message"]

    # 3. Register admin user
    admin_res = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "admin_user@example.com",
            "password": "adminpassword123",
            "full_name": "Quản Trị Viên",
            "role": "admin",
        },
    )
    admin_token = admin_res.json()["data"]["access_token"]

    # 4. Admin accesses admin endpoint -> 200 OK
    admin_access_res = await client.get(
        "/api/v1/auth/test-admin",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert admin_access_res.status_code == 200
    assert admin_access_res.json()["success"] is True


@pytest.mark.anyio
async def test_require_approved_protection(client: AsyncClient):
    """
    Test that /auth/test-approved rejects PENDING user with 403 Forbidden, and allows APPROVED user.
    """
    # 1. PENDING candidate
    cand_res = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "pending_student@example.com",
            "password": "password123",
            "full_name": "Thí Sinh Chờ Duyệt",
            "role": "candidate",
        },
    )
    pending_token = cand_res.json()["data"]["access_token"]

    # Access approved endpoint -> 403
    res_pending = await client.get(
        "/api/v1/auth/test-approved",
        headers={"Authorization": f"Bearer {pending_token}"},
    )
    assert res_pending.status_code == 403
    assert res_pending.json()["success"] is False
    assert "chưa được kích hoạt" in res_pending.json()["message"]

    # 2. Administrative user (approved by default)
    admin_res = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "judge_approved@example.com",
            "password": "password123",
            "full_name": "Giám Khảo",
            "role": "judge",
        },
    )
    approved_token = admin_res.json()["data"]["access_token"]

    res_approved = await client.get(
        "/api/v1/auth/test-approved",
        headers={"Authorization": f"Bearer {approved_token}"},
    )
    assert res_approved.status_code == 200
    assert res_approved.json()["success"] is True
