import secrets

from fastapi.testclient import TestClient

from app.main import app


def test_free_plan_default_campaign_limit_is_10() -> None:
    username = f"u_{secrets.token_hex(6)}"
    with TestClient(app) as client:
        res = client.post("/api/v1/auth/register", json={"username": username, "password": "passw0rd!"})
        assert res.status_code == 200
        api_key = res.json()["api_key"]

        payload = {
            "product_name": "Test Product",
            "product_description": "Desc",
            "price": {"currency": "IDR", "amount": 10000},
            "category": "makanan",
        }

        for _ in range(10):
            res = client.post("/api/v1/campaigns", json=payload, headers={"X-API-Key": api_key})
            assert res.status_code == 200

        res = client.post("/api/v1/campaigns", json=payload, headers={"X-API-Key": api_key})
        assert res.status_code == 403
