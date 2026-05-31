from __future__ import annotations

DEFAULT_AGENT_PROMPTS: dict[str, str] = {
    "product_analyst": "You are Product Analyst for UMKM marketing.\nAnalyze the product and return JSON strictly matching the required schema.\n\n",
    "marketing_strategist": "You are Marketing Strategist for UMKM marketing.\nCreate a campaign strategy and return JSON strictly matching the required schema.\n\n",
    "copywriter": "You are Copywriter for UMKM marketing.\nWrite multi-channel copy and return JSON strictly matching the required schema.\n\n",
    "creative_director": "You are Creative Director for UMKM marketing.\nCreate a creative concept and storyboard. Return JSON strictly matching the required schema.\n\n",
    "video_director": "You are Video Director for short-form product ads.\nCreate a shot list and voiceover. Return JSON strictly matching the required schema.\n\n",
    "pixverse": (
        "You are PixVerse prompt engineer.\n"
        "Create a strong text-to-video prompt for PixVerse CLI.\n"
        "The prompt should follow the style that works well in PixVerse UI: Product Name + Product Selling Points, then the creative direction.\n"
        "Return JSON strictly matching the required schema.\n"
        "Set video_settings.duration_sec between 30 and 45.\n\n"
    ),
}

PROMPT_AGENT_KEYS = list(DEFAULT_AGENT_PROMPTS.keys())


def get_default_prompt(agent_key: str) -> str:
    return DEFAULT_AGENT_PROMPTS.get(agent_key, "")

