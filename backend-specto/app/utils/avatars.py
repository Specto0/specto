from __future__ import annotations

from pathlib import Path
from typing import Optional
from uuid import uuid4
import mimetypes  # <- substitui imghdr

from fastapi import HTTPException, UploadFile, status
from starlette.requests import Request

STATIC_ROOT = Path(__file__).resolve().parents[1] / "static"
AVATAR_DIR = STATIC_ROOT / "avatars"
AVATAR_DIR.mkdir(parents=True, exist_ok=True)


MAX_AVATAR_SIZE = 3 * 1024 * 1024  # 3MB
ALLOWED_MIME_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}
ALLOWED_EXTENSIONS = {
    ".jpg": ".jpg",
    ".jpeg": ".jpg",
    ".png": ".png",
    ".webp": ".webp",
}


def _ensure_extension(file: UploadFile, first_chunk: bytes) -> str:
    """Infer a safe extension for the uploaded file."""
    # 1) Tentar pelo content-type enviado pelo cliente
    if file.content_type in ALLOWED_MIME_TYPES:
        return ALLOWED_MIME_TYPES[file.content_type]

    # 2) Tentar pela extensão do nome do ficheiro
    if file.filename:
        ext = Path(file.filename).suffix.lower()
        if ext in ALLOWED_EXTENSIONS:
            return ALLOWED_EXTENSIONS[ext]

        # 3) Tentar pelo mimetype deduzido a partir do nome
        mime_type, _ = mimetypes.guess_type(file.filename)
        if mime_type in ALLOWED_MIME_TYPES:
            return ALLOWED_MIME_TYPES[mime_type]

    # Se nada resultar, rejeitar
    raise HTTPException(
        status.HTTP_400_BAD_REQUEST,
        "Formato de imagem não suportado. Usa JPG, PNG ou WEBP.",
    )


async def save_avatar_file(file: UploadFile, user_id: int) -> str:
    """Persist uploaded avatar image and return relative storage path."""
    first_chunk = await file.read(1024)
    if not first_chunk:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Imagem inválida.")

    extension = _ensure_extension(file, first_chunk)
    filename = f"user_{user_id}_{uuid4().hex}{extension}"
    destination = AVATAR_DIR / filename

    size = len(first_chunk)
    with destination.open("wb") as buffer:
        buffer.write(first_chunk)
        while True:
            chunk = await file.read(1024 * 1024)
            if not chunk:
                break
            size += len(chunk)
            if size > MAX_AVATAR_SIZE:
                destination.unlink(missing_ok=True)
                raise HTTPException(
                    status.HTTP_400_BAD_REQUEST,
                    "Imagem excede o limite de 3MB.",
                )
            buffer.write(chunk)

    await file.close()
    return f"avatars/{filename}"


def delete_avatar_file(stored_path: Optional[str]) -> None:
    """Remove avatar file from disk if it exists."""
    if not stored_path:
        return

    relative = Path(stored_path.lstrip("/"))
    if relative.parts and relative.parts[0] == "static":
        relative = Path(*relative.parts[1:])

    target = AVATAR_DIR / relative.name
    try:
        if target.exists() and target.is_file():
            target.unlink()
    except OSError:
        pass


def build_avatar_url(
    stored_path: Optional[str],
    request: Optional[Request],
) -> Optional[str]:
    if not stored_path:
        return None

    if stored_path.startswith(("http://", "https://", "data:", "blob:")):
        return stored_path

    relative = stored_path.lstrip("/")
    if relative.startswith("static/"):
        relative = relative[len("static/") :]

    if request is None:
        return f"/static/{relative}"

    return str(request.url_for("static", path=relative))
