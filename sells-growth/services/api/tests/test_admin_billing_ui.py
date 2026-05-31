from datetime import datetime, timedelta, timezone
import secrets

from fastapi.testclient import TestClient

from app.main import app


def test_super_admin_can_run_billing_now_and_view_last_run() -> None:
    with TestClient(app) as client:
        username = f"u_{secrets.token_hex(6)}"
        res = client.post("/api/v1/auth/register", json={"username": username, "password": "passw0rd!"})
        assert res.status_code == 200
        user_id = res.json()["user_id"]

        key = f"temp_{secrets.token_hex(4)}"
        res = client.post(
            "/api/v1/admin/pricing-plans",
            json={
                "key": key,
                "name": "Temp",
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
            f"/api/v1/admin/users/{user_id}/subscription",
            json={"pricing_plan_id": plan_id, "status": "canceled", "current_period_end": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()},
            headers={"X-API-Key": "dev"},
        )
        assert res.status_code == 200

        res = client.post("/api/v1/admin/billing/run", headers={"X-API-Key": "dev"})
        assert res.status_code == 200
        assert res.json()["downgraded"] >= 1

        res = client.get("/api/v1/admin/billing/last-run", headers={"X-API-Key": "dev"})
        assert res.status_code == 200
        assert res.json()["downgraded"] >= 1
        assert isinstance(res.json()["finished_at"], str)
