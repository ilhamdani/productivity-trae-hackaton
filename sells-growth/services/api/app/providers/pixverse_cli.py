from __future__ import annotations

import json
import os
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from ..errors import ApiException
from ..settings import get_settings


@dataclass(frozen=True)
class PixverseDownloadedVideo:
    video_id: str
    file_path: str
    duration_sec: float | None


def _run_json(args: list[str]) -> dict[str, Any]:
    settings = get_settings()
    if settings.pixverse_workspace_id:
        args = [args[0], "--workspace-id", str(settings.pixverse_workspace_id), *args[1:]]

    proc = subprocess.run(args, capture_output=True, text=True)
    stdout = (proc.stdout or "").strip()
    stderr = (proc.stderr or "").strip()
    if proc.returncode != 0:
        combined = f"{stdout}\n{stderr}".lower()
        if "not logged in" in combined or "unauthorized" in combined:
            raise ApiException(
                status_code=500,
                code="misconfigured",
                message="PixVerse CLI is not authenticated. Run `pixverse auth login` inside the api container, then retry the step.",
                details={"stdout": stdout, "stderr": stderr, "code": proc.returncode},
            )
        raise ApiException(
            status_code=502,
            code="pixverse_error",
            message="PixVerse CLI error",
            details={"stdout": stdout, "stderr": stderr, "code": proc.returncode},
        )
    if not stdout:
        return {}
    try:
        return json.loads(stdout)
    except json.JSONDecodeError:
        raise ApiException(status_code=502, code="pixverse_invalid_json", message="PixVerse CLI returned invalid JSON", details={"stdout": stdout, "stderr": stderr})


def create_video(*, prompt: str, aspect_ratio: str, quality: str = "1080p", model: str = "v6", duration_sec: int | None = None) -> str:
    args = [
        "pixverse",
        "create",
        "video",
        "--prompt",
        prompt,
        "--aspect-ratio",
        aspect_ratio,
        "--model",
        model,
        "--quality",
        quality,
        "--no-wait",
        "--json",
    ]
    if duration_sec is not None:
        args.extend(["--duration", str(duration_sec)])
    data = _run_json(args)
    video_id = data.get("video_id") or data.get("id") or data.get("task_id")
    if not video_id:
        raise ApiException(status_code=502, code="pixverse_missing_video_id", message="PixVerse create did not return video_id", details={"data": data})
    return str(video_id)


def wait_video(*, video_id: str) -> dict[str, Any]:
    return _run_json(["pixverse", "task", "wait", video_id, "--json"])


def extend_video(*, video_id: str) -> str:
    data = _run_json(["pixverse", "create", "extend", "--video", video_id, "--no-wait", "--json"])
    new_id = data.get("video_id") or data.get("id") or data.get("task_id")
    if not new_id:
        raise ApiException(status_code=502, code="pixverse_missing_video_id", message="PixVerse extend did not return video_id", details={"data": data})
    return str(new_id)


def download_video(*, video_id: str, dest_dir: str) -> str:
    Path(dest_dir).mkdir(parents=True, exist_ok=True)
    _run_json(["pixverse", "asset", "download", video_id, "--dest", dest_dir, "--json"])

    files = sorted(Path(dest_dir).glob("**/*.mp4"), key=lambda p: p.stat().st_mtime, reverse=True)
    if not files:
        files = sorted(Path(dest_dir).glob("**/*"), key=lambda p: p.stat().st_mtime, reverse=True)
    if not files:
        raise ApiException(status_code=502, code="pixverse_download_missing_file", message="PixVerse download did not produce a file")
    return str(files[0])


def probe_duration_sec(*, file_path: str) -> float | None:
    try:
        proc = subprocess.run(
            [
                "ffprobe",
                "-v",
                "error",
                "-select_streams",
                "v:0",
                "-show_entries",
                "format=duration",
                "-of",
                "default=nw=1:nk=1",
                file_path,
            ],
            capture_output=True,
            text=True,
        )
    except FileNotFoundError:
        return None

    if proc.returncode != 0:
        return None
    raw = (proc.stdout or "").strip()
    try:
        return float(raw)
    except ValueError:
        return None


def render_video_min_duration(
    *,
    prompt: str,
    aspect_ratio: str,
    min_duration_sec: int,
    work_dir: str,
    quality: str = "1080p",
    model: str = "v6",
    max_extends: int = 3,
) -> PixverseDownloadedVideo:
    base_duration = min(15, max(1, min_duration_sec))
    video_id = create_video(prompt=prompt, aspect_ratio=aspect_ratio, quality=quality, model=model, duration_sec=base_duration)
    wait_video(video_id=video_id)
    file_path = download_video(video_id=video_id, dest_dir=os.path.join(work_dir, "downloads"))
    duration = probe_duration_sec(file_path=file_path) or 0.0

    extends = 0
    while duration < float(min_duration_sec) and extends < max_extends:
        video_id = extend_video(video_id=video_id)
        wait_video(video_id=video_id)
        file_path = download_video(video_id=video_id, dest_dir=os.path.join(work_dir, "downloads"))
        duration = probe_duration_sec(file_path=file_path) or duration
        extends += 1

    return PixverseDownloadedVideo(video_id=video_id, file_path=file_path, duration_sec=duration or None)
