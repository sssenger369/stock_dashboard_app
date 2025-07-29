#!/usr/bin/env python3
"""
Deployment script for Stock Dashboard Backend
Ensures sample data is available and starts the server
"""
import os
import sys
from pathlib import Path

def ensure_data():
    """Ensure data exists for deployment - try OneDrive first, then sample data"""
    data_dir = Path("./data")
    data_file = data_dir / "Final_Data.parquet"
    
    if not data_file.exists():
        print("Data file not found, trying OneDrive download...")
        data_dir.mkdir(exist_ok=True)
        
        # Check if this is a Git LFS placeholder file
        if data_dir.exists():
            potential_files = list(data_dir.glob("*.parquet"))
            if potential_files:
                existing_file = potential_files[0]
                file_size = existing_file.stat().st_size
                print(f"📁 Found existing file: {existing_file} ({file_size/1024/1024:.1f} MB)")
                
                # If file is very small, it might be a Git LFS pointer - try to use it anyway
                if file_size < 1000:  # Less than 1KB suggests LFS pointer
                    print("⚠️  File appears to be Git LFS pointer, but attempting to use...")
                else:
                    print("✅ File appears to be actual data, skipping download")
                    return
        
        # Try to download from OneDrive first
        try:
            from config import settings
            import requests
            
            if settings.ONEDRIVE_DATA_URL:
                print("🔄 Downloading full dataset from cloud storage...")
                
                # Handle different cloud storage URLs
                original_url = settings.ONEDRIVE_DATA_URL
                print(f"📁 Using cloud storage URL: {original_url}")
                
                # Download with proper headers
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
                
                session = requests.Session()
                session.headers.update(headers)
                
                # Google Cloud Storage URLs are direct and reliable
                if "storage.googleapis.com" in original_url:
                    print("✅ Using Google Cloud Storage - direct download")
                    response = session.get(original_url, stream=True, allow_redirects=True, timeout=600)
                    response.raise_for_status()
                elif "drive.google.com" in original_url:
                    # Legacy Google Drive handling (kept as fallback)
                    print("🔄 Google Drive URL detected - using advanced handling...")
                    if "/file/d/" in original_url:
                        file_id = original_url.split("/file/d/")[1].split("/")[0]
                        download_url = f"https://drive.google.com/uc?export=download&id={file_id}"
                    else:
                        download_url = original_url
                    
                    # Simple direct download attempt first
                    response = session.get(download_url, stream=True, allow_redirects=True, timeout=600)
                    response.raise_for_status()
                else:
                    # Other cloud storage or direct URLs
                    print("🔄 Direct download from URL")
                    response = session.get(original_url, stream=True, allow_redirects=True, timeout=600)
                    response.raise_for_status()
                
                response.raise_for_status()
                
                # Check response headers
                content_type = response.headers.get('content-type', '')
                content_length = response.headers.get('content-length', '0')
                
                print(f"📋 Content-Type: {content_type}")
                print(f"📏 Content-Length: {content_length}")
                
                # Verify we're getting a reasonable file size
                expected_size = int(content_length) if content_length.isdigit() else 0
                if expected_size < 10000000:  # Less than 10MB is suspicious
                    print(f"⚠️  Warning: Expected file size is only {expected_size/1024/1024:.1f} MB")
                else:
                    print(f"✅ Expected file size: {expected_size/1024/1024:.1f} MB")
                
                # Save the file
                total_size = 0
                with open(data_file, 'wb') as f:
                    for chunk in response.iter_content(chunk_size=1024*1024):
                        if chunk:
                            f.write(chunk)
                            total_size += len(chunk)
                            if total_size % (100*1024*1024) == 0:  # Log every 100MB
                                print(f"📥 Downloaded {total_size/(1024*1024):.0f} MB...")
                
                file_size = data_file.stat().st_size / (1024*1024)
                print(f"✅ OneDrive download complete! ({file_size:.0f} MB)")
                
                # Quick validation
                import pandas as pd
                try:
                    # Use head() instead of nrows parameter for older pandas versions
                    test_df = pd.read_parquet(data_file)
                    print(f"📊 Validation: {test_df['SYMBOL'].nunique()} symbols detected from {len(test_df)} total records")
                    return
                except Exception as val_err:
                    print(f"❌ Validation failed: {val_err}")
                    raise val_err
                
        except Exception as e:
            print(f"❌ OneDrive download failed: {e}")
            print("🔄 Falling back to sample data generation...")
            if data_file.exists():
                data_file.unlink()  # Remove partial download
        
        # Fallback to sample data if OneDrive fails
        print("Generating sample data...")
        from sample_data import create_sample_data
        df = create_sample_data()
        df.to_parquet(str(data_file), index=False)
        print(f"Sample data created at {data_file}")
    else:
        file_size = data_file.stat().st_size / (1024*1024)
        print(f"Data file already exists ({file_size:.1f} MB)")

def start_server():
    """Start the FastAPI server"""
    import uvicorn
    
    print("🚀 Starting Stock Dashboard API...")
    
    # Get port from environment or default to 8000
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    
    print(f"Server will start on {host}:{port}")
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=False,  # Disable reload in production
        log_level="info"
    )

if __name__ == "__main__":
    ensure_data()
    start_server()