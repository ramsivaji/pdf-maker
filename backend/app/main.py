import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.route_convert import router as convert_router

app = FastAPI(
    title="PDF Maker - File Conversion API",
    description=(
        "A powerful API for converting files between formats. "
        "Supports PDF to Word, Word to PDF, merging PDFs, and converting Images to PDF."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

origins = [
    "*", # Allow everywhere since everything is on one domain now
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(convert_router)

# Serve the raw HTML/CSS/JS frontend on the root URL locally.
# On Vercel, the environment variable 'VERCEL' is set, and Vercel natively serves the static files.
if not os.getenv("VERCEL"):
    frontend_path = os.path.join(os.path.dirname(__file__), "..", "..", "frontend")
    if os.path.exists(frontend_path):
        app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")
