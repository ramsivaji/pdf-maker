import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.route_convert import router as convert_router
from app.api.route_arrange import router as arrange_router
from app.api.route_studio import router as studio_router

app = FastAPI(
    title="PDF Studio — Advanced PDF Processing API",
    description=(
        "A powerful API for converting files between formats. "
        "Supports PDF to Word, Word to PDF, merging PDFs, and converting Images to PDF."
    ),
    version="2.0.0",
    debug=os.getenv("DEBUG", "false").strip().lower() == "true",
    docs_url="/docs",
    redoc_url="/redoc",
)

origins = [origin.strip() for origin in os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:8000,http://127.0.0.1:8000").split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(convert_router)
app.include_router(arrange_router)
app.include_router(studio_router)

# Serve the raw HTML/CSS/JS frontend on the root URL locally.
# On Vercel, the environment variable 'VERCEL' is set, and Vercel natively serves the static files.
if not os.getenv("VERCEL"):
    frontend_path = os.path.join(os.path.dirname(__file__), "..", "..", "frontend")
    if os.path.exists(frontend_path):
        app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")
