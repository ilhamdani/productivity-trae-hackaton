import secrets

from fastapi.testclient import TestClient

from app.main import app


def test_campaign_blocked_when_plan_inactive() -> None:
    username = f"u_{secrets.token_hex(6)}"
    with TestClient(app) as client:
        res = client.post("/api/v1/auth/register", json={"username": username, "password": "passw0rd!"})
        assert res.status_code == 200
        api_key = res.json()["api_key"]
        user_id = res.json()["user_id"]

        key = f"inactive_{secrets.token_hex(4)}"
        res = client.post(
            "/api/v1/admin/pricing-plans",
            json={
                "key": key,
                "name": "Inactive",
                "price_amount": 0,
                "currency": "IDR",
                "interval": "monthly",
                "is_active": False,
                "campaign_monthly_limit": 10,
                "user_seats_limit": 10,
            },
            headers={"X-API-Key": "dev"},
        )
        assert res.status_code == 200
        plan_id = res.json()["id"]

        res = client.patch(
            f"/api/v1/admin/users/{user_id}/subscription",
            json={"pricing_plan_id": plan_id, "status": "active"},
            headers={"X-API-Key": "dev"},
        )
        assert res.status_code == 200

        payload = {
            "product_name": "Test Product",
            "product_description": "Desc",
            "price": {"currency": "IDR", "amount": 10000},
            "category": "makanan",
        }
        res = client.post("/api/v1/campaigns", json=payload, headers={"X-API-Key": api_key})
        assert res.status_code == 403


def test_team_member_add_respects_seats_limit() -> None:
    with TestClient(app) as client:
        u1 = f"u_{secrets.token_hex(6)}"
        u2 = f"u_{secrets.token_hex(6)}"

        res = client.post("/api/v1/auth/register", json={"username": u1, "password": "passw0rd!"})
        assert res.status_code == 200
        owner_id = res.json()["user_id"]

        res = client.post("/api/v1/auth/register", json={"username": u2, "password": "passw0rd!"})
        assert res.status_code == 200
        member_id = res.json()["user_id"]

        key = f"seat1_{secrets.token_hex(4)}"
        res = client.post(
            "/api/v1/admin/pricing-plans",
            json={
                "key": key,
                "name": "Seat1",
                "price_amount": 0,
                "currency": "IDR",
                "interval": "monthly",
                "is_active": True,
                "campaign_monthly_limit": 10,
                "user_seats_limit": 1,
            },
            headers={"X-API-Key": "dev"},
        )
        assert res.status_code == 200
        plan_id = res.json()["id"]

        res = client.patch(
            f"/api/v1/admin/users/{owner_id}/subscription",
            json={"pricing_plan_id": plan_id, "status": "active"},
            headers={"X-API-Key": "dev"},
        )
        assert res.status_code == 200

        res = client.post(
            "/api/v1/admin/teams",
            json={"owner_user_id": owner_id, "name": "Team A"},
            headers={"X-API-Key": "dev"},
        )
        assert res.status_code == 200
        team_id = res.json()["id"]

        res = client.post(
            f"/api/v1/admin/teams/{team_id}/members",
            json={"user_id": member_id, "role": "member"},
            headers={"X-API-Key": "dev"},
        )
        assert res.status_code == 403
