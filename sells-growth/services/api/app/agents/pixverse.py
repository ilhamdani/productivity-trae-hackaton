from __future__ import annotations

from pydantic import BaseModel, Field

from ..providers.openai_client import generate_structured


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


def run(*, product: dict, options: dict, storyboard: dict, video_plan: dict) -> PixverseOutput:
    prompt = (
        "You are PixVerse prompt engineer.\n"
        "Create a strong text-to-video prompt for PixVerse CLI. Return JSON strictly matching the required schema.\n"
        "Set video_settings.duration_sec between 30 and 45.\n\n"
        f"Product:\n{product}\n\n"
        f"Options:\n{options}\n\n"
        f"Storyboard:\n{storyboard}\n\n"
        f"Video Plan:\n{video_plan}\n"
    )
    return generate_structured(output_model=PixverseOutput, prompt=prompt)
