from __future__ import annotations

from pydantic import BaseModel, Field

from ..providers.openai_client import generate_structured


class VisualStyle(BaseModel):
    color_palette: list[str] = Field(min_length=2)
    lighting: str
    mood_keywords: list[str] = Field(min_length=2)


class StoryboardScene(BaseModel):
    scene_no: int = Field(ge=1)
    purpose: str
    on_screen_text: str | None = None
    visual_description: str
    emotion: str
    duration_sec: int = Field(ge=2, le=10)


class CreativeDirectorOutput(BaseModel):
    creative_concept: str = Field(min_length=20)
    visual_style: VisualStyle
    storyboard: list[StoryboardScene] = Field(min_length=5, max_length=9)


def run(*, product: dict, options: dict, strategy: dict, copy: dict) -> CreativeDirectorOutput:
    prompt = (
        "You are Creative Director for UMKM marketing.\n"
        "Create a creative concept and storyboard. Return JSON strictly matching the required schema.\n\n"
        f"Product:\n{product}\n\n"
        f"Options:\n{options}\n\n"
        f"Strategy:\n{strategy}\n\n"
        f"Copy:\n{copy}\n"
    )
    return generate_structured(output_model=CreativeDirectorOutput, prompt=prompt)

