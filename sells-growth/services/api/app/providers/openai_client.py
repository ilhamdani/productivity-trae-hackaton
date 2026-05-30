from __future__ import annotations

import json
from typing import TypeVar

from openai import OpenAI
from pydantic import BaseModel, ValidationError
from pydantic_core import ValidationError as CoreValidationError

from ..errors import ApiException
from ..settings import get_settings

T = TypeVar("T", bound=BaseModel)


def _extract_json(text: str) -> str:
    value = text.strip()
    if value.startswith("```"):
        value = value.split("```", 2)[1]
        value = value.strip()
        if value.startswith("json"):
            value = value[4:].strip()
    if not value.startswith("{"):
        start = value.find("{")
        end = value.rfind("}")
        if start != -1 and end != -1 and end > start:
            value = value[start : end + 1]
    return value


def _chat_json(*, client: OpenAI, model: str, system: str, prompt: str, temperature: float) -> str:
    res = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": prompt},
        ],
        temperature=temperature,
        response_format={"type": "json_object"},
    )
    return res.choices[0].message.content or ""


def generate_structured(*, output_model: type[T], prompt: str, model: str | None = None, temperature: float = 0.7) -> T:
    settings = get_settings()
    if not settings.openai_api_key:
        raise ApiException(status_code=500, code="misconfigured", message="OPENAI_API_KEY is not set")

    schema = json.dumps(output_model.model_json_schema(), ensure_ascii=False)
    system = (
        "You are a strict JSON generator.\n"
        "Return only a single JSON object.\n"
        "The JSON MUST validate against this JSON Schema:\n"
        f"{schema}\n"
        "Do not include markdown, code fences, or any extra text.\n"
        "Do not add extra keys beyond the schema.\n"
        "Respect min/max constraints (string min_length, list min/max items, required fields).\n"
        "If Options.language is present, write natural text fields in that language.\n"
    )

    client = OpenAI(api_key=settings.openai_api_key, base_url=settings.openai_base_url_v1())
    used_model = model or settings.openai_model
    content = _chat_json(client=client, model=used_model, system=system, prompt=prompt, temperature=temperature)
    raw = _extract_json(content)
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as e:
        raise ApiException(
            status_code=502,
            code="ai_invalid_json",
            message=f"AI returned invalid JSON: {str(e)}",
            details={"error": str(e), "raw": content},
        )

    try:
        return output_model.model_validate(data)
    except (ValidationError, CoreValidationError) as e:
        errs = e.errors()
        repair_system = (
            "You are a strict JSON repair assistant.\n"
            "Return only a single JSON object.\n"
            "Fix the provided JSON so it validates against this JSON Schema:\n"
            f"{schema}\n"
            "Do not include markdown, code fences, or any extra text.\n"
            "Do not add extra keys beyond the schema.\n"
        )
        repair_prompt = (
            "The JSON below failed schema validation.\n"
            "Return a corrected JSON object that fully satisfies the schema.\n\n"
            f"Validation errors:\n{json.dumps(errs, ensure_ascii=False)}\n\n"
            f"Invalid JSON:\n{json.dumps(data, ensure_ascii=False)}\n"
        )
        fixed_content = _chat_json(client=client, model=used_model, system=repair_system, prompt=repair_prompt, temperature=0.0)
        fixed_raw = _extract_json(fixed_content)
        try:
            fixed_data = json.loads(fixed_raw)
        except json.JSONDecodeError as e2:
            first = errs[0] if errs else {"loc": [], "msg": "validation_error"}
            loc = ".".join(str(x) for x in (first.get("loc") or []))
            msg = first.get("msg") or "validation_error"
            raise ApiException(
                status_code=502,
                code="ai_schema_mismatch",
                message=f"AI output schema mismatch: {loc} {msg}".strip(),
                details={"errors": errs, "raw": data, "repair_error": str(e2), "repair_raw": fixed_content},
            )
        try:
            return output_model.model_validate(fixed_data)
        except (ValidationError, CoreValidationError) as e3:
            fixed_errs = e3.errors()
            first = fixed_errs[0] if fixed_errs else {"loc": [], "msg": "validation_error"}
            loc = ".".join(str(x) for x in (first.get("loc") or []))
            msg = first.get("msg") or "validation_error"
            raise ApiException(
                status_code=502,
                code="ai_schema_mismatch",
                message=f"AI output schema mismatch: {loc} {msg}".strip(),
                details={"errors": fixed_errs, "raw": fixed_data, "original_errors": errs, "original_raw": data},
            )
    except Exception as e:
        raise ApiException(
            status_code=502,
            code="ai_schema_mismatch",
            message=f"AI output schema mismatch: {str(e)}",
            details={"error": str(e), "raw": data},
        )
