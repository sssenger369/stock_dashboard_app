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
                
                # Convert OneDrive share URL to direct download URL
                download_url = settings.ONEDRIVE_DATA_URL
                if "1drv.ms/u/" in download_url:
                    download_url = download_url.replace("?e=", "&download=1&e=")
                
                # Download with proper headers
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
                response = requests.get(download_url, stream=True, allow_redirects=True, 
                                      headers=headers, timeout=300)
                response.raise_for_status()
                
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
                test_df = pd.read_parquet(data_file, nrows=10)
                print(f"📊 Validation: {test_df['SYMBOL'].nunique()} symbols detected")
                return
                
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