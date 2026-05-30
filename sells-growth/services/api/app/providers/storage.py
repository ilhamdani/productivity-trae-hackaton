from __future__ import annotations

from datetime import timedelta

from minio import Minio
from minio.commonconfig import CopySource

from ..settings import Settings, get_settings


def get_storage_client(settings: Settings | None = None) -> Minio:
    s = settings or get_settings()
    secure = s.s3_endpoint.startswith("https://")
    endpoint = s.s3_endpoint.replace("https://", "").replace("http://", "")
    return Minio(endpoint, access_key=s.s3_access_key, secret_key=s.s3_secret_key, secure=secure)


def presign_put_object(*, object_name: str, content_type: str, settings: Settings | None = None) -> str:
    s = settings or get_settings()
    client = get_storage_client(s)
    return client.presigned_put_object(
        s.s3_bucket,
        object_name,
        expires=timedelta(minutes=15),
        content_type=content_type,
    )


def presign_get_object(*, object_name: str, settings: Settings | None = None) -> str:
    s = settings or get_settings()
    client = get_storage_client(s)
    return client.presigned_get_object(s.s3_bucket, object_name, expires=timedelta(minutes=60))


def copy_object(*, source_object_name: str, dest_object_name: str, settings: Settings | None = None) -> None:
    s = settings or get_settings()
    client = get_storage_client(s)
    client.copy_object(s.s3_bucket, dest_object_name, CopySource(s.s3_bucket, source_object_name))


def upload_file(*, object_name: str, file_path: str, content_type: str, settings: Settings | None = None) -> None:
    s = settings or get_settings()
    client = get_storage_client(s)
    client.fput_object(s.s3_bucket, object_name, file_path, content_type=content_type)
