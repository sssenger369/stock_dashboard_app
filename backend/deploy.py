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
        
        # Try to download from OneDrive first
        try:
            from config import settings
            import requests
            
            if settings.ONEDRIVE_DATA_URL:
                print("🔄 Downloading full dataset from OneDrive...")
                
                # For OneDrive direct file links, try multiple approaches
                download_url = settings.ONEDRIVE_DATA_URL
                print(f"📁 Using OneDrive URL: {download_url}")
                
                # Download with proper headers and session
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
                
                # First, try to get the direct download URL by following redirects
                session = requests.Session()
                session.headers.update(headers)
                
                # Get the initial page to find the actual download URL
                initial_response = session.get(download_url, allow_redirects=True)
                initial_response.raise_for_status()
                
                # Check if we got redirected to a download URL
                final_url = initial_response.url
                print(f"🔄 Final URL after redirects: {final_url}")
                
                # Check if this looks like actual file content
                content_type = initial_response.headers.get('content-type', '')
                content_length = initial_response.headers.get('content-length', '0')
                
                print(f"📋 Content-Type: {content_type}")
                print(f"📏 Content-Length: {content_length}")
                
                # For embed URLs, the initial response might be the file
                if (('application/octet-stream' in content_type or 
                     'binary' in content_type or
                     int(content_length) > 10000000) and  # > 10MB suggests it's the file
                    'text/html' not in content_type):
                    print("✅ Got direct file download from embed URL")
                    response = initial_response
                else:
                    # Try adding download parameter for regular share URLs
                    download_url_with_param = download_url + '?download=1'
                    print(f"🔄 Trying with download parameter: {download_url_with_param}")
                    response = session.get(download_url_with_param, stream=True, allow_redirects=True, timeout=300)
                    response.raise_for_status()
                    
                    # Check this response too
                    new_content_type = response.headers.get('content-type', '')
                    new_content_length = response.headers.get('content-length', '0')
                    print(f"📋 New Content-Type: {new_content_type}")
                    print(f"📏 New Content-Length: {new_content_length}")
                
                # Verify we're getting a reasonable file size
                expected_size = int(response.headers.get('content-length', '0'))
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