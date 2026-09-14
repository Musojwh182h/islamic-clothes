from pydantic import BaseModel, Field


class MediaObjectResponse(BaseModel):
    object_key: str
    url: str
    content_type: str
    size_bytes: int = Field(gt=0)
    width: int = Field(gt=0)
    height: int = Field(gt=0)
    checksum_sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
