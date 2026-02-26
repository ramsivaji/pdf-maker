"""
Core conversion logic. Each function takes file paths as input and writes
the converted output to the given output path. They raise exceptions on failure.
"""

import subprocess
import shutil
from pathlib import Path


def pdf_to_word(pdf_path: Path, output_path: Path) -> None:
    """
    Converts a PDF file to a .docx Word document using pdf2docx.
    Best effort — preserves layout, tables, and images.
    """
    try:
        from pdf2docx import Converter
        cv = Converter(str(pdf_path))
        cv.convert(str(output_path), start=0, end=None)
        cv.close()
    except Exception as e:
        raise RuntimeError(f"PDF to Word conversion failed: {e}")


def word_to_pdf(word_path: Path, output_path: Path) -> None:
    """
    Converts a .docx Word document to PDF using LibreOffice in headless mode.
    LibreOffice must be installed. Falls back to a clear error message if not available.
    """
    # Common LibreOffice install paths on Windows
    possible_paths = [
        r"C:\Program Files\LibreOffice\program\soffice.exe",
        r"C:\Program Files (x86)\LibreOffice\program\soffice.exe",
        "soffice",  # If it's in the system PATH (Linux/Docker)
        "libreoffice",  # Alternative command (Linux/Docker)
    ]

    soffice_cmd = None
    for path in possible_paths:
        if shutil.which(path) or Path(path).exists():
            soffice_cmd = path
            break

    if not soffice_cmd:
        raise RuntimeError(
            "LibreOffice is not installed or not found. "
            "Please install LibreOffice from https://www.libreoffice.org/download/download/ "
            "to enable Word-to-PDF conversion."
        )

    try:
        result = subprocess.run(
            [
                soffice_cmd,
                "--headless",
                "--convert-to", "pdf",
                "--outdir", str(output_path.parent),
                str(word_path),
            ],
            capture_output=True,
            text=True,
            timeout=120,  # 2-minute timeout
        )
        if result.returncode != 0:
            raise RuntimeError(f"LibreOffice exited with error: {result.stderr}")

        # LibreOffice saves the PDF with the same stem as the input file
        # We need to rename it to match our expected output_path
        generated_pdf = output_path.parent / (word_path.stem + ".pdf")
        if generated_pdf.exists() and generated_pdf != output_path:
            generated_pdf.rename(output_path)

    except subprocess.TimeoutExpired:
        raise RuntimeError("Word to PDF conversion timed out after 2 minutes.")
    except Exception as e:
        raise RuntimeError(f"Word to PDF conversion failed: {e}")


def merge_pdfs(pdf_paths: list[Path], output_path: Path) -> None:
    """
    Merges a list of PDF files into a single PDF.
    Standardizes all pages to A4 size (595x842) by shrinking/centering them.
    """
    try:
        import fitz  # PyMuPDF
        
        # A4 paper size in points: 595.0 x 842.0
        a4_width, a4_height = 595.0, 842.0
        merged_doc = fitz.open()

        for path in pdf_paths:
            src_doc = fitz.open(str(path))
            for page in src_doc:
                # Create a new blank A4 page
                new_page = merged_doc.new_page(width=a4_width, height=a4_height)
                # Draw the original page onto the new A4 page (preserves aspect ratio)
                new_page.show_pdf_page(new_page.rect, src_doc, page.number, keep_proportion=True)
            src_doc.close()

        merged_doc.save(str(output_path))
        merged_doc.close()

    except ImportError:
        # Fallback to PyPDF2 if fitz is somehow unavailable
        try:
            from PyPDF2 import PdfMerger
            merger = PdfMerger()
            for path in pdf_paths:
                merger.append(str(path))
            merger.write(str(output_path))
            merger.close()
        except Exception as e:
            raise RuntimeError(f"PDF merging failed in fallback: {e}")
    except Exception as e:
        raise RuntimeError(f"PDF merging failed: {e}")


def images_to_pdf(image_paths: list[Path], output_path: Path) -> None:
    """
    Converts one or more images (JPG, PNG, etc.) into a single PDF.
    Standardizes all pages to A4 size without stretching the images.
    """
    try:
        import img2pdf
        from PIL import Image
        import io

        processed_images = []
        for img_path in image_paths:
            with Image.open(img_path) as img:
                if img.mode not in ("RGB", "L"):
                    img = img.convert("RGB")
                buf = io.BytesIO()
                img.save(buf, format="JPEG", quality=95)
                processed_images.append(buf.getvalue())

        # Define A4 layout for img2pdf
        a4inpt = (img2pdf.mm_to_pt(210), img2pdf.mm_to_pt(297))
        layout_fun = img2pdf.get_layout_fun(
            pagesize=a4inpt,
            fit=img2pdf.FitMode.into
        )

        with open(output_path, "wb") as f:
            f.write(img2pdf.convert(processed_images, layout_fun=layout_fun))

    except Exception as e:
        raise RuntimeError(f"Image to PDF conversion failed: {e}")
