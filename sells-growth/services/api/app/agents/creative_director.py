from __future__ import annotations

from pydantic import BaseModel, Field

from ..providers.openai_client import generate_structured
from ..prompts.defaults import get_default_prompt


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


def run(*, product: dict, options: dict, strategy: dict, copy: dict, prompt_prefix: str | None = None) -> CreativeDirectorOutput:
    prefix = (prompt_prefix or "").strip() or get_default_prompt("creative_director")
    parts = [prefix]
    parts.extend(
        [
            f"Product:\n{product}\n\n",
            f"Options:\n{options}\n\n",
            f"Strategy:\n{strategy}\n\n",
            f"Copy:\n{copy}\n",
        ]
    )
    prompt = "".join(parts)
    return generate_structured(output_model=CreativeDirectorOutput, prompt=prompt)
