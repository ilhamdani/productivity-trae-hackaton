from __future__ import annotations

import hashlib


def hash_api_key(*, api_key: str, salt: str) -> str:
    value = f"{salt}:{api_key}".encode("utf-8")
    return hashlib.sha256(value).hexdigest()

