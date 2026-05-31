from __future__ import annotations

from dataclasses import dataclass
import uuid

from fastapi import Depends, Header
from sqlalchemy import select
from sqlalchemy.orm import Session

from .errors import ApiException
from .db.engine import get_db
from .db.models import ApiKey, User
from .security import hash_api_key
from .settings import Settings, get_settings


@dataclass(frozen=True)
class AuthContext:
    user_id: uuid.UUID
    api_key: str


def require_api_key(
    *,
    settings: Settings = Depends(get_settings),
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
    db: Session = Depends(get_db),
) -> AuthContext:
    if not x_api_key:
        raise ApiException(status_code=401, code="unauthorized", message="Missing X-API-Key header")

    key_hash = hash_api_key(api_key=x_api_key, salt=settings.api_key_salt)
    api_key_row = db.execute(select(ApiKey).where(ApiKey.key_hash == key_hash)).scalar_one_or_none()
    if not api_key_row:
        raise ApiException(status_code=401, code="unauthorized", message="Invalid API key")

    return AuthContext(user_id=api_key_row.user_id, api_key=x_api_key)


def require_super_admin(
    ctx: AuthContext = Depends(require_api_key),
    db: Session = Depends(get_db),
) -> AuthContext:
    user = db.execute(select(User).where(User.id == ctx.user_id)).scalar_one_or_none()
    if not user:
        raise ApiException(status_code=401, code="unauthorized", message="Invalid API key")
    if user.role != "super_admin":
        raise ApiException(status_code=403, code="forbidden", message="Forbidden")
    return ctx
