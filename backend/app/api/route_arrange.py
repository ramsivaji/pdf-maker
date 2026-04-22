import json
import os
from fastapi import APIRouter, UploadFile, File, Form, BackgroundTasks, HTTPException
from fastapi.responses import FileResponse

from app.utils.file_manager import save_upload_file, delete_files, get_output_path, validate_file
from app.services.converters import arrange_pdf_pages

router = APIRouter(prefix="/api/arrange", tags=["PDF Arrangement"])


@router.post("/apply", summary="Reorder pages in a PDF")
async def apply_pdf_arrangement(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="The original PDF file"),
    page_order: str = Form(..., description="JSON array of 0-indexed page numbers in desired order"),
):
    """
    Accepts a PDF and a JSON page order array (e.g. [2, 0, 1]) and returns
    a new PDF with pages in the specified order.
    Page thumbnails are generated client-side via PDF.js — no server thumbnail endpoint needed.
    """
    validate_file(file, "pdf")

    try:
        order = json.loads(page_order)
        if not isinstance(order, list) or not all(isinstance(i, int) for i in order):
            raise ValueError
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="page_order must be a JSON array of integers.")

    if len(order) == 0:
        raise HTTPException(status_code=400, detail="page_order cannot be empty.")

    input_path = await save_upload_file(file, ".pdf")
    output_path = get_output_path(".pdf")

    try:
        arrange_pdf_pages(input_path, output_path, order)
    except RuntimeError as e:
        delete_files(input_path)
        raise HTTPException(status_code=500, detail=str(e))

    background_tasks.add_task(delete_files, input_path, output_path)

    original_name = os.path.splitext(file.filename or "document")[0]
    return FileResponse(
        path=str(output_path),
        filename=f"{original_name}_arranged.pdf",
        media_type="application/pdf",
    )
