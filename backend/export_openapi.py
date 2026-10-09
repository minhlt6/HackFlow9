"""
HackFlow9 — OpenAPI Export Script
Xuất lược đồ OpenAPI 3.1.0 (Swagger Spec) từ ứng dụng FastAPI
Lưu ra tệp: docs/backend/openapi.json
"""

import json
import os
import sys
from pathlib import Path

# Ensure UTF-8 output on Windows console
if sys.stdout.encoding.lower() != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Add backend directory to sys.path to allow absolute imports
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from app.main import app


def export_openapi_schema():
    print("[*] Generating OpenAPI specification from FastAPI app...")
    openapi_schema = app.openapi()

    # Ensure security scheme is documented clearly for Frontend & Postman
    components = openapi_schema.setdefault("components", {})
    security_schemes = components.setdefault("securitySchemes", {})
    if "HTTPBearer" not in security_schemes:
        security_schemes["HTTPBearer"] = {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
            "description": "JWT Access Token được cấp sau khi đăng nhập /auth/login hoặc /auth/github/callback. Thêm header: `Authorization: Bearer <token>`.",
        }
    else:
        security_schemes["HTTPBearer"]["bearerFormat"] = "JWT"
        security_schemes["HTTPBearer"][
            "description"
        ] = "JWT Access Token được cấp sau khi đăng nhập /auth/login hoặc /auth/github/callback. Thêm header: `Authorization: Bearer <token>`."

    # Define destination path
    root_dir = BASE_DIR.parent
    docs_backend_dir = root_dir / "docs" / "backend"
    docs_backend_dir.mkdir(parents=True, exist_ok=True)

    output_path = docs_backend_dir / "openapi.json"

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(openapi_schema, f, ensure_ascii=False, indent=2)

    total_paths = len(openapi_schema.get("paths", {}))
    total_endpoints = sum(
        len(methods) for methods in openapi_schema.get("paths", {}).values()
    )
    total_tags = len(openapi_schema.get("tags", []))

    print(f"[SUCCESS] Exported OpenAPI schema successfully!")
    print(f"   - Output file : {output_path}")
    print(f"   - Title       : {openapi_schema.get('info', {}).get('title')}")
    print(f"   - Version     : {openapi_schema.get('info', {}).get('version')}")
    print(f"   - Tags count  : {total_tags}")
    print(f"   - Paths count : {total_paths} | Total endpoints: {total_endpoints}")
    return output_path


if __name__ == "__main__":
    export_openapi_schema()
