
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies 
RUN apt-get update && apt-get install -y gcc curl && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY main.py .
COPY config.py .
COPY symbols_cache.py .

# Environment variables
ENV PORT=8080
ENV PYTHONPATH=/app

# Run the main application directly
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
