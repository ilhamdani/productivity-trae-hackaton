from __future__ import annotations

from pydantic import BaseModel, Field

from ..providers.openai_client import generate_structured
from ..prompts.defaults import get_default_prompt


class CopywriterOutput(BaseModel):
    brand_voice: str = Field(min_length=3)
    instagram_caption: str = Field(min_length=50)
    tiktok_caption: str = Field(min_length=20)
    facebook_post: str = Field(min_length=50)
    whatsapp_broadcast: str = Field(min_length=50)
    cta_variants: list[str] = Field(min_length=3, max_length=7)
    hashtags: list[str] = Field(min_length=8, max_length=20)
    disclaimer: str = Field(min_length=3)


def run(*, product: dict, options: dict, strategy: dict, prompt_prefix: str | None = None) -> CopywriterOutput:
    prefix = (prompt_prefix or "").strip() or get_default_prompt("copywriter")
    parts = [prefix]
    parts.extend(
        [
            f"Product:\n{product}\n\n",
            f"Options:\n{options}\n\n",
            f"Strategy:\n{strategy}\n",
        ]
    )
    prompt = "".join(parts)
    return generate_structured(output_model=CopywriterOutput, prompt=prompt)
