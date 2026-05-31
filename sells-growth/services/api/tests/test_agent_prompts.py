import uuid

from fastapi.testclient import TestClient
from sqlalchemy import delete, select

from app.auth import AuthContext, require_api_key
from app.db.engine import SessionLocal
from app.db.models import AgentPrompt, User
from app.main import app


def _ensure_user(user_id: uuid.UUID) -> None:
    db = SessionLocal()
    try:
        existing = db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
        if existing:
            return
        db.add(User(id=user_id, email=None, username=None, password_hash=None))
        db.commit()
    finally:
        db.close()


def _reset_prompts(user_id: uuid.UUID) -> None:
    db = SessionLocal()
    try:
        db.execute(delete(AgentPrompt).where(AgentPrompt.user_id == user_id))
        db.commit()
    finally:
        db.close()


def test_agent_prompts_list_and_upsert() -> None:
    user_id = uuid.UUID("00000000-0000-0000-0000-000000000123")
    _ensure_user(user_id)
    _reset_prompts(user_id)

    def fake_require_api_key() -> AuthContext:
        return AuthContext(user_id=user_id, api_key="dev")

    app.dependency_overrides[require_api_key] = fake_require_api_key
    try:
        client = TestClient(app)

        res = client.get("/api/v1/prompts", headers={"X-API-Key": "dev"})
        assert res.status_code == 200
        items = res.json()["items"]
        assert isinstance(items, list)
        assert len(items) >= 5

        res = client.put("/api/v1/prompts/copywriter", headers={"X-API-Key": "dev"}, json={"prompt": "Gunakan gaya bahasa yang to the point."})
        assert res.status_code == 200
        assert res.json()["agent_key"] == "copywriter"
        assert res.json()["prompt"] == "Gunakan gaya bahasa yang to the point."

        res = client.get("/api/v1/prompts", headers={"X-API-Key": "dev"})
        assert res.status_code == 200
        items2 = res.json()["items"]
        got = [x for x in items2 if x["agent_key"] == "copywriter"]
        assert len(got) == 1
        assert got[0]["prompt"] == "Gunakan gaya bahasa yang to the point."
    finally:
        app.dependency_overrides = {}
