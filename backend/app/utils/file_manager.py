import os
import uuid
import shutil
from pathlib import Path
from fastapi import UploadFile, HTTPException

# Base directory for all temporary file storage
TEMP_STORAGE_DIR = Path(__file__).parent.parent.parent / "temp_storage"
TEMP_STORAGE_DIR.mkdir(exist_ok=True)

# Max file size: 50 MB
MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024

ALLOWED_TYPES = {
    "pdf": ["application/pdf"],
    "word": [
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
    ],
    "image": ["image/jpeg", "image/png", "image/webp", "image/bmp", "image/tiff"],
}


def validate_file(file: UploadFile, expected_type: str) -> None:
    """Validates the file content type and size."""
    allowed = ALLOWED_TYPES.get(expected_type, [])
    if file.content_type not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type '{file.content_type}'. Expected one of: {allowed}",
        )


async def save_upload_file(file: UploadFile, suffix: str) -> Path:
    """
    Reads an uploaded file, checks its size, and saves it to temp_storage.
    Returns the path where the file was saved.
    """
    unique_name = f"{uuid.uuid4()}{suffix}"
    dest_path = TEMP_STORAGE_DIR / unique_name

    file_size = 0
    with open(dest_path, "wb") as buffer:
        while True:
            chunk = await file.read(1024 * 1024)  # Read 1MB at a time
            if not chunk:
                break
            file_size += len(chunk)
            if file_size > MAX_FILE_SIZE_BYTES:
                buffer.close()
                os.remove(dest_path)
                raise HTTPException(
                    status_code=400,
                    detail=f"File is too large. Maximum allowed size is {MAX_FILE_SIZE_BYTES // (1024*1024)} MB.",
                )
            buffer.write(chunk)

    return dest_path


def delete_files(*file_paths: Path) -> None:
    """Deletes one or more files from the filesystem. Used as a background task."""
    for path in file_paths:
        try:
            if path and Path(path).exists():
                os.remove(path)
        except Exception as e:
            # Log but don't crash if cleanup fails
            print(f"Warning: Could not delete temp file {path}: {e}")


def get_output_path(suffix: str) -> Path:
    """Generates a unique path for an output file in temp_storage."""
    unique_name = f"{uuid.uuid4()}_output{suffix}"
    return TEMP_STORAGE_DIR / unique_name
