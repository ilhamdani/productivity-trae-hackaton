from __future__ import annotations

from dataclasses import dataclass

STEP_KEYS: list[str] = [
    "product_analyst",
    "marketing_strategist",
    "copywriter",
    "creative_director",
    "video_director",
    "pixverse",
    "campaign_manager",
]


@dataclass(frozen=True)
class StepSpec:
    step_key: str


def next_step_key(step_key: str) -> str | None:
    try:
        idx = STEP_KEYS.index(step_key)
    except ValueError:
        return None
    if idx + 1 >= len(STEP_KEYS):
        return None
    return STEP_KEYS[idx + 1]

