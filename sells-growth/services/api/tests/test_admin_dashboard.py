import secrets

from fastapi.testclient import TestClient

from app.main import app


def test_super_admin_can_view_dashboard_summary() -> None:
    with TestClient(app) as client:
        for _ in range(2):
            username = f"u_{secrets.token_hex(6)}"
            res = client.post("/api/v1/auth/register", json={"username": username, "password": "passw0rd!"})
            assert res.status_code == 200

        res = client.get("/api/v1/admin/dashboard", headers={"X-API-Key": "dev"})
        assert res.status_code == 200
        body = res.json()
        assert isinstance(body["total_users"], int)
        assert isinstance(body["users_by_plan"], list)
        assert any(x["key"] == "free" for x in body["users_by_plan"])
