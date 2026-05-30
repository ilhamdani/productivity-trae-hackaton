from __future__ import annotations

import secrets
import uuid

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..db.engine import get_db
from ..db.models import ApiKey, User
from ..errors import ApiException
from ..security import hash_api_key, hash_password, verify_password
from ..settings import Settings, get_settings

router = APIRouter(prefix="/api/v1/auth")


class AuthRequest(BaseModel):
    username: str = Field(min_length=3, max_length=32, pattern="^[a-zA-Z0-9_]+$")
    password: str = Field(min_length=6, max_length=200)


class AuthResponse(BaseModel):
    user_id: uuid.UUID
    username: str
    api_key: str


def _issue_api_key(db: Session, *, settings: Settings, user_id: uuid.UUID) -> str:
    api_key = f"ak_{secrets.token_urlsafe(24)}"
    key_hash = hash_api_key(api_key=api_key, salt=settings.api_key_salt)
    db.add(ApiKey(user_id=user_id, key_hash=key_hash))
    db.commit()
    return api_key


@router.post("/register")
def register(
    body: AuthRequest,
    settings: Settings = Depends(get_settings),
    db: Session = Depends(get_db),
) -> AuthResponse:
    username = body.username.strip().lower()
    if not username:
        raise ApiException(status_code=422, code="validation_error", message="Validation error")

    user = User(email=None, username=username, password_hash=hash_password(password=body.password))
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ApiException(status_code=409, code="conflict", message="Username already exists")

    api_key = _issue_api_key(db, settings=settings, user_id=user.id)
    return AuthResponse(user_id=user.id, username=username, api_key=api_key)


@router.post("/login")
def login(
    body: AuthRequest,
    settings: Settings = Depends(get_settings),
    db: Session = Depends(get_db),
) -> AuthResponse:
    username = body.username.strip().lower()
    user = db.execute(select(User).where(User.username == username)).scalar_one_or_none()
    if not user or not user.password_hash:
        raise ApiException(status_code=401, code="unauthorized", message="Invalid username or password")
    if not verify_password(password=body.password, password_hash=user.password_hash):
        raise ApiException(status_code=401, code="unauthorized", message="Invalid username or password")

    api_key = _issue_api_key(db, settings=settings, user_id=user.id)
    return AuthResponse(user_id=user.id, username=username, api_key=api_key)

