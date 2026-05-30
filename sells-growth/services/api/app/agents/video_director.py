from __future__ import annotations

from pydantic import BaseModel, Field

from ..providers.openai_client import generate_structured


class Shot(BaseModel):
    scene_no: int = Field(ge=1)
    shot_type: str = Field(pattern="^(wide|medium|close_up|macro|overhead)$")
    camera_movement: str = Field(pattern="^(static|pan|tilt|dolly_in|dolly_out|handheld)$")
    subject_action: str
    duration_sec: int = Field(ge=2, le=10)
    notes: str | None = None


class VideoDirectorOutput(BaseModel):
    aspect_ratio: str = Field(pattern="^(9:16|16:9|1:1)$")
    pace: str = Field(pattern="^(slow|medium|fast)$")
    music_mood: str = Field(min_length=3)
    shot_list: list[Shot] = Field(min_length=6, max_length=12)
    voiceover_script: str = Field(min_length=50)


def run(*, product: dict, options: dict, storyboard: dict, copy: dict) -> VideoDirectorOutput:
    prompt = (
        "You are Video Director for short-form product ads.\n"
        "Create a shot list and voiceover. Return JSON strictly matching the required schema.\n\n"
        f"Product:\n{product}\n\n"
        f"Options:\n{options}\n\n"
        f"Storyboard:\n{storyboard}\n\n"
        f"Copy:\n{copy}\n"
    )
    return generate_structured(output_model=VideoDirectorOutput, prompt=prompt)

