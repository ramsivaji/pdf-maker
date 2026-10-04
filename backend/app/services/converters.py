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


def _word_to_pdf_pure_python(word_path: Path, output_path: Path) -> None:
    """
    Converts a .docx Word document to PDF using pure Python (mammoth + xhtml2pdf).
    Requires zero external binary dependencies (no LibreOffice, no MS Word).
    Works seamlessly on Vercel, AWS Lambda, Docker, Linux, macOS, and Windows.
    """
    import mammoth
    from xhtml2pdf import pisa

    with open(word_path, "rb") as docx_file:
        result = mammoth.convert_to_html(docx_file)
        html_body = result.value

    styled_html = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
    @page {{
        size: a4 portrait;
        margin: 20mm;
    }}
    body {{
        font-family: Helvetica, Arial, sans-serif;
        font-size: 11pt;
        line-height: 1.6;
        color: #1f2937;
    }}
    h1 {{ font-size: 22pt; margin-top: 0; margin-bottom: 12px; color: #111827; font-weight: bold; }}
    h2 {{ font-size: 17pt; margin-top: 18px; margin-bottom: 8px; color: #1f2937; font-weight: bold; }}
    h3 {{ font-size: 13pt; margin-top: 14px; margin-bottom: 6px; color: #374151; font-weight: bold; }}
    p {{ margin-top: 0; margin-bottom: 10px; }}
    table {{
        width: 100%;
        margin: 14px 0;
    }}
    th, td {{
        border: 1px solid #d1d5db;
        padding: 8px 12px;
        text-align: left;
        vertical-align: top;
    }}
    th {{
        background-color: #f3f4f6;
        font-weight: bold;
        color: #111827;
    }}
    img {{
        max-width: 100%;
        height: auto;
    }}
    ul, ol {{
        margin-top: 0;
        margin-bottom: 10px;
        padding-left: 24px;
    }}
    li {{
        margin-bottom: 4px;
    }}
    blockquote {{
        border-left: 4px solid #3b82f6;
        padding-left: 12px;
        margin: 12px 0;
        color: #4b5563;
        font-style: italic;
    }}
    pre, code {{
        font-family: monospace;
        background-color: #f3f4f6;
        padding: 2px 4px;
        font-size: 10pt;
    }}
</style>
</head>
<body>
{html_body}
</body>
</html>"""

    with open(output_path, "wb") as pdf_file:
        pisa_status = pisa.CreatePDF(styled_html, dest=pdf_file)
        if pisa_status.err:
            raise RuntimeError(f"xhtml2pdf rendering error: {pisa_status.err}")

    if not output_path.exists() or output_path.stat().st_size == 0:
        raise RuntimeError("Output PDF was not generated or is empty.")


def word_to_pdf(word_path: Path, output_path: Path) -> None:
    """
    Converts a .docx Word document to PDF.
    Conversion hierarchy:
    1. LibreOffice (if installed on server/desktop)
    2. Microsoft Word via docx2pdf (if running locally on Windows/macOS)
    3. Pure Python engine via mammoth + xhtml2pdf (works everywhere including Vercel)
    """
    errors = []

    # 1. Check for LibreOffice install paths
    possible_libreoffice_paths = [
        r"C:\Program Files\LibreOffice\program\soffice.exe",
        r"C:\Program Files (x86)\LibreOffice\program\soffice.exe",
        "soffice",  # If it's in the system PATH (Linux/Docker/Windows)
        "libreoffice",  # Alternative command (Linux/Docker)
    ]

    soffice_cmd = None
    for path in possible_libreoffice_paths:
        if shutil.which(path) or Path(path).exists():
            soffice_cmd = path
            break

    if soffice_cmd:
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
                timeout=120,
            )
            if result.returncode == 0:
                generated_pdf = output_path.parent / (word_path.stem + ".pdf")
                if generated_pdf.exists():
                    if generated_pdf != output_path:
                        if output_path.exists():
                            output_path.unlink()
                        generated_pdf.rename(output_path)
                    return
            else:
                errors.append(f"LibreOffice error: {result.stderr.strip() or result.stdout.strip()}")
        except Exception as e:
            errors.append(f"LibreOffice failed: {e}")

    # 2. Try docx2pdf (uses native Microsoft Word on Windows / macOS)
    try:
        import sys
        if sys.platform == "win32":
            try:
                import pythoncom
                pythoncom.CoInitialize()
            except Exception:
                pass

        from docx2pdf import convert
        convert(str(word_path), str(output_path))
        if output_path.exists() and output_path.stat().st_size > 0:
            return
        else:
            errors.append("docx2pdf produced empty or missing file.")
    except Exception as e:
        errors.append(f"docx2pdf / MS Word failed: {e}")
    finally:
        if sys.platform == "win32":
            try:
                import pythoncom
                pythoncom.CoUninitialize()
            except Exception:
                pass

    # 3. Pure Python fallback (mammoth + xhtml2pdf) — works 100% on Vercel Serverless
    try:
        _word_to_pdf_pure_python(word_path, output_path)
        if output_path.exists() and output_path.stat().st_size > 0:
            return
    except Exception as e:
        errors.append(f"Pure Python conversion failed: {e}")

    error_summary = "; ".join(errors) if errors else "No converter available."
    raise RuntimeError(f"Word to PDF conversion failed: {error_summary}")


def merge_pdfs(pdf_paths: list[Path], output_path: Path) -> None:
    """
    Merges a list of PDF files into a single PDF using PyPDF2 (pure Python, no native deps).
    """
    try:
        from PyPDF2 import PdfMerger
        merger = PdfMerger()
        for path in pdf_paths:
            merger.append(str(path))
        with open(str(output_path), "wb") as f:
            merger.write(f)
        merger.close()
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


def compress_image(image_path: Path, output_path: Path, quality: int = 80) -> None:
    """
    Compresses an image using Pillow. Each format only receives kwargs it supports.
    - JPEG: quality + optimize
    - WEBP: quality + method
    - PNG:  compress_level + optimize
    - BMP/TIFF: no extra kwargs (these formats have minimal compression support)
    """
    try:
        from PIL import Image

        quality = max(1, min(100, quality))
        with Image.open(image_path) as img:
            fmt = (img.format or "JPEG").upper()

            # JPEG cannot store transparency — convert incompatible modes
            if fmt == "JPEG" and img.mode in ("RGBA", "P", "LA", "CMYK"):
                img = img.convert("RGB")
            # Ensure PNG with palette is converted for lossless output
            elif fmt == "PNG" and img.mode == "P":
                img = img.convert("RGBA")

            if fmt == "JPEG":
                save_kwargs = {"quality": quality, "optimize": True}
            elif fmt == "WEBP":
                save_kwargs = {"quality": quality, "method": 4}
            elif fmt == "PNG":
                compress_level = max(0, min(9, int((100 - quality) / 11)))
                save_kwargs = {"optimize": True, "compress_level": compress_level}
            else:
                # BMP, TIFF and others — save as-is, no compression kwargs
                save_kwargs = {}

            img.save(output_path, format=fmt, **save_kwargs)
    except Exception as e:
        raise RuntimeError(f"Image compression failed: {e}")


def resize_image(
    image_path: Path,
    output_path: Path,
    width: int | None = None,
    height: int | None = None,
    percent: int | None = None,
) -> tuple[int, int]:
    """
    Resizes an image.
    - If percent is given: scale both dimensions by that percentage.
    - If only width is given: scale height to maintain aspect ratio.
    - If only height is given: scale width to maintain aspect ratio.
    - If both width and height are given: resize to exact dimensions (may stretch).
    Returns the final (width, height).
    """
    try:
        from PIL import Image

        with Image.open(image_path) as img:
            fmt = (img.format or "JPEG").upper()
            orig_w, orig_h = img.size

            if percent is not None:
                scale = max(1, min(1000, percent)) / 100.0
                new_w = max(1, int(orig_w * scale))
                new_h = max(1, int(orig_h * scale))
            elif width and height:
                new_w, new_h = int(width), int(height)
            elif width:
                new_w = int(width)
                new_h = max(1, int(orig_h * new_w / orig_w))
            elif height:
                new_h = int(height)
                new_w = max(1, int(orig_w * new_h / orig_h))
            else:
                raise RuntimeError("Provide at least one of: width, height, or percent.")

            resized = img.resize((new_w, new_h), Image.LANCZOS)

            # Handle mode conversions before save
            if fmt == "JPEG" and resized.mode in ("RGBA", "P", "LA"):
                resized = resized.convert("RGB")

            if fmt == "JPEG":
                resized.save(output_path, format=fmt, quality=92, optimize=True)
            elif fmt == "WEBP":
                resized.save(output_path, format=fmt, quality=92, method=4)
            elif fmt == "PNG":
                resized.save(output_path, format=fmt, optimize=True)
            else:
                resized.save(output_path, format=fmt)

            return new_w, new_h
    except RuntimeError:
        raise
    except Exception as e:
        raise RuntimeError(f"Image resize failed: {e}")


def arrange_pdf_pages(pdf_path: Path, output_path: Path, page_order: list) -> None:
    """
    Creates a new PDF with pages reordered according to page_order (0-indexed list).
    Uses PyPDF2 — pure Python, no native library dependencies.
    """
    try:
        from PyPDF2 import PdfReader, PdfWriter

        reader = PdfReader(str(pdf_path))
        total  = len(reader.pages)

        for idx in page_order:
            if not (0 <= idx < total):
                raise RuntimeError(f"Page index {idx} is out of range (PDF has {total} pages).")

        writer = PdfWriter()
        for idx in page_order:
            writer.add_page(reader.pages[idx])

        with open(str(output_path), "wb") as f:
            writer.write(f)
    except RuntimeError:
        raise
    except Exception as e:
        raise RuntimeError(f"PDF page arrangement failed: {e}")
