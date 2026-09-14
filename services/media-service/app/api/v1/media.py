import asyncio
import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from minio.error import S3Error

from app.core.config import get_settings
from app.schemas.media import MediaObjectResponse
from app.services.auth import AdminAuthorizer, get_authorizer
from app.services.images import ImageProcessor, InvalidImage
from app.services.storage import ObjectStorage, get_storage

router = APIRouter(prefix="/media", tags=["media"])
bearer = HTTPBearer(auto_error=False)
settings = get_settings()
processor = ImageProcessor(
    max_upload_bytes=settings.max_upload_bytes,
    max_image_pixels=settings.max_image_pixels,
    max_output_dimension=settings.max_output_dimension,
)


async def require_admin(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    authorizer: AdminAuthorizer = Depends(get_authorizer),
):
    return await authorizer.authorize(credentials)


@router.post("/images", response_model=MediaObjectResponse, status_code=status.HTTP_201_CREATED)
async def upload_image(
    file: UploadFile = File(...),
    _: object = Depends(require_admin),
    storage: ObjectStorage = Depends(get_storage),
) -> MediaObjectResponse:
    content = await file.read(settings.max_upload_bytes + 1)
    await file.close()
    try:
        image = await asyncio.to_thread(processor.process, content)
    except InvalidImage as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    now = datetime.now(UTC)
    object_key = f"products/{now:%Y/%m}/{uuid.uuid4()}.webp"
    try:
        await storage.put(object_key, image.content, image.content_type, image.checksum_sha256)
    except S3Error as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Хранилище изображений временно недоступно",
        ) from exc
    return MediaObjectResponse(
        object_key=object_key,
        url=storage.public_url(object_key),
        content_type=image.content_type,
        size_bytes=len(image.content),
        width=image.width,
        height=image.height,
        checksum_sha256=image.checksum_sha256,
    )


@router.delete("/images/{object_key:path}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_image(
    object_key: str,
    _: object = Depends(require_admin),
    storage: ObjectStorage = Depends(get_storage),
) -> Response:
    if not object_key.startswith("products/") or ".." in object_key.split("/"):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Недопустимый ключ объекта")
    try:
        await storage.delete(object_key)
    except S3Error as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Хранилище изображений временно недоступно",
        ) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)
