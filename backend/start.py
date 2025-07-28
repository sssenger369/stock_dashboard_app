#!/usr/bin/env python3
"""
Startup script for Stock Dashboard FastAPI Backend
"""
import uvicorn
import os
from pathlib import Path

if __name__ == "__main__":
    # Get the directory of this script
    backend_dir = Path(__file__).parent
    
    # Change to backend directory to ensure relative imports work
    os.chdir(backend_dir)
    
    print("🚀 Starting Stock Dashboard FastAPI Backend...")
    print(f"📁 Backend directory: {backend_dir}")
    print("🌐 API will be available at: http://127.0.0.1:8000")
    print("📚 API documentation: http://127.0.0.1:8000/docs")
    print("🔄 Auto-reload enabled for development")
    print("-" * 50)
    
    # Start the FastAPI server with uvicorn
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,  # Enable auto-reload for development
        reload_dirs=[str(backend_dir)],  # Watch backend directory for changes
        log_level="info"
    )