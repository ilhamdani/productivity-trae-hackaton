import secrets

from fastapi.testclient import TestClient

from app.main import app


def test_users_list_returns_team_members_and_separates_super_admin() -> None:
    with TestClient(app) as client:
        u1 = f"u_{secrets.token_hex(6)}"
        u2 = f"u_{secrets.token_hex(6)}"

        res = client.post("/api/v1/auth/register", json={"username": u1, "password": "passw0rd!"})
        assert res.status_code == 200
        u1_id = res.json()["user_id"]
        u1_key = res.json()["api_key"]

        res = client.post("/api/v1/auth/register", json={"username": u2, "password": "passw0rd!"})
        assert res.status_code == 200
        u2_id = res.json()["user_id"]
        u2_key = res.json()["api_key"]

        res = client.post(
            "/api/v1/admin/teams",
            json={"owner_username": u1, "name": "Team A"},
            headers={"X-API-Key": "dev"},
        )
        assert res.status_code == 200
        team_id = res.json()["id"]

        res = client.post(
            f"/api/v1/admin/teams/{team_id}/members",
            json={"user_id": u2_id, "role": "member"},
            headers={"X-API-Key": "dev"},
        )
        assert res.status_code == 200

        res = client.get("/api/v1/users", headers={"X-API-Key": u1_key})
        assert res.status_code == 200
        body = res.json()
        assert body["team"]["id"] == team_id
        assert body.get("subscription") is not None
        user_ids = {u["id"] for u in body["users"]}
        assert u1_id in user_ids
        assert u2_id in user_ids
        assert all(u["role"] != "super_admin" for u in body["users"])

        res = client.get("/api/v1/users", headers={"X-API-Key": u2_key})
        assert res.status_code == 200
        body2 = res.json()
        assert body2["team"]["id"] == team_id

        res = client.get("/api/v1/users", headers={"X-API-Key": "dev"})
        assert res.status_code == 200
        body3 = res.json()
        assert body3.get("subscription") is not None
        assert "super_admins" not in body3
