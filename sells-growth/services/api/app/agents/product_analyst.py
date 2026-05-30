from __future__ import annotations

from pydantic import BaseModel, Field

from ..contracts.common import Audience
from ..providers.openai_client import generate_structured


class ObjectionAnswer(BaseModel):
    objection: str
    response: str


class ProductAnalystOutput(BaseModel):
    product_summary: str = Field(min_length=20)
    usp: list[str] = Field(min_length=1, max_length=5)
    key_benefits: list[str] = Field(min_length=2, max_length=6)
    positioning_statement: str = Field(min_length=20)
    target_audience: Audience
    objections_and_answers: list[ObjectionAnswer] = Field(min_length=1, max_length=5)


def run(*, product: dict, options: dict) -> ProductAnalystOutput:
    prompt = (
        "You are Product Analyst for UMKM marketing.\n"
        "Analyze the product and return JSON strictly matching the required schema.\n\n"
        f"Product:\n{product}\n\n"
        f"Options:\n{options}\n"
    )
    return generate_structured(output_model=ProductAnalystOutput, prompt=prompt)

