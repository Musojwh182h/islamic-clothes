import hashlib
import warnings
from dataclasses import dataclass
from io import BytesIO

from PIL import Image, ImageOps, UnidentifiedImageError


class InvalidImage(ValueError):
    pass


@dataclass(frozen=True)
class ProcessedImage:
    content: bytes
    width: int
    height: int
    checksum_sha256: str
    content_type: str = "image/webp"


class ImageProcessor:
    allowed_formats = {"JPEG", "PNG", "WEBP"}

    def __init__(self, max_upload_bytes: int, max_image_pixels: int, max_output_dimension: int):
        self.max_upload_bytes = max_upload_bytes
        self.max_image_pixels = max_image_pixels
        self.max_output_dimension = max_output_dimension

    def process(self, content: bytes) -> ProcessedImage:
        if not content:
            raise InvalidImage("Файл изображения пуст")
        if len(content) > self.max_upload_bytes:
            raise InvalidImage(f"Размер изображения превышает {self.max_upload_bytes // (1024 * 1024)} МБ")

        try:
            with warnings.catch_warnings():
                warnings.simplefilter("error", Image.DecompressionBombWarning)
                with Image.open(BytesIO(content)) as probe:
                    detected_format = probe.format
                    width, height = probe.size
                    probe.verify()
        except (UnidentifiedImageError, OSError, SyntaxError, Image.DecompressionBombError, Image.DecompressionBombWarning) as exc:
            raise InvalidImage("Файл не является корректным изображением") from exc

        if detected_format not in self.allowed_formats:
            raise InvalidImage("Разрешены только JPEG, PNG и WebP")
        if width <= 0 or height <= 0 or width * height > self.max_image_pixels:
            raise InvalidImage("Недопустимое разрешение изображения")

        try:
            with Image.open(BytesIO(content)) as source:
                image = ImageOps.exif_transpose(source)
                if image.mode in {"RGBA", "LA"} or "transparency" in image.info:
                    rgba = image.convert("RGBA")
                    background = Image.new("RGB", rgba.size, "white")
                    background.paste(rgba, mask=rgba.getchannel("A"))
                    image = background
                else:
                    image = image.convert("RGB")
                image.thumbnail((self.max_output_dimension, self.max_output_dimension), Image.Resampling.LANCZOS)
                output = BytesIO()
                image.save(output, format="WEBP", quality=88, method=6, optimize=True)
                normalized = output.getvalue()
                output_width, output_height = image.size
        except (OSError, ValueError) as exc:
            raise InvalidImage("Не удалось обработать изображение") from exc

        return ProcessedImage(
            content=normalized,
            width=output_width,
            height=output_height,
            checksum_sha256=hashlib.sha256(normalized).hexdigest(),
        )
