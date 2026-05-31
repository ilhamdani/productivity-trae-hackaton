from fastapi.testclient import TestClient

from app.main import app


def test_seed_super_admin_can_login_and_access_admin() -> None:
    with TestClient(app) as client:
        res = client.post("/api/v1/auth/login", json={"username": "admin", "password": "admin123"})
        assert res.status_code == 200
        api_key = res.json()["api_key"]
        assert isinstance(api_key, str) and api_key.startswith("ak_")

        res = client.get("/api/v1/admin/ping", headers={"X-API-Key": api_key})
        assert res.status_code == 200
        assert res.json()["status"] == "ok"

        res = client.get("/api/v1/admin/ping", headers={"X-API-Key": "dev"})
        assert res.status_code == 200
        assert res.json()["status"] == "ok"
