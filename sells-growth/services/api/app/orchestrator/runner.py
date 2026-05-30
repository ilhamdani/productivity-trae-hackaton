from __future__ import annotations

import asyncio
import time
import uuid
from datetime import datetime, timezone
from typing import Any
import os

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..agents import campaign_manager, copywriter, creative_director, marketing_strategist, pixverse, product_analyst, video_director
from ..db.engine import SessionLocal
from ..db.models import Campaign, CampaignAsset, CampaignProductSnapshot, CampaignStep, Inventory, Product
from ..errors import ApiException
from ..providers.pixverse_cli import render_video_min_duration
from ..providers.storage import upload_file
from ..settings import get_settings
from .state import STEP_KEYS, next_step_key


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _build_product_snapshot(db: Session, campaign: Campaign) -> dict[str, Any]:
    base = {
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

        product = db.execute(select(Product).where(Product.id == campaign.product_id)).scalar_one_or_none()
        if product:
            base["sku"] = product.sku

    return base


def _campaign_options(campaign: Campaign) -> dict[str, Any]:
    return {
        "language": "id",
        "primary_goal": campaign.primary_goal or "conversion",
        "brand_tone": campaign.brand_tone or "",
        "target_location": campaign.target_location or "",
    }


def _get_step_map(db: Session, campaign_id: uuid.UUID) -> dict[str, CampaignStep]:
    steps = db.execute(select(CampaignStep).where(CampaignStep.campaign_id == campaign_id)).scalars().all()
    return {s.step_key: s for s in steps}


def _is_runnable_step(campaign: Campaign, step_key: str, step_map: dict[str, CampaignStep]) -> bool:
    step = step_map.get(step_key)
    if not step or step.status != "queued":
        return False

    for prev_key in STEP_KEYS:
        if prev_key == step_key:
            break
        prev = step_map.get(prev_key)
        if not prev or prev.status != "success":
            return False

    if step_key in ("video_director", "pixverse", "campaign_manager"):
        if campaign.approval_status != "approved_storyboard":
            return False

    return True


def _claim_next_step(db: Session) -> tuple[Campaign, CampaignStep] | None:
    campaigns = db.execute(
        select(Campaign).where(Campaign.status == "running").order_by(Campaign.updated_at.asc())
    ).scalars().all()

    for campaign in campaigns:
        step_map = _get_step_map(db, campaign.id)
        for step_key in STEP_KEYS:
            if _is_runnable_step(campaign, step_key, step_map):
                step = step_map[step_key]
                step.status = "running"
                step.started_at = _utcnow()
                db.flush()
                return campaign, step

    return None


def _fail_step(db: Session, *, campaign: Campaign, step: CampaignStep, error_code: str, error_message: str, retryable: bool) -> None:
    step.status = "failed"
    step.finished_at = _utcnow()
    if step.started_at:
        step.duration_ms = int((step.finished_at - step.started_at).total_seconds() * 1000)
    step.error_code = error_code
    step.error_message = error_message
    step.retryable = retryable
    campaign.status = "failed"


def _success_step(db: Session, *, campaign: Campaign, step: CampaignStep, output: dict[str, Any]) -> None:
    step.status = "success"
    step.finished_at = _utcnow()
    if step.started_at:
        step.duration_ms = int((step.finished_at - step.started_at).total_seconds() * 1000)
    step.output_json = output
    step.error_code = None
    step.error_message = None
    step.retryable = False

    if step.step_key == "creative_director":
        campaign.approval_status = "pending_storyboard"

    if step.step_key == "campaign_manager":
        campaign.status = "complete"


def _run_step(db: Session, *, campaign: Campaign, step: CampaignStep) -> dict[str, Any]:
    snapshot = db.execute(
        select(CampaignProductSnapshot).where(CampaignProductSnapshot.campaign_id == campaign.id)
    ).scalar_one_or_none()
    if not snapshot:
        raise ApiException(status_code=409, code="conflict", message="Campaign snapshot not found")

    product = snapshot.snapshot_json
    options = _campaign_options(campaign)
    step_map = _get_step_map(db, campaign.id)

    if step.step_key == "product_analyst":
        return product_analyst.run(product=product, options=options).model_dump(mode="json")

    if step.step_key == "marketing_strategist":
        return marketing_strategist.run(
            product=product,
            options=options,
            product_insight=step_map["product_analyst"].output_json or {},
        ).model_dump(mode="json")

    if step.step_key == "copywriter":
        return copywriter.run(
            product=product,
            options=options,
            strategy=step_map["marketing_strategist"].output_json or {},
        ).model_dump(mode="json")

    if step.step_key == "creative_director":
        return creative_director.run(
            product=product,
            options=options,
            strategy=step_map["marketing_strategist"].output_json or {},
            copy=step_map["copywriter"].output_json or {},
        ).model_dump(mode="json")

    if step.step_key == "video_director":
        return video_director.run(
            product=product,
            options=options,
            storyboard=step_map["creative_director"].output_json or {},
            copy=step_map["copywriter"].output_json or {},
        ).model_dump(mode="json")

    if step.step_key == "pixverse":
        pv = pixverse.run(
            product=product,
            options=options,
            storyboard=step_map["creative_director"].output_json or {},
            video_plan=step_map["video_director"].output_json or {},
        )
        work_dir = os.path.join("/tmp", "aigrowthcopilot", str(campaign.id), str(step.id))
        os.makedirs(work_dir, exist_ok=True)

        downloaded = render_video_min_duration(
            prompt=pv.pixverse_prompt,
            aspect_ratio=pv.video_settings.aspect_ratio,
            min_duration_sec=pv.video_settings.duration_sec,
            work_dir=work_dir,
        )

        settings = get_settings()
        object_name = f"campaigns/{campaign.id}/videos/{downloaded.video_id}.mp4"
        upload_file(object_name=object_name, file_path=downloaded.file_path, content_type="video/mp4", settings=settings)

        public_url = f"{settings.public_s3_base_url.rstrip('/')}/{settings.s3_bucket}/{object_name}"
        asset = CampaignAsset(
            campaign_id=campaign.id,
            asset_type="pixverse_video",
            storage_provider="minio",
            storage_path=object_name,
            public_url=public_url,
            asset_meta={
                "duration_sec": downloaded.duration_sec,
                "aspect_ratio": pv.video_settings.aspect_ratio,
                "source_video_id": downloaded.video_id,
            },
        )
        db.add(asset)
        db.flush()

        data = pv.model_dump(mode="json")
        data["render_request"] = {"provider": "pixverse", "request_id": downloaded.video_id, "status": "completed"}
        data["video_asset_url"] = public_url
        return data

    if step.step_key == "campaign_manager":
        pv = step_map["pixverse"].output_json or {}
        video_obj = {
            "pixverse_prompt": pv.get("pixverse_prompt", ""),
            "video_asset_url": pv.get("video_asset_url"),
            "duration_sec": (pv.get("video_settings") or {}).get("duration_sec", 30),
            "aspect_ratio": (pv.get("video_settings") or {}).get("aspect_ratio", "9:16"),
        }
        package = campaign_manager.CampaignPackage(
            summary="Paket kampanye siap pakai untuk promosi produk.",
            strategy=step_map["marketing_strategist"].output_json or {},
            copy=step_map["copywriter"].output_json or {},
            creative=step_map["creative_director"].output_json or {},
            video=campaign_manager.CampaignVideo.model_validate(video_obj),
            publish_checklist=[
                "Upload video ke TikTok dan IG Reels",
                "Cantumkan CTA dan link order",
                "Pastikan jam promo tertulis jelas",
                "Pin posting promo selama periode kampanye",
                "Siapkan quick reply untuk DM/WA",
            ],
        )
        return campaign_manager.CampaignManagerOutput(campaign_package=package).model_dump(mode="json")

    raise ApiException(status_code=500, code="unknown_step", message="Unknown step")


def run_once() -> None:
    db: Session = SessionLocal()
    try:
        claimed = _claim_next_step(db)
        if not claimed:
            db.rollback()
            return

        campaign, step = claimed
        db.commit()

        db2: Session = SessionLocal()
        try:
            campaign2 = db2.execute(select(Campaign).where(Campaign.id == campaign.id)).scalar_one()
            step2 = db2.execute(select(CampaignStep).where(CampaignStep.id == step.id)).scalar_one()
            started = time.time()
            try:
                output = _run_step(db2, campaign=campaign2, step=step2)
            except ApiException as e:
                _fail_step(
                    db2,
                    campaign=campaign2,
                    step=step2,
                    error_code=e.code,
                    error_message=e.message,
                    retryable=e.code in {"misconfigured", "ai_invalid_json", "ai_schema_mismatch", "pixverse_error", "pixverse_invalid_json"},
                )
                db2.commit()
                return
            except Exception as e:
                _fail_step(db2, campaign=campaign2, step=step2, error_code="step_error", error_message=str(e), retryable=True)
                db2.commit()
                return

            _success_step(db2, campaign=campaign2, step=step2, output=output)
            if step2.started_at:
                step2.duration_ms = int((time.time() - started) * 1000)
            db2.commit()
        finally:
            db2.close()
    finally:
        db.close()


async def worker_loop(*, poll_interval_sec: float = 1.0) -> None:
    while True:
        try:
            await asyncio.to_thread(run_once)
        except Exception:
            pass
        await asyncio.sleep(poll_interval_sec)
