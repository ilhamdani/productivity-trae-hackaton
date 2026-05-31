import uuid

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.auth import AuthContext, require_api_key
from app.db.engine import SessionLocal
from app.db.models import User
from app.main import app


def _ensure_user(user_id: uuid.UUID, *, role: str) -> None:
    db = SessionLocal()
    try:
        u = db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
        if not u:
            u = User(id=user_id, email=None, username=None, password_hash=None)
            db.add(u)
            db.flush()
        setattr(u, "role", role)
        db.commit()
    finally:
        db.close()


def test_admin_ping_requires_super_admin() -> None:
    normal_user_id = uuid.UUID("00000000-0000-0000-0000-00000000aa01")
    admin_user_id = uuid.UUID("00000000-0000-0000-0000-00000000aa02")

    _ensure_user(normal_user_id, role="user")
    _ensure_user(admin_user_id, role="super_admin")

    def fake_require_api_key_normal() -> AuthContext:
        return AuthContext(user_id=normal_user_id, api_key="dev")

    app.dependency_overrides[require_api_key] = fake_require_api_key_normal
    try:
        client = TestClient(app)
        res = client.get("/api/v1/admin/ping", headers={"X-API-Key": "dev"})
        assert res.status_code == 403
        assert res.json()["error"]["code"] == "forbidden"
    finally:
        app.dependency_overrides = {}

    def fake_require_api_key_admin() -> AuthContext:
        return AuthContext(user_id=admin_user_id, api_key="dev")

    app.dependency_overrides[require_api_key] = fake_require_api_key_admin
    try:
        client = TestClient(app)
        res = client.get("/api/v1/admin/ping", headers={"X-API-Key": "dev"})
        assert res.status_code == 200
        assert res.json()["status"] == "ok"
    finally:
        app.dependency_overrides = {}

