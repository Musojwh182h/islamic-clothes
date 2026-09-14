from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from minio.error import S3Error

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.services.auth import AdminAuthorizer
from app.services.storage import ObjectStorage

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    storage = ObjectStorage(
        endpoint=settings.minio_endpoint,
        access_key=settings.minio_access_key,
        secret_key=settings.minio_secret_key,
        bucket=settings.minio_bucket,
        secure=settings.minio_secure,
        public_base_url=settings.media_public_base_url,
    )
    auth_client = httpx.AsyncClient(timeout=httpx.Timeout(5.0, connect=2.0))
    app.state.storage = storage
    app.state.authorizer = AdminAuthorizer(auth_client, settings.auth_me_url)
    yield
    await auth_client.aclose()


app = FastAPI(title=settings.app_name, version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)
app.include_router(api_router, prefix=settings.api_v1_prefix)


@app.middleware("http")
async def reject_oversized_requests(request: Request, call_next):
    content_length = request.headers.get("content-length")
    if content_length and content_length.isdigit() and int(content_length) > settings.max_upload_bytes + 64 * 1024:
        return JSONResponse(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            content={"detail": "Запрос превышает допустимый размер"},
        )
    return await call_next(request)


@app.get("/health", tags=["health"])
async def healthcheck(request: Request) -> JSONResponse:
    try:
        ready = await request.app.state.storage.is_ready()
    except (S3Error, OSError):
        ready = False
    if not ready:
        return JSONResponse(status_code=503, content={"status": "unavailable", "object_storage": "down"})
    return JSONResponse(content={"status": "ok", "object_storage": "ok"})
