import secrets

from fastapi.testclient import TestClient

from app.main import app


def test_super_admin_can_crud_pricing_plans() -> None:
    with TestClient(app) as client:
        key = f"pro_{secrets.token_hex(4)}"

        res = client.post(
            "/api/v1/admin/pricing-plans",
            json={
                "key": key,
                "name": "Pro",
                "price_amount": 99000,
                "currency": "IDR",
                "interval": "monthly",
                "is_active": True,
                "campaign_monthly_limit": 5,
                "user_seats_limit": 3,
            },
            headers={"X-API-Key": "dev"},
        )
        assert res.status_code == 200
        plan_id = res.json()["id"]
        assert isinstance(plan_id, str) and len(plan_id) > 10

        res = client.get("/api/v1/admin/pricing-plans", headers={"X-API-Key": "dev"})
        assert res.status_code == 200
        body = res.json()
        assert isinstance(body["items"], list)
        created = [p for p in body["items"] if p["id"] == plan_id][0]
        assert created["key"] == key
        assert created["campaign_monthly_limit"] == 5
        assert created["user_seats_limit"] == 3

        res = client.put(
            f"/api/v1/admin/pricing-plans/{plan_id}",
            json={
                "name": "Pro Plus",
                "price_amount": 149000,
                "currency": "IDR",
                "interval": "monthly",
                "is_active": True,
                "campaign_monthly_limit": 7,
                "user_seats_limit": 10,
            },
            headers={"X-API-Key": "dev"},
        )
        assert res.status_code == 200

        res = client.get("/api/v1/admin/pricing-plans", headers={"X-API-Key": "dev"})
        assert res.status_code == 200
        items = res.json()["items"]
        updated = [p for p in items if p["id"] == plan_id][0]
        assert updated["name"] == "Pro Plus"
        assert updated["price_amount"] == 149000
        assert updated["campaign_monthly_limit"] == 7
        assert updated["user_seats_limit"] == 10

        res = client.delete(f"/api/v1/admin/pricing-plans/{plan_id}", headers={"X-API-Key": "dev"})
        assert res.status_code == 204

        res = client.get("/api/v1/admin/pricing-plans", headers={"X-API-Key": "dev"})
        assert res.status_code == 200
        assert all(p["id"] != plan_id for p in res.json()["items"])
