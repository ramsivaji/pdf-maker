import os
from fastapi import APIRouter, UploadFile, File, BackgroundTasks, HTTPException
from fastapi.responses import FileResponse
from typing import List

from app.utils.file_manager import (
    save_upload_file,
    delete_files,
    get_output_path,
    validate_file,
)
from app.services.converters import (
    pdf_to_word,
    word_to_pdf,
    merge_pdfs,
    images_to_pdf,
    compress_image,
)

router = APIRouter(prefix="/api/convert", tags=["Conversion"])


@router.post("/pdf-to-word", summary="Convert PDF to Word (.docx)")
async def convert_pdf_to_word(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="A PDF file to convert"),
):
    validate_file(file, "pdf")

    input_path = await save_upload_file(file, ".pdf")
    output_path = get_output_path(".docx")

    try:
        pdf_to_word(input_path, output_path)
    except RuntimeError as e:
        delete_files(input_path)
        raise HTTPException(status_code=500, detail=str(e))

    background_tasks.add_task(delete_files, input_path, output_path)

    original_name = os.path.splitext(file.filename or "document")[0]
    return FileResponse(
        path=str(output_path),
        filename=f"{original_name}.docx",
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )


@router.post("/word-to-pdf", summary="Convert Word (.docx) to PDF")
async def convert_word_to_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="A .docx Word file to convert"),
):
    validate_file(file, "word")

    input_path = await save_upload_file(file, ".docx")
    output_path = get_output_path(".pdf")

    try:
        word_to_pdf(input_path, output_path)
    except RuntimeError as e:
        delete_files(input_path)
        raise HTTPException(status_code=500, detail=str(e))

    background_tasks.add_task(delete_files, input_path, output_path)

    original_name = os.path.splitext(file.filename or "document")[0]
    return FileResponse(
        path=str(output_path),
        filename=f"{original_name}.pdf",
        media_type="application/pdf",
    )


@router.post("/merge-pdfs", summary="Merge multiple PDFs into one")
async def convert_merge_pdfs(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(..., description="Two or more PDF files to merge"),
):
    if len(files) < 2:
        raise HTTPException(status_code=400, detail="Please upload at least 2 PDF files to merge.")

    if len(files) > 20:
        raise HTTPException(status_code=400, detail="You can merge a maximum of 20 PDF files at once.")

    for f in files:
        validate_file(f, "pdf")

    input_paths = []
    for f in files:
        path = await save_upload_file(f, ".pdf")
        input_paths.append(path)

    output_path = get_output_path(".pdf")

    try:
        merge_pdfs(input_paths, output_path)
    except RuntimeError as e:
        delete_files(*input_paths)
        raise HTTPException(status_code=500, detail=str(e))

    background_tasks.add_task(delete_files, *input_paths, output_path)

    return FileResponse(
        path=str(output_path),
        filename="merged_document.pdf",
        media_type="application/pdf",
    )


@router.post("/image-to-pdf", summary="Convert images (JPG/PNG) to PDF")
async def convert_image_to_pdf(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(..., description="One or more image files to convert to PDF"),
):
    if len(files) > 20:
        raise HTTPException(status_code=400, detail="You can convert a maximum of 20 images at once.")

    for f in files:
        validate_file(f, "image")

    # Detect original extension from content type
    type_to_ext = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
        "image/bmp": ".bmp",
        "image/tiff": ".tiff",
    }

    input_paths = []
    for f in files:
        ext = type_to_ext.get(f.content_type, ".jpg")
        path = await save_upload_file(f, ext)
        input_paths.append(path)

    output_path = get_output_path(".pdf")

    try:
        images_to_pdf(input_paths, output_path)
    except RuntimeError as e:
        delete_files(*input_paths)
        raise HTTPException(status_code=500, detail=str(e))

    background_tasks.add_task(delete_files, *input_paths, output_path)

    return FileResponse(
        path=str(output_path),
        filename="converted_images.pdf",
        media_type="application/pdf",
    )


@router.post("/compress-image", summary="Compress an image file")
async def compress_image_endpoint(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="An image file to compress (JPEG, PNG, WEBP)"),
    quality: int = Form(80, ge=1, le=100, description="Compression quality 1-100 (default 80)"),
):
    validate_file(file, "image")

    type_to_ext = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
        "image/bmp": ".bmp",
        "image/tiff": ".tiff",
    }
    ext = type_to_ext.get(file.content_type, ".jpg")
    input_path = await save_upload_file(file, ext)
    output_path = get_output_path(ext)

    try:
        compress_image(input_path, output_path, quality)
    except RuntimeError as e:
        delete_files(input_path)
        raise HTTPException(status_code=500, detail=str(e))

    background_tasks.add_task(delete_files, input_path, output_path)

    original_name = os.path.splitext(file.filename or "image")[0]
    media_map = {
        ".jpg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
        ".bmp": "image/bmp",
        ".tiff": "image/tiff",
    }
    return FileResponse(
        path=str(output_path),
        filename=f"{original_name}_compressed{ext}",
        media_type=media_map.get(ext, "image/jpeg"),
    )
