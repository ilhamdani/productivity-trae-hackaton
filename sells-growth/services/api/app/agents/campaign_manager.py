from __future__ import annotations

from pydantic import BaseModel, Field


class CampaignVideo(BaseModel):
    pixverse_prompt: str
    video_asset_url: str | None = None
    duration_sec: int
    aspect_ratio: str


class CampaignPackage(BaseModel):
    summary: str
    strategy: dict
    copy: dict
    creative: dict
    video: CampaignVideo
    publish_checklist: list[str] = Field(min_length=5, max_length=12)


class CampaignManagerOutput(BaseModel):
    campaign_package: CampaignPackage

