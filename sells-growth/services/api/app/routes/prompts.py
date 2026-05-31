from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..auth import AuthContext, require_api_key
from ..db.engine import get_db
from ..db.models import AgentPrompt
from ..errors import ApiException
from ..prompts.defaults import PROMPT_AGENT_KEYS, get_default_prompt

router = APIRouter(prefix="/prompts")


class AgentPromptItem(BaseModel):
    agent_key: str
    prompt: str
    updated_at: datetime


class AgentPromptListResponse(BaseModel):
    items: list[AgentPromptItem]


class AgentPromptUpsertRequest(BaseModel):
    prompt: str = Field(default="")


def _validate_agent_key(agent_key: str) -> None:
    if agent_key not in PROMPT_AGENT_KEYS:
        raise ApiException(status_code=422, code="invalid_agent_key", message="Invalid agent key", details={"agent_key": agent_key})


@router.get("")
def list_prompts(
    ctx: AuthContext = Depends(require_api_key),
    db: Session = Depends(get_db),
) -> AgentPromptListResponse:
    rows = db.execute(select(AgentPrompt).where(AgentPrompt.user_id == ctx.user_id)).scalars().all()
    by_key = {r.agent_key: r for r in rows}

    created_any = False
    for key in PROMPT_AGENT_KEYS:
        if key in by_key:
            continue
        r = AgentPrompt(user_id=ctx.user_id, agent_key=key, prompt=get_default_prompt(key))
        db.add(r)
        created_any = True

    if created_any:
        db.commit()
        rows = db.execute(select(AgentPrompt).where(AgentPrompt.user_id == ctx.user_id)).scalars().all()
        by_key = {r.agent_key: r for r in rows}

    items: list[AgentPromptItem] = []
    for key in PROMPT_AGENT_KEYS:
        r = by_key.get(key)
        if not r:
            continue
        items.append(AgentPromptItem(agent_key=r.agent_key, prompt=r.prompt, updated_at=r.updated_at))

    return AgentPromptListResponse(items=items)


@router.put("/{agent_key}")
def upsert_prompt(
    agent_key: str,
    body: AgentPromptUpsertRequest,
    ctx: AuthContext = Depends(require_api_key),
    db: Session = Depends(get_db),
) -> AgentPromptItem:
    _validate_agent_key(agent_key)

    row = db.execute(
        select(AgentPrompt).where(AgentPrompt.user_id == ctx.user_id, AgentPrompt.agent_key == agent_key)
    ).scalar_one_or_none()

    if row:
        row.prompt = body.prompt
    else:
        row = AgentPrompt(user_id=ctx.user_id, agent_key=agent_key, prompt=body.prompt)
        db.add(row)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ApiException(status_code=409, code="conflict", message="Prompt conflict")

    row = db.execute(select(AgentPrompt).where(AgentPrompt.id == row.id)).scalar_one()
    return AgentPromptItem(agent_key=row.agent_key, prompt=row.prompt, updated_at=row.updated_at)
