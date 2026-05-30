from __future__ import annotations

from pydantic import BaseModel, Field

from ..providers.openai_client import generate_structured


class CopywriterOutput(BaseModel):
    brand_voice: str = Field(min_length=3)
    instagram_caption: str = Field(min_length=50)
    tiktok_caption: str = Field(min_length=20)
    facebook_post: str = Field(min_length=50)
    whatsapp_broadcast: str = Field(min_length=50)
    cta_variants: list[str] = Field(min_length=3, max_length=7)
    hashtags: list[str] = Field(min_length=8, max_length=20)
    disclaimer: str = Field(min_length=3)


def run(*, product: dict, options: dict, strategy: dict) -> CopywriterOutput:
    prompt = (
        "You are Copywriter for UMKM marketing.\n"
        "Write multi-channel copy and return JSON strictly matching the required schema.\n\n"
        f"Product:\n{product}\n\n"
        f"Options:\n{options}\n\n"
        f"Strategy:\n{strategy}\n"
    )
    return generate_structured(output_model=CopywriterOutput, prompt=prompt)

