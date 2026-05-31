from __future__ import annotations

from pydantic import BaseModel, Field

from ..contracts.common import Audience
from ..providers.openai_client import generate_structured
from ..prompts.defaults import get_default_prompt


class Offer(BaseModel):
    headline: str
    mechanic: str = Field(pattern="^(discount|bundle|bogo|free_addon|limited_drop|loyalty_points)$")
    details: str
    validity_days: int = Field(ge=1, le=30)


class PublishingPlan(BaseModel):
    duration_days: int = Field(ge=3, le=14)
    posts_per_day: int = Field(ge=1, le=5)
    best_time_windows: list[str] = Field(min_length=1)


class SuccessMetrics(BaseModel):
    primary: str
    secondary: list[str] = Field(default_factory=list)


class MarketingStrategistOutput(BaseModel):
    campaign_name: str = Field(min_length=3)
    objective: str = Field(pattern="^(awareness|conversion|retention)$")
    target_audience_refinement: Audience
    offer: Offer
    channels: list[str] = Field(min_length=1)
    messaging_pillars: list[str] = Field(min_length=2, max_length=5)
    content_angles: list[str] = Field(min_length=3, max_length=8)
    publishing_plan: PublishingPlan
    success_metrics: SuccessMetrics


def run(*, product: dict, options: dict, product_insight: dict, prompt_prefix: str | None = None) -> MarketingStrategistOutput:
    prefix = (prompt_prefix or "").strip() or get_default_prompt("marketing_strategist")
    parts = [prefix, f"Product:\n{product}\n\n", f"Options:\n{options}\n\n", f"Product Insight:\n{product_insight}\n"]
    prompt = "".join(parts)
    return generate_structured(output_model=MarketingStrategistOutput, prompt=prompt)
