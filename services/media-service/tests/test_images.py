from io import BytesIO

import pytest
from PIL import Image

from app.services.images import ImageProcessor, InvalidImage


@pytest.fixture
def processor() -> ImageProcessor:
    return ImageProcessor(max_upload_bytes=1024 * 1024, max_image_pixels=4_000_000, max_output_dimension=800)


def make_image(image_format: str = "PNG", size: tuple[int, int] = (1200, 600)) -> bytes:
    output = BytesIO()
    Image.new("RGB", size, "#b7a27d").save(output, format=image_format)
    return output.getvalue()


def test_normalizes_image_to_bounded_webp(processor: ImageProcessor) -> None:
    result = processor.process(make_image())

    assert result.content_type == "image/webp"
    assert result.width == 800
    assert result.height == 400
    assert len(result.checksum_sha256) == 64
    with Image.open(BytesIO(result.content)) as normalized:
        assert normalized.format == "WEBP"


def test_rejects_non_image(processor: ImageProcessor) -> None:
    with pytest.raises(InvalidImage, match="корректным изображением"):
        processor.process(b"not-an-image")


def test_rejects_oversized_upload(processor: ImageProcessor) -> None:
    with pytest.raises(InvalidImage, match="превышает"):
        processor.process(b"x" * (1024 * 1024 + 1))


def test_rejects_excessive_pixel_count(processor: ImageProcessor) -> None:
    with pytest.raises(InvalidImage, match="разрешение"):
        processor.process(make_image(size=(2500, 2000)))
