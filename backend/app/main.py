from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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

# Allow requests from the React dev server and any deployed frontend URL
origins = [
    "http://localhost:5173",   # Vite default dev port
    "http://localhost:3000",   # Create React App default dev port
    "http://127.0.0.1:5173",
    # Add your production domain here when deploying, e.g.:
    # "https://your-app.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(convert_router)


@app.get("/", tags=["Health"])
def health_check():
    return {
        "status": "ok",
        "message": "PDF Maker API is running. Visit /docs for the interactive API documentation.",
    }
