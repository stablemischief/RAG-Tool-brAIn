# RAG Tool Standalone - Backend Dockerfile
# Python 3.11 optimized for RAG operations with all required dependencies

FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies for PDF and document processing
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better Docker layer caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Create directories for configuration and logs
RUN mkdir -p /app/config /app/logs

# Copy the application code
COPY . .

# Set Python path to include the backend directory
ENV PYTHONPATH=/app

# Create non-root user for security
RUN useradd --create-home --shell /bin/bash app \
    && chown -R app:app /app
USER app

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Expose the application port
EXPOSE 8000

# Command to run the application
CMD ["python", "main.py"]