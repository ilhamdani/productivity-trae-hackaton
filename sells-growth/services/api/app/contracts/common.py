from __future__ import annotations

from pydantic import BaseModel, Field


class Money(BaseModel):
    currency: str = Field(default="IDR", pattern="^IDR$")
    amount: float = Field(ge=0)


class AudienceDemographics(BaseModel):
    age_range: str
    gender: str | None = None
    location: str
    income_level: str | None = None
    occupation: str | None = None


class AudiencePsychographics(BaseModel):
    interests: list[str] = Field(min_length=1)
    values: list[str] = Field(default_factory=list)
    behaviors: list[str] = Field(default_factory=list)


class Audience(BaseModel):
    demographics: AudienceDemographics
    psychographics: AudiencePsychographics
    pain_points: list[str] = Field(min_length=1)

