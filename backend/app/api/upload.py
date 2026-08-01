from datetime import datetime, timezone
from pathlib import Path
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.core.logging_config import logger
from app.services import audit_service

router = APIRouter(tags=["upload"])

ALLOWED_EXTENSIONS = {".xlsx", ".xls"}
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB
UPLOAD_ROOT = Path("storage/uploads")


def _user_dir(user_id: int) -> Path:
    d = UPLOAD_ROOT / str(user_id)
    d.mkdir(parents=True, exist_ok=True)
    return d


@router.post("/api/upload")
async def upload_file(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Validate extension
    ext = Path(file.filename).suffix.lower() if file.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {ext}. Only .xlsx and .xls are allowed.",
        )

    # Read file content
    content = await file.read()

    # Validate size
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large: {len(content)} bytes. Maximum is {MAX_FILE_SIZE} bytes (20 MB).",
        )

    # Generate unique filename in user-scoped directory
    unique_name = f"{uuid.uuid4()}{ext}"
    file_path = _user_dir(user.id) / unique_name

    # Save file
    file_path.write_bytes(content)

    # Audit log + structured logging
    await audit_service.log_event(db, user.id, "upload")
    logger.info("file_uploaded", extra={"event": "upload", "user_id": user.id, "project_id": None})

    return {
        "original_filename": file.filename,
        "saved_filename": unique_name,
        "file_size": len(content),
        "upload_timestamp": datetime.now(timezone.utc).isoformat(),
        "status": "uploaded",
    }