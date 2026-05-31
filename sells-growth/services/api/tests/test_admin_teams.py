import secrets

from fastapi.testclient import TestClient

from app.main import app


def test_super_admin_can_create_team_and_manage_members() -> None:
    with TestClient(app) as client:
        u1 = f"u_{secrets.token_hex(6)}"
        u2 = f"u_{secrets.token_hex(6)}"

        res = client.post("/api/v1/auth/register", json={"username": u1, "password": "passw0rd!"})
        assert res.status_code == 200
        owner_id = res.json()["user_id"]

        res = client.post("/api/v1/auth/register", json={"username": u2, "password": "passw0rd!"})
        assert res.status_code == 200
        member_id = res.json()["user_id"]

        res = client.post(
            "/api/v1/admin/teams",
            json={"owner_username": u1, "name": "Team A"},
            headers={"X-API-Key": "dev"},
        )
        assert res.status_code == 200
        team_id = res.json()["id"]

        res = client.get("/api/v1/admin/teams", headers={"X-API-Key": "dev"})
        assert res.status_code == 200
        assert any(t["id"] == team_id for t in res.json()["items"])

        res = client.post(
            f"/api/v1/admin/teams/{team_id}/members",
            json={"user_id": member_id, "role": "member"},
            headers={"X-API-Key": "dev"},
        )
        assert res.status_code == 200

        res = client.get(f"/api/v1/admin/teams/{team_id}", headers={"X-API-Key": "dev"})
        assert res.status_code == 200
        body = res.json()
        assert body["team"]["id"] == team_id
        assert body["team"]["owner_user_id"] == owner_id
        assert body["team"]["owner_username"] == u1
        assert len(body["members"]) == 2

        res = client.delete(
            f"/api/v1/admin/teams/{team_id}/members/{member_id}",
            headers={"X-API-Key": "dev"},
        )
        assert res.status_code == 204
