import uuid

from fastapi.testclient import TestClient

from app.auth import AuthContext, require_api_key
from app.main import app


def test_health_ok() -> None:
    client = TestClient(app)
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}


def test_me_requires_api_key() -> None:
    client = TestClient(app)
    res = client.get("/api/v1/me")
    assert res.status_code == 401
    body = res.json()
    assert body["error"]["code"] == "unauthorized"


def test_me_ok_with_api_key() -> None:
    def fake_require_api_key() -> AuthContext:
        return AuthContext(user_id=uuid.UUID("00000000-0000-0000-0000-000000000001"), api_key="dev")

    app.dependency_overrides[require_api_key] = fake_require_api_key
    try:
        client = TestClient(app)
        res = client.get("/api/v1/me", headers={"X-API-Key": "dev"})
        assert res.status_code == 200
        assert res.json()["user_id"] == "00000000-0000-0000-0000-000000000001"
    finally:
        app.dependency_overrides = {}
