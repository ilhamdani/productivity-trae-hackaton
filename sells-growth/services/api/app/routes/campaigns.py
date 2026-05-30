from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import AuthContext, require_api_key
from ..db.engine import get_db
from ..db.models import Campaign, CampaignAsset, Product
from ..errors import ApiException

router = APIRouter(prefix="/campaigns")


class Money(BaseModel):
    currency: str = Field(default="IDR", pattern="^IDR$")
    amount: float = Field(ge=0)


class CampaignListItem(BaseModel):
    id: uuid.UUID
    product_name: str
    status: str
    created_at: datetime


class CampaignListResponse(BaseModel):
    items: list[CampaignListItem]


class CampaignCreateRequest(BaseModel):
    product_id: uuid.UUID | None = None
    product_name: str
    product_description: str
    price: Money
    category: str
    brand_tone: str | None = None
    target_location: str | None = None
    primary_goal: str | None = None


class CampaignCreateResponse(BaseModel):
    id: uuid.UUID
    status: str


class CampaignAssetItem(BaseModel):
    id: uuid.UUID
    asset_type: str
    public_url: str | None = None


class CampaignDetailResponse(BaseModel):
    id: uuid.UUID
    product_name: str
    product_description: str
    price: Money
    category: str
    status: str
    approval_status: str
    assets: list[CampaignAssetItem]


class CampaignUpdateRequest(BaseModel):
    product_name: str | None = None
    product_description: str | None = None
    price: Money | None = None
    category: str | None = None
    brand_tone: str | None = None
    target_location: str | None = None
    primary_goal: str | None = None


def _get_owned_campaign(db: Session, *, user_id: uuid.UUID, campaign_id: uuid.UUID) -> Campaign:
    campaign = db.execute(select(Campaign).where(Campaign.id == campaign_id, Campaign.user_id == user_id)).scalar_one_or_none()
    if not campaign:
        raise ApiException(status_code=404, code="not_found", message="Campaign not found")
    return campaign


@router.get("")
def list_campaigns(
    ctx: AuthContext = Depends(require_api_key),
    db: Session = Depends(get_db),
) -> CampaignListResponse:
    rows = db.execute(select(Campaign).where(Campaign.user_id == ctx.user_id).order_by(Campaign.updated_at.desc())).scalars().all()
    return CampaignListResponse(
        items=[
            CampaignListItem(id=r.id, product_name=r.product_name, status=r.status, created_at=r.created_at)
            for r in rows
        ]
    )


@router.post("")
def create_campaign(
    body: CampaignCreateRequest,
    ctx: AuthContext = Depends(require_api_key),
    db: Session = Depends(get_db),
) -> CampaignCreateResponse:
    if body.product_id:
        product = db.execute(select(Product).where(Product.id == body.product_id, Product.user_id == ctx.user_id)).scalar_one_or_none()
        if not product:
            raise ApiException(status_code=404, code="not_found", message="Product not found")
        product_name = body.product_name or product.name
        product_description = body.product_description or product.base_description
        category = body.category or product.category
        price_amount = body.price.amount if body.price else float(product.base_price_amount)
        price_currency = body.price.currency if body.price else product.price_currency
    else:
        product_name = body.product_name
        product_description = body.product_description
        category = body.category
        price_amount = body.price.amount
        price_currency = body.price.currency

    campaign = Campaign(
        user_id=ctx.user_id,
        product_id=body.product_id,
        product_name=product_name,
        product_description=product_description,
        price_amount=price_amount,
        price_currency=price_currency,
        category=category,
        brand_tone=body.brand_tone,
        target_location=body.target_location,
        primary_goal=body.primary_goal,
        status="draft",
        approval_status="none",
    )
    db.add(campaign)
    db.commit()
    return CampaignCreateResponse(id=campaign.id, status=campaign.status)


@router.get("/{campaign_id}")
def get_campaign(
    campaign_id: uuid.UUID,
    ctx: AuthContext = Depends(require_api_key),
    db: Session = Depends(get_db),
) -> CampaignDetailResponse:
    campaign = _get_owned_campaign(db, user_id=ctx.user_id, campaign_id=campaign_id)
    assets = db.execute(select(CampaignAsset).where(CampaignAsset.campaign_id == campaign.id)).scalars().all()
    return CampaignDetailResponse(
        id=campaign.id,
        product_name=campaign.product_name,
        product_description=campaign.product_description,
        price=Money(currency=campaign.price_currency, amount=float(campaign.price_amount)),
        category=campaign.category,
        status=campaign.status,
        approval_status=campaign.approval_status,
        assets=[
            CampaignAssetItem(id=a.id, asset_type=a.asset_type, public_url=a.public_url)
            for a in assets
        ],
    )


@router.patch("/{campaign_id}")
def update_campaign(
    campaign_id: uuid.UUID,
    body: CampaignUpdateRequest,
    ctx: AuthContext = Depends(require_api_key),
    db: Session = Depends(get_db),
) -> CampaignDetailResponse:
    campaign = _get_owned_campaign(db, user_id=ctx.user_id, campaign_id=campaign_id)
    if campaign.status != "draft":
        raise ApiException(status_code=409, code="conflict", message="Campaign is not editable")

    if body.product_name is not None:
        campaign.product_name = body.product_name
    if body.product_description is not None:
        campaign.product_description = body.product_description
    if body.price is not None:
        campaign.price_currency = body.price.currency
        campaign.price_amount = body.price.amount
    if body.category is not None:
        campaign.category = body.category
    if body.brand_tone is not None:
        campaign.brand_tone = body.brand_tone
    if body.target_location is not None:
        campaign.target_location = body.target_location
    if body.primary_goal is not None:
        campaign.primary_goal = body.primary_goal

    db.commit()
    return get_campaign(campaign_id, ctx, db)

