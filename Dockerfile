# Build from the root of the monorepo, pointing into backend/
FROM python:3.12-slim

# Install LibreOffice for Word → PDF conversion
RUN apt-get update && apt-get install -y \
    libreoffice \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy backend requirements and install dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the full backend application code
COPY backend/ .

# Create temp storage directory
RUN mkdir -p temp_storage

# Expose port (Railway overrides this with $PORT)
EXPOSE 8000

# Start the FastAPI server using Railway's dynamic PORT
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
