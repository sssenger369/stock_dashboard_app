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
                
                # Handle both Google Drive and OneDrive URLs
                original_url = settings.ONEDRIVE_DATA_URL
                print(f"📁 Using cloud storage URL: {original_url}")
                
                # Convert Google Drive share URL to direct download URL
                if "drive.google.com" in original_url:
                    # Extract file ID from Google Drive URL
                    if "/file/d/" in original_url:
                        file_id = original_url.split("/file/d/")[1].split("/")[0]
                        download_url = f"https://drive.google.com/uc?export=download&id={file_id}"
                        print(f"🔄 Converted to Google Drive direct download: {download_url}")
                    else:
                        download_url = original_url
                else:
                    # OneDrive URL (fallback)
                    download_url = original_url
                
                # Download with proper headers and session
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
                
                session = requests.Session()
                session.headers.update(headers)
                
                # For Google Drive, handle large file downloads properly
                if "drive.google.com" in download_url:
                    print("🔄 Getting Google Drive download (handling large file properly)...")
                    
                    # Step 1: Get the initial response to check for virus scan warning
                    initial_response = session.get(download_url, allow_redirects=False)
                    initial_response.raise_for_status()
                    
                    print(f"📋 Initial response status: {initial_response.status_code}")
                    print(f"📏 Initial content length: {len(initial_response.content)}")
                    
                    # Check if we need to handle redirects or warnings
                    if initial_response.status_code == 302 or 'Location' in initial_response.headers:
                        # Follow redirect manually
                        redirect_url = initial_response.headers.get('Location', download_url)
                        print(f"🔄 Following redirect to: {redirect_url[:100]}...")
                        response = session.get(redirect_url, stream=True, allow_redirects=True, timeout=600)
                    elif len(initial_response.content) < 100000:  # Small response suggests HTML warning page
                        print("⚠️  Got virus scan warning page, extracting download link...")
                        
                        # Look for the actual download link in the HTML
                        import re
                        text = initial_response.text
                        
                        # Multiple patterns to find the download URL
                        download_patterns = [
                            r'href="(/uc\?export=download[^"]+)"',
                            r'"downloadUrl":"([^"]+)"',
                            r'action="([^"]+uc\?export=download[^"]*)"',
                            r'<a[^>]*href="([^"]*uc\?export=download[^"]*)"'
                        ]
                        
                        download_link = None
                        for pattern in download_patterns:
                            matches = re.findall(pattern, text)
                            for match in matches:
                                if 'export=download' in match:
                                    if match.startswith('/'):
                                        download_link = f"https://drive.google.com{match}"
                                    else:
                                        download_link = match.replace('\\u0026', '&')
                                    print(f"✅ Found download link in HTML")
                                    break
                            if download_link:
                                break
                        
                        if download_link:
                            print(f"🔄 Using extracted download link")
                            response = session.get(download_link, stream=True, allow_redirects=True, timeout=600)
                        else:
                            print("❌ Could not extract download link, trying cookie-based approach...")
                            # Try using the file ID with cookies
                            cookie_url = f"https://drive.google.com/uc?id={file_id}&export=download&confirm=t"
                            response = session.get(cookie_url, stream=True, allow_redirects=True, timeout=600)
                    else:
                        print("✅ Got direct file response")
                        response = initial_response
                else:
                    # Non-Google Drive URL
                    response = session.get(download_url, stream=True, allow_redirects=True, timeout=300)
                
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