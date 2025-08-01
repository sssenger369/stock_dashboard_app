from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import numpy as np
from datetime import datetime
import os

app = FastAPI(
    title="Stock Dashboard API - Real Data",
    description="FastAPI backend serving real parquet data with all technical indicators",
    version="2.0.0"
)

# CORS Configuration - Allow all localhost ports for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5181",
        "http://127.0.0.1:5181", 
        "http://localhost:5180",
        "http://localhost:5179",
        "http://localhost:5178",
        "http://localhost:5177",
        "http://localhost:5176",
        "http://localhost:5175",
        "http://localhost:5174",
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"  # Allow all for development
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Data path - use the local parquet file
DATA_PATH = "./data/Final_Data.parquet"

# Cache for symbols (loaded once)
_symbols_cache = None

def get_symbols_from_parquet():
    """Load all unique symbols from parquet file"""
    global _symbols_cache
    if _symbols_cache is None:
        try:
            # Read only SYMBOL column for fast loading
            print("Loading symbols from parquet file...")
            df_symbols = pd.read_parquet(DATA_PATH, columns=['SYMBOL'])
            _symbols_cache = sorted(df_symbols['SYMBOL'].unique().tolist())
            print(f"Loaded {len(_symbols_cache)} unique symbols")
        except Exception as e:
            print(f"Error loading symbols: {e}")
            _symbols_cache = []
    return _symbols_cache

def get_stock_data_from_parquet(symbol: str, start_date: str = None, end_date: str = None):
    """Load stock data for specific symbol with date filtering"""
    try:
        print(f"Loading data for symbol: {symbol}")
        
        # Read full parquet in chunks to avoid memory issues
        chunk_size = 100000  # Read 100k rows at a time
        symbol_data = []
        
        # Read parquet file in chunks
        parquet_file = pd.read_parquet(DATA_PATH, engine='pyarrow')
        
        # Filter for the specific symbol
        df = parquet_file[parquet_file['SYMBOL'] == symbol].copy()
        
        if df.empty:
            print(f"No data found for symbol: {symbol}")
            return df
            
        # Convert timestamp
        df['TIMESTAMP'] = pd.to_datetime(df['TIMESTAMP'])
        
        # Apply date filters if provided
        if start_date:
            start_dt = pd.to_datetime(start_date)
            df = df[df['TIMESTAMP'] >= start_dt]
            
        if end_date:
            end_dt = pd.to_datetime(end_date)
            df = df[df['TIMESTAMP'] <= end_dt]
        
        # Sort by timestamp
        df = df.sort_values('TIMESTAMP')
        
        print(f"Loaded {len(df)} records for {symbol}")
        return df
        
    except Exception as e:
        print(f"Error loading data for {symbol}: {e}")
        return pd.DataFrame()

@app.get("/")
async def read_root():
    return {
        "message": "Stock Dashboard API - Real Parquet Data",
        "data_source": "Final_Data.parquet", 
        "indicators": "All real technical indicators included",
        "symbols_available": len(get_symbols_from_parquet())
    }

@app.get("/symbols")
async def get_symbols():
    """Returns all unique stock symbols from parquet file"""
    try:
        symbols = get_symbols_from_parquet()
        if not symbols:
            raise HTTPException(status_code=404, detail="No symbols found")
        
        print(f"Returning {len(symbols)} symbols")
        return symbols
        
    except Exception as e:
        print(f"Error in get_symbols: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to load symbols: {str(e)}")

@app.get("/stock_data/{symbol}")
async def get_stock_data(
    symbol: str,
    start_date: str = None,
    end_date: str = None,
    frequency: str = "Daily"
):
    """
    Returns real stock data with all technical indicators from parquet file
    """
    try:
        # Load data for specific symbol
        df = get_stock_data_from_parquet(symbol, start_date, end_date)
        
        if df.empty:
            raise HTTPException(status_code=404, detail=f"No data found for symbol {symbol}")
        
        # Handle NaN values - convert to None for JSON serialization
        df = df.replace({np.nan: None, pd.NaT: None})
        
        # Convert timestamps to ISO format
        df['TIMESTAMP'] = df['TIMESTAMP'].apply(lambda x: x.isoformat() if pd.notna(x) else None)
        
        # Convert to records
        records = df.to_dict(orient='records')
        
        print(f"Returning {len(records)} records for {symbol}")
        return records
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error loading stock data for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to load data for {symbol}: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8002)