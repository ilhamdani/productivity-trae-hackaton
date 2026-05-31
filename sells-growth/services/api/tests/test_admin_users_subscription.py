import secrets

from fastapi.testclient import TestClient

from app.main import app


def test_register_creates_free_subscription_and_admin_can_view() -> None:
    username = f"u_{secrets.token_hex(6)}"
    password = "passw0rd!"

    with TestClient(app) as client:
        res = client.post("/api/v1/auth/register", json={"username": username, "password": password})
        assert res.status_code == 200
        user_id = res.json()["user_id"]
        assert isinstance(user_id, str) and len(user_id) > 10

        res = client.get(f"/api/v1/admin/users/{user_id}", headers={"X-API-Key": "dev"})
        assert res.status_code == 200
        body = res.json()
        assert body["user"]["id"] == user_id
        assert body["user"]["username"] == username
        assert body["subscription"]["plan_key"] == "free"
        assert body["subscription"]["status"] == "active"


def test_admin_users_list_includes_subscription() -> None:
    with TestClient(app) as client:
        res = client.get("/api/v1/admin/users?page=1&page_size=5", headers={"X-API-Key": "dev"})
        assert res.status_code == 200
        body = res.json()
        assert body["page"] == 1
        assert body["page_size"] == 5
        assert isinstance(body["total"], int)
        assert isinstance(body["items"], list)
        if body["items"]:
            assert "subscription" in body["items"][0]

