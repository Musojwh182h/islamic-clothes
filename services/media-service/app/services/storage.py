import asyncio
from io import BytesIO
from urllib.parse import quote

from fastapi import Request
from minio import Minio


class ObjectStorage:
    def __init__(
        self,
        endpoint: str,
        access_key: str,
        secret_key: str,
        bucket: str,
        secure: bool,
        public_base_url: str,
    ):
        self.client = Minio(endpoint, access_key=access_key, secret_key=secret_key, secure=secure)
        self.bucket = bucket
        self.public_base_url = public_base_url.rstrip("/")

    async def is_ready(self) -> bool:
        return await asyncio.to_thread(self.client.bucket_exists, self.bucket)

    async def put(self, object_key: str, content: bytes, content_type: str, checksum_sha256: str) -> None:
        await asyncio.to_thread(
            self.client.put_object,
            self.bucket,
            object_key,
            BytesIO(content),
            len(content),
            content_type,
            {"checksum-sha256": checksum_sha256},
        )

    async def delete(self, object_key: str) -> None:
        await asyncio.to_thread(self.client.remove_object, self.bucket, object_key)

    def public_url(self, object_key: str) -> str:
        return f"{self.public_base_url}/{quote(object_key, safe='/')}"


def get_storage(request: Request) -> ObjectStorage:
    return request.app.state.storage
