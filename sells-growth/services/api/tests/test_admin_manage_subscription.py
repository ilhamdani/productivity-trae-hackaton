import secrets

from fastapi.testclient import TestClient

from app.main import app


def test_super_admin_can_update_user_subscription() -> None:
    username = f"u_{secrets.token_hex(6)}"
    password = "passw0rd!"

    with TestClient(app) as client:
        res = client.post("/api/v1/auth/register", json={"username": username, "password": password})
        assert res.status_code == 200
        user_id = res.json()["user_id"]

        plan_key = f"pro_{secrets.token_hex(4)}"
        res = client.post(
            "/api/v1/admin/pricing-plans",
            json={
                "key": plan_key,
                "name": "Pro",
                "price_amount": 99000,
                "currency": "IDR",
                "interval": "monthly",
                "is_active": True,
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
        assert res.json()["subscription"]["plan_key"] == plan_key
        assert res.json()["subscription"]["pricing_plan_id"] == plan_id
        assert res.json()["subscription"]["pricing_plan"]["id"] == plan_id

        res = client.get(f"/api/v1/admin/users/{user_id}", headers={"X-API-Key": "dev"})
        assert res.status_code == 200
        body = res.json()
        assert body["subscription"]["plan_key"] == plan_key
        assert body["subscription"]["status"] == "active"
