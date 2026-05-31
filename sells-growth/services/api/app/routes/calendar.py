from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from ..auth import AuthContext, require_api_key
from ..db.engine import get_db
from ..db.models import Campaign, ContentDraft, ContentPublication, ContentSchedule
from ..errors import ApiException

router = APIRouter(prefix="/calendar")


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _parse_dt(value: str) -> datetime:
    dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


class DraftItem(BaseModel):
    id: uuid.UUID
    campaign_id: uuid.UUID | None = None
    channel: str
    content_type: str
    caption: str
    hashtags: list[str] = Field(default_factory=list)
    cta_text: str | None = None
    media_urls: list[str] = Field(default_factory=list)
    notes: str | None = None
    status: str
    scheduled_at: str | None = None
    timezone: str | None = None
    post_url: str | None = None
    published_at: str | None = None
    created_at: str
    updated_at: str


class DraftListResponse(BaseModel):
    items: list[DraftItem]


class DraftCreateRequest(BaseModel):
    campaign_id: uuid.UUID
    channel: str = Field(pattern="^(instagram|tiktok|facebook|whatsapp)$")
    content_type: str = Field(default="post")
    caption: str = Field(default="")
    hashtags: list[str] = Field(default_factory=list)
    cta_text: str | None = None
    media_urls: list[str] = Field(default_factory=list)
    notes: str | None = None


class DraftCreateResponse(BaseModel):
    id: uuid.UUID


class DraftUpdateRequest(BaseModel):
    caption: str | None = None
    hashtags: list[str] | None = None
    cta_text: str | None = None
    media_urls: list[str] | None = None
    notes: str | None = None
    status: str | None = None


class ScheduleRequest(BaseModel):
    scheduled_at: str
    timezone: str = Field(default="Asia/Jakarta")
    reminder_at: str | None = None


class MarkPublishedRequest(BaseModel):
    post_url: str | None = None
    published_at: str | None = None
    provider_post_id: str | None = None


def _to_item(d: ContentDraft, schedule: ContentSchedule | None, pub: ContentPublication | None) -> DraftItem:
    def as_list(v: Any) -> list[str]:
        if isinstance(v, list):
            return [str(x) for x in v if str(x)]
        return []

    return DraftItem(
        id=d.id,
        campaign_id=d.campaign_id,
        channel=d.channel,
        content_type=d.content_type,
        caption=d.caption or "",
        hashtags=as_list(d.hashtags),
        cta_text=d.cta_text,
        media_urls=as_list(d.media_urls),
        notes=d.notes,
        status=d.status,
        scheduled_at=schedule.scheduled_at.isoformat() if schedule else None,
        timezone=schedule.timezone if schedule else None,
        post_url=pub.post_url if pub else None,
        published_at=pub.published_at.isoformat() if pub else None,
        created_at=d.created_at.isoformat(),
        updated_at=d.updated_at.isoformat(),
    )


@router.get("/drafts")
def list_drafts(
    from_: str | None = None,
    to: str | None = None,
    channel: str | None = None,
    status: str | None = None,
    campaign_id: uuid.UUID | None = None,
    ctx: AuthContext = Depends(require_api_key),
    db: Session = Depends(get_db),
) -> DraftListResponse:
    q = select(ContentDraft).where(ContentDraft.user_id == ctx.user_id).order_by(ContentDraft.created_at.desc())
    if channel:
        q = q.where(ContentDraft.channel == channel)
    if status:
        q = q.where(ContentDraft.status == status)
    if campaign_id:
        q = q.where(ContentDraft.campaign_id == campaign_id)

    drafts = db.execute(q).scalars().all()
    if not drafts:
        return DraftListResponse(items=[])

    ids = [d.id for d in drafts]
    schedules = db.execute(select(ContentSchedule).where(ContentSchedule.draft_id.in_(ids))).scalars().all()
    pubs = db.execute(select(ContentPublication).where(ContentPublication.draft_id.in_(ids))).scalars().all()
    sch_by = {s.draft_id: s for s in schedules}
    pub_by = {p.draft_id: p for p in pubs}

    if from_ or to:
        start = _parse_dt(from_) if from_ else None
        end = _parse_dt(to) if to else None

        filtered: list[ContentDraft] = []
        for d in drafts:
            sch = sch_by.get(d.id)
            ts = sch.scheduled_at if sch else d.created_at
            if start and ts < start:
                continue
            if end and ts > end:
                continue
            filtered.append(d)
        drafts = filtered

    return DraftListResponse(items=[_to_item(d, sch_by.get(d.id), pub_by.get(d.id)) for d in drafts])


@router.post("/drafts")
def create_draft(
    body: DraftCreateRequest,
    ctx: AuthContext = Depends(require_api_key),
    db: Session = Depends(get_db),
) -> DraftCreateResponse:
    campaign = db.execute(select(Campaign).where(Campaign.id == body.campaign_id, Campaign.user_id == ctx.user_id)).scalar_one_or_none()
    if not campaign:
        raise ApiException(status_code=404, code="not_found", message="Campaign not found")
    if campaign.status != "complete":
        raise ApiException(status_code=409, code="conflict", message="Campaign is not complete")

    d = ContentDraft(
        user_id=ctx.user_id,
        campaign_id=body.campaign_id,
        channel=body.channel,
        content_type=body.content_type,
        caption=body.caption,
        hashtags=body.hashtags,
        cta_text=body.cta_text,
        media_urls=body.media_urls,
        notes=body.notes,
        status="draft",
    )
    db.add(d)
    db.commit()
    return DraftCreateResponse(id=d.id)


@router.patch("/drafts/{draft_id}")
def update_draft(
    draft_id: uuid.UUID,
    body: DraftUpdateRequest,
    ctx: AuthContext = Depends(require_api_key),
    db: Session = Depends(get_db),
) -> DraftItem:
    d = db.execute(select(ContentDraft).where(ContentDraft.id == draft_id, ContentDraft.user_id == ctx.user_id)).scalar_one_or_none()
    if not d:
        raise ApiException(status_code=404, code="not_found", message="Draft not found")

    if body.caption is not None:
        d.caption = body.caption
    if body.hashtags is not None:
        d.hashtags = body.hashtags
    if body.cta_text is not None:
        d.cta_text = body.cta_text
    if body.media_urls is not None:
        d.media_urls = body.media_urls
    if body.notes is not None:
        d.notes = body.notes
    if body.status is not None:
        d.status = body.status

    db.commit()
    sch = db.execute(select(ContentSchedule).where(ContentSchedule.draft_id == d.id)).scalar_one_or_none()
    pub = db.execute(select(ContentPublication).where(ContentPublication.draft_id == d.id)).scalar_one_or_none()
    return _to_item(d, sch, pub)


@router.post("/drafts/{draft_id}/schedule")
def schedule_draft(
    draft_id: uuid.UUID,
    body: ScheduleRequest,
    ctx: AuthContext = Depends(require_api_key),
    db: Session = Depends(get_db),
) -> DraftItem:
    d = db.execute(select(ContentDraft).where(ContentDraft.id == draft_id, ContentDraft.user_id == ctx.user_id)).scalar_one_or_none()
    if not d:
        raise ApiException(status_code=404, code="not_found", message="Draft not found")

    scheduled_at = _parse_dt(body.scheduled_at)
    reminder_at = _parse_dt(body.reminder_at) if body.reminder_at else None

    existing = db.execute(select(ContentSchedule).where(ContentSchedule.draft_id == d.id)).scalar_one_or_none()
    if existing:
        existing.scheduled_at = scheduled_at
        existing.timezone = body.timezone
        existing.reminder_at = reminder_at
        existing.status = "scheduled"
    else:
        db.add(
            ContentSchedule(
                draft_id=d.id,
                scheduled_at=scheduled_at,
                timezone=body.timezone,
                reminder_at=reminder_at,
                status="scheduled",
            )
        )

    d.status = "scheduled"
    db.commit()
    sch = db.execute(select(ContentSchedule).where(ContentSchedule.draft_id == d.id)).scalar_one_or_none()
    pub = db.execute(select(ContentPublication).where(ContentPublication.draft_id == d.id)).scalar_one_or_none()
    return _to_item(d, sch, pub)


@router.post("/drafts/{draft_id}/mark-published")
def mark_published(
    draft_id: uuid.UUID,
    body: MarkPublishedRequest,
    ctx: AuthContext = Depends(require_api_key),
    db: Session = Depends(get_db),
) -> DraftItem:
    d = db.execute(select(ContentDraft).where(ContentDraft.id == draft_id, ContentDraft.user_id == ctx.user_id)).scalar_one_or_none()
    if not d:
        raise ApiException(status_code=404, code="not_found", message="Draft not found")

    now = _utcnow()
    published_at = _parse_dt(body.published_at) if body.published_at else now

    db.execute(delete(ContentSchedule).where(ContentSchedule.draft_id == d.id))

    existing = db.execute(select(ContentPublication).where(ContentPublication.draft_id == d.id)).scalar_one_or_none()
    if existing:
        existing.post_url = body.post_url
        existing.provider_post_id = body.provider_post_id
        existing.published_at = published_at
        existing.source = "manual"
    else:
        db.add(
            ContentPublication(
                draft_id=d.id,
                provider_post_id=body.provider_post_id,
                post_url=body.post_url,
                published_at=published_at,
                source="manual",
            )
        )

    d.status = "published"
    db.commit()
    pub = db.execute(select(ContentPublication).where(ContentPublication.draft_id == d.id)).scalar_one_or_none()
    return _to_item(d, None, pub)
