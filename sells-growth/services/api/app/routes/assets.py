from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import AuthContext, require_api_key
from ..db.engine import get_db
from ..db.models import Campaign, CampaignAsset
from ..errors import ApiException
from ..providers.storage import presign_put_object
from ..settings import get_settings

router = APIRouter(prefix="/campaigns")


class PresignFile(BaseModel):
    filename: str = Field(min_length=1)
    content_type: str = Field(min_length=1)


class PresignRequest(BaseModel):
    files: list[PresignFile] = Field(min_length=1, max_length=5)


class PresignItem(BaseModel):
    asset_id: uuid.UUID
    upload_url: str
    storage_path: str


class PresignResponse(BaseModel):
    items: list[PresignItem]


class CommitRequest(BaseModel):
    asset_ids: list[uuid.UUID] = Field(min_length=1, max_length=5)


class AssetItem(BaseModel):
    id: uuid.UUID
    asset_type: str
    public_url: str | None


class CommitResponse(BaseModel):
    items: list[AssetItem]


def _get_owned_campaign(db: Session, *, user_id: uuid.UUID, campaign_id: uuid.UUID) -> Campaign:
    campaign = db.execute(select(Campaign).where(Campaign.id == campaign_id, Campaign.user_id == user_id)).scalar_one_or_none()
    if not campaign:
        raise ApiException(status_code=404, code="not_found", message="Campaign not found")
    return campaign


@router.post("/{campaign_id}/assets/product-images/presign")
def presign_product_images(
    campaign_id: uuid.UUID,
    body: PresignRequest,
    ctx: AuthContext = Depends(require_api_key),
    db: Session = Depends(get_db),
) -> PresignResponse:
    campaign = _get_owned_campaign(db, user_id=ctx.user_id, campaign_id=campaign_id)
    if campaign.status != "draft":
        raise ApiException(status_code=409, code="conflict", message="Campaign is not editable")

    existing_count = db.execute(
        select(CampaignAsset).where(CampaignAsset.campaign_id == campaign.id, CampaignAsset.asset_type == "product_image")
    ).scalars().all()
    if len(existing_count) + len(body.files) > 5:
        raise ApiException(status_code=422, code="validation_error", message="Maximum 5 images")

    items: list[PresignItem] = []
    for f in body.files:
        asset = CampaignAsset(
            campaign_id=campaign.id,
            asset_type="product_image",
            storage_provider="minio",
            storage_path="",
            public_url=None,
            asset_meta={"filename": f.filename, "content_type": f.content_type, "status": "presigned"},
        )
        db.add(asset)
        db.flush()

        storage_path = f"campaigns/{campaign.id}/product-images/{asset.id}/{f.filename}"
        asset.storage_path = storage_path

        upload_url = presign_put_object(object_name=storage_path, content_type=f.content_type)
        items.append(PresignItem(asset_id=asset.id, upload_url=upload_url, storage_path=storage_path))

    db.commit()
    return PresignResponse(items=items)


@router.post("/{campaign_id}/assets/product-images/commit")
def commit_product_images(
    campaign_id: uuid.UUID,
    body: CommitRequest,
    ctx: AuthContext = Depends(require_api_key),
    db: Session = Depends(get_db),
) -> CommitResponse:
    campaign = _get_owned_campaign(db, user_id=ctx.user_id, campaign_id=campaign_id)
    if campaign.status != "draft":
        raise ApiException(status_code=409, code="conflict", message="Campaign is not editable")

    assets = db.execute(
        select(CampaignAsset).where(
            CampaignAsset.campaign_id == campaign.id,
            CampaignAsset.id.in_(body.asset_ids),
            CampaignAsset.asset_type == "product_image",
        )
    ).scalars().all()

    if len(assets) != len(set(body.asset_ids)):
        raise ApiException(status_code=404, code="not_found", message="Asset not found")

    settings = get_settings()
    base = settings.public_s3_base_url.rstrip("/")
    bucket = settings.s3_bucket

    for asset in assets:
        meta = asset.asset_meta or {}
        meta["status"] = "ready"
        asset.asset_meta = meta
        asset.public_url = f"{base}/{bucket}/{asset.storage_path}"

    db.commit()

    return CommitResponse(items=[AssetItem(id=a.id, asset_type=a.asset_type, public_url=a.public_url) for a in assets])
