from __future__ import annotations

import base64
import hashlib
import hmac
import secrets


def hash_api_key(*, api_key: str, salt: str) -> str:
    value = f"{salt}:{api_key}".encode("utf-8")
    return hashlib.sha256(value).hexdigest()


def hash_password(*, password: str) -> str:
    iterations = 210_000
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
    salt_b64 = base64.urlsafe_b64encode(salt).decode("ascii").rstrip("=")
    digest_b64 = base64.urlsafe_b64encode(digest).decode("ascii").rstrip("=")
    return f"pbkdf2_sha256${iterations}${salt_b64}${digest_b64}"


def verify_password(*, password: str, password_hash: str) -> bool:
    try:
        algo, iter_s, salt_b64, digest_b64 = password_hash.split("$", 3)
        if algo != "pbkdf2_sha256":
            return False
        iterations = int(iter_s)
        pad = "=" * (-len(salt_b64) % 4)
        salt = base64.urlsafe_b64decode((salt_b64 + pad).encode("ascii"))
        pad2 = "=" * (-len(digest_b64) % 4)
        expected = base64.urlsafe_b64decode((digest_b64 + pad2).encode("ascii"))
        actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
        return hmac.compare_digest(actual, expected)
    except Exception:
        return False

