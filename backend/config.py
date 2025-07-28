import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class Settings:
    # Server configuration
    HOST = os.getenv("HOST", "0.0.0.0")
    PORT = int(os.getenv("PORT", 8000))
    DEBUG = os.getenv("DEBUG", "false").lower() == "true"
    
    # Data configuration  
    DATA_DIRECTORY = os.getenv("DATA_DIRECTORY", r"C:\Users\sssen\Trading\OneDrive\Bhav copy Script")
    DATA_FILENAME = os.getenv("DATA_FILENAME", "Final_Data.parquet")
    
    @property
    def DATA_PATH(self):
        return os.path.join(self.DATA_DIRECTORY, self.DATA_FILENAME)
    
    # CORS configuration
    CORS_ORIGINS = os.getenv(
        "CORS_ORIGINS", 
        "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173,https://stock-dashboard-93bsuyrcd-sanjay-singhs-projects-933bcc33.vercel.app"
    ).split(",")
    
    # Z-Score configuration
    DEFAULT_ZSCORE_WINDOW = int(os.getenv("DEFAULT_ZSCORE_WINDOW", 30))

settings = Settings()