from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from ..auth import AuthContext, require_api_key
from ..db.engine import get_db
from ..db.models import Campaign, CampaignAsset, CampaignProductSnapshot, CampaignStep, Inventory, Product
from ..errors import ApiException
from ..orchestrator.state import STEP_KEYS

router = APIRouter(prefix="/campaigns")


class StartGenerationRequest(BaseModel):
    campaign_id: uuid.UUID
    options: dict[str, Any] = Field(default_factory=dict)


class StartGenerationResponse(BaseModel):
    campaign_id: uuid.UUID
    campaign_status: str
    current_step_key: str


class ProgressStep(BaseModel):
    step_key: str
    status: str
    duration_ms: int | None = None


class ProgressResponse(BaseModel):
    campaign_id: uuid.UUID
    campaign_status: str
    approval_status: str
    current_step_key: str | None
    steps: list[ProgressStep]
    error: dict[str, Any] | None = None
    action_required: dict[str, Any] | None = None


class StepOutputResponse(BaseModel):
    step_key: str
    status: str
    output: dict[str, Any] | None = None


class RetryResponse(BaseModel):
    step_key: str
    status: str


def _get_owned_campaign(db: Session, *, user_id: uuid.UUID, campaign_id: uuid.UUID) -> Campaign:
    campaign = db.execute(select(Campaign).where(Campaign.id == campaign_id, Campaign.user_id == user_id)).scalar_one_or_none()
    if not campaign:
        raise ApiException(status_code=404, code="not_found", message="Campaign not found")
    return campaign


def _require_ready_images(db: Session, *, campaign_id: uuid.UUID) -> None:
    assets = db.execute(
        select(CampaignAsset).where(CampaignAsset.campaign_id == campaign_id, CampaignAsset.asset_type == "product_image")
    ).scalars().all()
    ready = [a for a in assets if a.public_url]
    if not ready:
        raise ApiException(status_code=422, code="validation_error", message="At least 1 product image is required")


def _build_product_snapshot(db: Session, campaign: Campaign) -> dict[str, Any]:
    base: dict[str, Any] = {
        "name": campaign.product_name,
        "description": campaign.product_description,
        "price": {"currency": campaign.price_currency, "amount": float(campaign.price_amount)},
        "category": campaign.category,
    }

    images = db.execute(
        select(CampaignAsset).where(CampaignAsset.campaign_id == campaign.id, CampaignAsset.asset_type == "product_image")
    ).scalars().all()
    base["image_urls"] = [a.public_url for a in images if a.public_url]

    if campaign.product_id:
        product = db.execute(select(Product).where(Product.id == campaign.product_id)).scalar_one_or_none()
        if product:
            base["sku"] = product.sku
        inv_items = db.execute(select(Inventory).where(Inventory.product_id == campaign.product_id)).scalars().all()
        base["inventory"] = [
            {
                "location_code": i.location_code,
                "qty_on_hand": i.qty_on_hand,
                "qty_reserved": i.qty_reserved,
                "updated_at": i.updated_at.isoformat(),
            }
            for i in inv_items
        ]

    return base


@router.post("/{campaign_id}/generate")
def generate_campaign(
    campaign_id: uuid.UUID,
    ctx: AuthContext = Depends(require_api_key),
    db: Session = Depends(get_db),
) -> StartGenerationResponse:
    campaign = _get_owned_campaign(db, user_id=ctx.user_id, campaign_id=campaign_id)
    if campaign.status != "draft":
        raise ApiException(status_code=409, code="conflict", message="Campaign is not in draft state")

    _require_ready_images(db, campaign_id=campaign.id)

    db.execute(delete(CampaignStep).where(CampaignStep.campaign_id == campaign.id))
    db.execute(delete(CampaignProductSnapshot).where(CampaignProductSnapshot.campaign_id == campaign.id))
    db.flush()

    snapshot_json = _build_product_snapshot(db, campaign)
    snapshot = CampaignProductSnapshot(
        campaign_id=campaign.id,
        product_id=campaign.product_id,
        snapshot_json=snapshot_json,
    )
    db.add(snapshot)
    db.flush()

    campaign.product_snapshot_id = snapshot.id
    campaign.status = "running"
    campaign.approval_status = "none"

    for idx, step_key in enumerate(STEP_KEYS):
        step = CampaignStep(campaign_id=campaign.id, step_key=step_key, status="queued", attempt=1)
        db.add(step)

    db.commit()

    return StartGenerationResponse(campaign_id=campaign.id, campaign_status=campaign.status, current_step_key=STEP_KEYS[0])


@router.get("/{campaign_id}/progress")
def get_progress(
    campaign_id: uuid.UUID,
    ctx: AuthContext = Depends(require_api_key),
    db: Session = Depends(get_db),
) -> ProgressResponse:
    campaign = _get_owned_campaign(db, user_id=ctx.user_id, campaign_id=campaign_id)
    steps = db.execute(select(CampaignStep).where(CampaignStep.campaign_id == campaign.id)).scalars().all()
    step_list = [ProgressStep(step_key=s.step_key, status=s.status, duration_ms=s.duration_ms) for s in steps]

    current_step_key: str | None = None
    running = [s for s in steps if s.status == "running"]
    if running:
        current_step_key = running[0].step_key
    else:
        failed = [s for s in steps if s.status == "failed"]
        if failed:
            current_step_key = failed[0].step_key
        else:
            queued = [k for k in STEP_KEYS if any(s.step_key == k and s.status == "queued" for s in steps)]
            current_step_key = queued[0] if queued else None

    action_required: dict[str, Any] | None = None
    if campaign.approval_status == "pending_storyboard":
        action_required = {"type": "storyboard_approval", "step_key": "creative_director"}
        current_step_key = "creative_director"

    error: dict[str, Any] | None = None
    if campaign.status == "failed":
        failed_step = next((s for s in steps if s.status == "failed"), None)
        if failed_step:
            error = {
                "code": failed_step.error_code,
                "message": failed_step.error_message,
                "retryable": failed_step.retryable,
                "step_key": failed_step.step_key,
            }

    return ProgressResponse(
        campaign_id=campaign.id,
        campaign_status=campaign.status,
        approval_status=campaign.approval_status,
        current_step_key=current_step_key,
        steps=step_list,
        error=error,
        action_required=action_required,
    )


@router.get("/{campaign_id}/steps/{step_key}")
def get_step_output(
    campaign_id: uuid.UUID,
    step_key: str,
    ctx: AuthContext = Depends(require_api_key),
    db: Session = Depends(get_db),
) -> StepOutputResponse:
    campaign = _get_owned_campaign(db, user_id=ctx.user_id, campaign_id=campaign_id)
    step = db.execute(select(CampaignStep).where(CampaignStep.campaign_id == campaign.id, CampaignStep.step_key == step_key)).scalar_one_or_none()
    if not step:
        raise ApiException(status_code=404, code="not_found", message="Step not found")
    return StepOutputResponse(step_key=step.step_key, status=step.status, output=step.output_json)


@router.post("/{campaign_id}/steps/{step_key}/retry")
def retry_step(
    campaign_id: uuid.UUID,
    step_key: str,
    ctx: AuthContext = Depends(require_api_key),
    db: Session = Depends(get_db),
) -> RetryResponse:
    campaign = _get_owned_campaign(db, user_id=ctx.user_id, campaign_id=campaign_id)
    step = db.execute(select(CampaignStep).where(CampaignStep.campaign_id == campaign.id, CampaignStep.step_key == step_key)).scalar_one_or_none()
    if not step:
        raise ApiException(status_code=404, code="not_found", message="Step not found")
    if step.status not in {"failed", "success"}:
        raise ApiException(status_code=409, code="conflict", message="Step is not retryable in current state")
    if step.status == "failed" and not step.retryable:
        raise ApiException(status_code=409, code="conflict", message="Step is not retryable")

    step.status = "queued"
    step.started_at = None
    step.finished_at = None
    step.duration_ms = None
    step.output_json = None
    step.error_code = None
    step.error_message = None
    step.retryable = False
    step.attempt += 1
    campaign.status = "running"
    db.commit()
    return RetryResponse(step_key=step.step_key, status=step.status)


@router.post("/{campaign_id}/storyboard/approve")
def approve_storyboard(
    campaign_id: uuid.UUID,
    ctx: AuthContext = Depends(require_api_key),
    db: Session = Depends(get_db),
) -> ProgressResponse:
    campaign = _get_owned_campaign(db, user_id=ctx.user_id, campaign_id=campaign_id)
    if campaign.approval_status != "pending_storyboard":
        raise ApiException(status_code=409, code="conflict", message="Campaign is not waiting for storyboard approval")
    campaign.approval_status = "approved_storyboard"
    campaign.status = "running"
    db.commit()
    return get_progress(campaign_id, ctx, db)


@router.post("/{campaign_id}/storyboard/reject")
def reject_storyboard(
    campaign_id: uuid.UUID,
    ctx: AuthContext = Depends(require_api_key),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    campaign = _get_owned_campaign(db, user_id=ctx.user_id, campaign_id=campaign_id)
    if campaign.approval_status != "pending_storyboard":
        raise ApiException(status_code=409, code="conflict", message="Campaign is not waiting for storyboard approval")
    campaign.approval_status = "rejected_storyboard"
    campaign.status = "draft"
    campaign.product_snapshot_id = None
    db.execute(delete(CampaignStep).where(CampaignStep.campaign_id == campaign.id))
    db.execute(delete(CampaignProductSnapshot).where(CampaignProductSnapshot.campaign_id == campaign.id))
    db.commit()
    return {"status": "draft"}
