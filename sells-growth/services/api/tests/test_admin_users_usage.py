import secrets

from fastapi.testclient import TestClient

from app.main import app


def test_super_admin_can_list_user_usage() -> None:
    with TestClient(app) as client:
        username = f"u_{secrets.token_hex(6)}"
        res = client.post("/api/v1/auth/register", json={"username": username, "password": "passw0rd!"})
        assert res.status_code == 200
        api_key = res.json()["api_key"]
        user_id = res.json()["user_id"]

        plan_key = f"limited_{secrets.token_hex(4)}"
        res = client.post(
            "/api/v1/admin/pricing-plans",
            json={
                "key": plan_key,
                "name": "Limited",
                "price_amount": 0,
                "currency": "IDR",
                "interval": "monthly",
                "is_active": True,
                "campaign_monthly_limit": 2,
                "user_seats_limit": 2,
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
        assert res.status_code == 200

        res = client.get("/api/v1/admin/users/usage?page=1&page_size=10", headers={"X-API-Key": "dev"})
        assert res.status_code == 200
        body = res.json()
        assert body["page"] == 1
        assert isinstance(body["items"], list)
        row = [x for x in body["items"] if x["user"]["id"] == user_id][0]
        assert row["usage"]["campaigns_this_month"] >= 1
        assert row["usage"]["campaign_monthly_limit"] == 2
