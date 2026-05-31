from __future__ import annotations

from pydantic import BaseModel, Field

from ..providers.openai_client import generate_structured
from ..prompts.defaults import get_default_prompt


class VideoSettings(BaseModel):
    duration_sec: int = Field(ge=30, le=45)
    aspect_ratio: str = Field(pattern="^(9:16|16:9|1:1)$")
    style: str = Field(min_length=3)


class RenderRequest(BaseModel):
    provider: str = Field(default="pixverse", pattern="^pixverse$")
    request_id: str
    status: str = Field(pattern="^(created|queued|running|completed|failed)$")


class PixverseOutput(BaseModel):
    pixverse_prompt: str = Field(min_length=80)
    negative_prompt: str | None = None
    video_settings: VideoSettings
    render_request: RenderRequest | None = None


def run(
    *,
    product: dict,
    options: dict,
    storyboard: dict,
    video_plan: dict,
    product_insight: dict | None = None,
    prompt_prefix: str | None = None,
) -> PixverseOutput:
    insight = product_insight or {}
    selling_points = ""
    if isinstance(insight.get("product_summary"), str) and insight.get("product_summary"):
        selling_points += insight["product_summary"].strip()
    if isinstance(insight.get("usp"), list) and insight.get("usp"):
        selling_points += "\n\nUSP:\n" + "\n".join([f"- {str(x).strip()}" for x in insight["usp"] if str(x).strip()])
    if isinstance(insight.get("key_benefits"), list) and insight.get("key_benefits"):
        selling_points += "\n\nKey benefits:\n" + "\n".join([f"- {str(x).strip()}" for x in insight["key_benefits"] if str(x).strip()])

    product_name = str(product.get("name") or product.get("product_name") or "").strip()
    product_desc = str(product.get("description") or product.get("product_description") or "").strip()
    image_urls = product.get("image_urls")

    prefix = (prompt_prefix or "").strip() or get_default_prompt("pixverse")
    parts = [prefix]
    parts.extend(
        [
            f"Product Name:\n{product_name}\n\n",
            f"Product Selling Points:\n{selling_points or product_desc}\n\n",
            f"Product Data:\n{product}\n\n",
            f"Options:\n{options}\n\n",
            f"Storyboard:\n{storyboard}\n\n",
            f"Video Plan:\n{video_plan}\n\n",
            f"Product Image URLs:\n{image_urls}\n",
        ]
    )
    prompt = "".join(parts)
    return generate_structured(output_model=PixverseOutput, prompt=prompt)
