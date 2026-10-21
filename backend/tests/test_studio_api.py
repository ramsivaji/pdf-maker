import io
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pymupdf
from PIL import Image
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def pdf(text="sample", pages=1):
    doc = pymupdf.open()
    for index in range(pages):
        page = doc.new_page()
        page.insert_text((72, 72), f"{text} {index + 1}")
    data = doc.tobytes()
    doc.close()
    return data


def upload(name, data, content="application/pdf"):
    return (name, data, content)


def test_health_and_tools():
    assert client.get("/api/health").json()["status"] == "ok"
    assert "split" in client.get("/api/tools").json()["tools"]


def test_merge_split_extract_metadata_and_history():
    merged = client.post("/api/pdf/merge", files=[("files", upload("a.pdf", pdf("alpha"))), ("files", upload("b.pdf", pdf("beta")))])
    assert merged.status_code == 200
    result = merged.json()
    downloaded = client.get(result["download_url"])
    assert downloaded.status_code == 200
    assert len(pymupdf.open(stream=downloaded.content, filetype="pdf")) == 2

    split_result = client.post("/api/pdf/split", data={"pages": "2"}, files={"file": upload("merged.pdf", downloaded.content)})
    assert split_result.status_code == 200
    assert len(pymupdf.open(stream=client.get(split_result.json()["download_url"]).content, filetype="pdf")) == 1

    extracted = client.post("/api/pdf/extract-text", files={"file": upload("a.pdf", pdf("alpha"))})
    assert "alpha" in client.get(extracted.json()["download_url"]).text
    metadata = client.post("/api/pdf/metadata", files={"file": upload("a.pdf", pdf("alpha", 2))})
    assert metadata.json()["page_count"] == 2
    assert client.get("/api/jobs").json()["jobs"]


def test_rejects_bad_file_type_content_and_page_range():
    assert client.post("/api/pdf/extract-text", files={"file": upload("not.pdf", b"nope")}).status_code == 400
    assert client.post("/api/pdf/extract-text", files={"file": upload("not.txt", b"%PDF-x")}).status_code == 415
    result = client.post("/api/pdf/split", data={"pages": "3"}, files={"file": upload("one.pdf", pdf())})
    assert result.status_code == 422


def test_compression_reports_actual_sizes_and_download_path_is_safe():
    result = client.post("/api/pdf/compress", data={"level": 2}, files={"file": upload("file.pdf", pdf())})
    assert result.status_code == 200
    body = result.json()
    assert body["output_size"] > 0 and body["input_size"] > 0
    assert "reduction_percent" in body
    assert client.get("/api/download/../../requirements.txt").status_code == 404
    assert client.get("/api/download/00000000000000000000000000000000").status_code == 404


def test_docx_to_pdf_fails_clearly_without_libreoffice(monkeypatch):
    monkeypatch.setattr("app.api.route_studio._find_libreoffice", lambda: None)
    response = client.post("/api/docx/to-pdf", files={"file": upload("doc.docx", b"PK\x03\x04dummy", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")})
    assert response.status_code == 503
    assert "LibreOffice" in response.json()["detail"]


def test_to_docx_creates_docx():
    response = client.post("/api/pdf/to-docx", files={"file": upload("doc.pdf", pdf("hello"))})
    assert response.status_code == 200
    content = client.get(response.json()["download_url"]).content
    assert content.startswith(b"PK")


def test_metadata_lookup_images_to_pdf_and_image_render():
    source = pdf("metadata", 2)
    result = client.post("/api/pdf/merge", files=[("files", upload("a.pdf", source)), ("files", upload("b.pdf", source))]).json()
    metadata = client.get(f"/api/pdf/metadata?file_id={result['file_id']}")
    assert metadata.status_code == 200 and metadata.json()["page_count"] == 4

    image = Image.new("RGB", (10, 10), "white")
    buffer = io.BytesIO(); image.save(buffer, format="PNG")
    converted = client.post("/api/images/to-pdf", files=[("files", upload("one.png", buffer.getvalue(), "image/png"))])
    assert converted.status_code == 200
    converted_pdf = client.get(converted.json()["download_url"])
    assert converted_pdf.content.startswith(b"%PDF")

    pages = client.post("/api/pdf/to-images", data={"pages": "1", "dpi": 72}, files={"file": upload("source.pdf", source)})
    assert pages.status_code == 200 and client.get(pages.json()["download_url"]).content.startswith(b"PK")


def test_upload_limit_mime_and_expired_download(monkeypatch, tmp_path):
    import app.api.route_studio as studio
    monkeypatch.setattr(studio, "MAX_BYTES", 8)
    response = client.post("/api/pdf/extract-text", files={"file": upload("large.pdf", b"%PDF-" + b"x" * 20)})
    assert response.status_code == 413
    monkeypatch.setattr(studio, "MAX_BYTES", 50 * 1024 * 1024)
    wrong_mime = client.post("/api/pdf/extract-text", files={"file": upload("a.pdf", pdf(), "text/plain")})
    assert wrong_mime.status_code == 415
    assert client.get("/api/download/ffffffffffffffffffffffffffffffff").status_code == 404

    monkeypatch.setattr(studio, "STORE", tmp_path)
    old_file = tmp_path / "old.txt"; old_file.write_text("temporary")
    monkeypatch.setattr(studio, "RETENTION", -1)
    studio._cleanup()
    assert not old_file.exists()
