from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import os
from datetime import date
from functools import lru_cache
import numpy as np # Import numpy for NaN check
import requests
from pathlib import Path
from config import settings

app = FastAPI(
    title="Stock Dashboard API",
    description="FastAPI backend for Stock Market Dashboard with technical indicators",
    version="1.0.0"
)

# --- CORS Configuration ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS + ["*"],  # Allow all origins for deployment
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def download_onedrive_data():
    """Downloads data from OneDrive if local file doesn't exist."""
    if settings.ONEDRIVE_DATA_URL and not os.path.exists(settings.DATA_PATH):
        print(f"INFO: Downloading data from OneDrive...")
        try:
            # Create data directory if it doesn't exist
            Path(settings.DATA_DIRECTORY).mkdir(parents=True, exist_ok=True)
            
            # For OneDrive direct file links, convert to download URL
            onedrive_url = settings.ONEDRIVE_DATA_URL
            if "1drv.ms/u/" in onedrive_url:
                # Convert OneDrive share URL to direct download URL
                download_url = onedrive_url.replace("?e=", "&download=1&e=")
                print(f"INFO: Using OneDrive direct download URL")
            else:
                download_url = onedrive_url
            
            print(f"INFO: Downloading from: {download_url}")
            
            # Download the file with timeout and proper headers
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
            response = requests.get(download_url, stream=True, allow_redirects=True, 
                                  headers=headers, timeout=300)
            response.raise_for_status()
            
            # Save to local file
            print(f"INFO: Saving downloaded data to {settings.DATA_PATH}")
            total_size = 0
            with open(settings.DATA_PATH, 'wb') as f:
                for chunk in response.iter_content(chunk_size=1024*1024):  # 1MB chunks
                    if chunk:
                        f.write(chunk)
                        total_size += len(chunk)
                        if total_size % (50*1024*1024) == 0:  # Log every 50MB
                            print(f"INFO: Downloaded {total_size/(1024*1024):.1f} MB...")
            
            # Verify file was downloaded
            if os.path.exists(settings.DATA_PATH) and os.path.getsize(settings.DATA_PATH) > 0:
                file_size = os.path.getsize(settings.DATA_PATH) / (1024*1024)  # MB
                print(f"INFO: Successfully downloaded data to {settings.DATA_PATH} ({file_size:.1f} MB)")
                
                # Quick validation - try to read the parquet file
                try:
                    test_df = pd.read_parquet(settings.DATA_PATH, nrows=10)
                    print(f"INFO: File validation successful - {len(test_df.columns)} columns detected")
                    return True
                except Exception as validate_error:
                    print(f"ERROR: Downloaded file is not a valid parquet file: {validate_error}")
                    os.remove(settings.DATA_PATH)  # Remove invalid file
                    return False
            else:
                print(f"ERROR: File download failed or file is empty")
                return False
            
        except Exception as e:
            print(f"ERROR: Failed to download from OneDrive: {e}")
            return False
    elif os.path.exists(settings.DATA_PATH):
        file_size = os.path.getsize(settings.DATA_PATH) / (1024*1024)  # MB
        print(f"INFO: Data file already exists ({file_size:.1f} MB)")
    return True

@lru_cache(maxsize=1)
def get_symbols_only():
    """Loads only symbols from the data for fast initial load."""
    try:
        # Read only SYMBOL column for fast loading
        df_symbols = pd.read_parquet(settings.DATA_PATH, columns=['SYMBOL'])
        unique_symbols = df_symbols['SYMBOL'].unique().tolist()
        print(f"Fast symbol loading complete: {len(unique_symbols)} symbols found")
        return unique_symbols
    except Exception as e:
        print(f"ERROR: Failed to load symbols fast, trying fallback: {e}")
        return []

def get_symbol_data_only(symbol: str):
    """Loads data for ONLY the specified symbol - true lazy loading"""
    try:
        # Download data if needed
        download_onedrive_data()
        
        print(f"🔄 Loading data for symbol: {symbol}")
        
        # Use pandas parquet filters to read only rows for this symbol
        # This is MUCH faster than loading entire 977MB file
        df = pd.read_parquet(settings.DATA_PATH, 
                           filters=[('SYMBOL', '=', symbol)])
        
        if df.empty:
            print(f"❌ No data found for symbol: {symbol}")
            return pd.DataFrame()
        
        df['TIMESTAMP'] = pd.to_datetime(df['TIMESTAMP'])
        print(f"✅ Loaded {len(df)} records for {symbol} in seconds")
        return df
        
    except Exception as e:
        print(f"❌ ERROR loading data for {symbol}: {e}")
        return pd.DataFrame()

@lru_cache(maxsize=1) 
def get_main_data():
    """FALLBACK: Loads full dataset only if symbol filtering fails"""
    download_onedrive_data()
    
    try:
        print("⚠️ Loading full dataset as fallback...")
        df = pd.read_parquet(settings.DATA_PATH)
        df['TIMESTAMP'] = pd.to_datetime(df['TIMESTAMP'])
        print(f"DEBUG: Full data loaded. Shape: {df.shape}")
        return df
    except FileNotFoundError:
        print(f"WARNING: Parquet file not found at {settings.DATA_PATH}")
        print("INFO: Generating sample data for demonstration...")
        # Generate sample data if file not found
        from sample_data import create_sample_data
        df = create_sample_data()
        print(f"INFO: Generated sample data with {len(df)} records")
        return df
    except Exception as e:
        print(f"ERROR: Failed to load data from {settings.DATA_PATH}: {e}")
        print("INFO: Attempting to generate sample data...")
        try:
            from sample_data import create_sample_data
            df = create_sample_data()
            print(f"INFO: Generated sample data with {len(df)} records")
            return df
        except Exception as sample_error:
            print(f"ERROR: Failed to generate sample data: {sample_error}")
            raise HTTPException(status_code=500, detail=f"Failed to load data from server: {e}")

# Data will be loaded on first request to avoid startup timeout
main_df = None

def calculate_zscore(df, column, window):
    """Calculates Z-score for a given column with a rolling window."""
    if column not in df.columns:
        return pd.Series(np.nan, index=df.index)

    numeric_col = pd.to_numeric(df[column], errors='coerce')
    rolling_data = numeric_col.dropna()

    if len(rolling_data) < window:
        return pd.Series(np.nan, index=df.index)

    rolling_mean = rolling_data.rolling(window=window, min_periods=1).mean().reindex(df.index)
    rolling_std = rolling_data.rolling(window=window, min_periods=1).std().reindex(df.index)

    zscore = (numeric_col - rolling_mean) / rolling_std
    zscore = zscore.replace([np.inf, -np.inf], np.nan)
    return zscore

# Removed the recursive convert_nan_to_none as we'll handle it explicitly now for relevant types

@app.get("/")
async def read_root():
    return {"message": "Welcome to the Stock Data API"}

@app.get("/symbols")
async def get_symbols():
    """Returns a list of unique stock symbols available in the data."""
    try:
        # Use pre-computed symbols cache for instant loading
        from symbols_cache import get_cached_symbols
        symbols = get_cached_symbols()
        print(f"Fast symbols loaded: {len(symbols)} symbols")
        return symbols
    except Exception as e:
        print(f"ERROR in get_symbols: {e}")
        # Fallback to slow loading if cache fails
        try:
            global main_df
            if main_df is None:
                main_df = get_main_data()
            if main_df.empty:
                raise HTTPException(status_code=404, detail="No stock data loaded.")
            symbols = main_df['SYMBOL'].unique().tolist()
            return sorted(symbols)
        except Exception as fallback_error:
            print(f"Fallback also failed: {fallback_error}")
            raise HTTPException(status_code=500, detail=f"Failed to load symbols: {str(e)}")

@app.get("/stock_data/{symbol}")
async def get_stock_data(
    symbol: str,
    start_date: str = None,
    end_date: str = None,
    frequency: str = "Daily",
    zscore_window: int = 30
):
    """
    Returns historical stock data for a given symbol within a date range and frequency.
    Applies Z-score calculation with TRUE LAZY LOADING.
    """
    # Use lazy loading - only load data for the requested symbol
    symbol_df = get_symbol_data_only(symbol)
    
    if symbol_df.empty:
        print(f"DEBUG: 404 - No data found for symbol '{symbol}'")
        raise HTTPException(status_code=404, detail=f"Stock data for symbol '{symbol}' not found.")

    if start_date:
        try:
            start_date_dt = pd.to_datetime(start_date)
            symbol_df = symbol_df[symbol_df['TIMESTAMP'] >= start_date_dt]
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid start_date format: {start_date}. Expected YYYY-MM-DD.")
    if end_date:
        try:
            end_date_dt = pd.to_datetime(end_date)
            # Ensure end_date includes the entire day
            symbol_df = symbol_df[symbol_df['TIMESTAMP'] <= end_date_dt.replace(hour=23, minute=59, second=59, microsecond=999999)]
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid end_date format: {end_date}. Expected YYYY-MM-DD.")

    if symbol_df.empty:
        print(f"DEBUG: 404 - No data for symbol '{symbol}' within date range {start_date} to {end_date}.")
        raise HTTPException(status_code=404, detail=f"No data available for {symbol} in the selected date range.")

    resampled_df = pd.DataFrame()
    if frequency == "Daily":
        symbol_df = symbol_df.sort_values(by='TIMESTAMP').drop_duplicates(subset=['TIMESTAMP'])
        resampled_df = symbol_df
    else:
        required_cols_for_agg = ['OPEN_PRICE', 'HIGH_PRICE', 'LOW_PRICE', 'CLOSE_PRICE',
                                 'LAST_TRADED_PRICE', 'TOTAL_TRADED_QUANTITY',
                                 'TOTAL_TRADED_VALUE', 'TURNOVER', 'NUMBER_OF_TRADES']
        agg_functions = {
            col: 'first' if col == 'OPEN_PRICE' else
            ('max' if col == 'HIGH_PRICE' else
            ('min' if col == 'LOW_PRICE' else 'last'))
            for col in required_cols_for_agg if col in symbol_df.columns
        }
        if 'TOTAL_TRADED_QUANTITY' in symbol_df.columns: agg_functions['TOTAL_TRADED_QUANTITY'] = 'sum'
        if 'TOTAL_TRADED_VALUE' in symbol_df.columns: agg_functions['TOTAL_TRADED_VALUE'] = 'sum'
        if 'TURNOVER' in symbol_df.columns: agg_functions['TURNOVER'] = 'sum'
        if 'NUMBER_OF_TRADES' in symbol_df.columns: agg_functions['NUMBER_OF_TRADES'] = 'sum'
        if 'VWAP_144' in symbol_df.columns: agg_functions['VWAP_144'] = 'mean'


        if symbol_df.empty or 'TIMESTAMP' not in symbol_df.columns:
            print(f"DEBUG: Dataframe for {symbol} is empty or missing TIMESTAMP before resampling.")
            raise HTTPException(status_code=404, detail=f"No valid data to resample for {symbol}.")

        temp_df = symbol_df.sort_values(by='TIMESTAMP').drop_duplicates(subset=['TIMESTAMP']).set_index('TIMESTAMP')

        if frequency == "Weekly":
            resampled_df = temp_df.resample('W').agg(agg_functions).reset_index()
        elif frequency == "Monthly":
            resampled_df = temp_df.resample('M').agg(agg_functions).reset_index()
        else:
            raise HTTPException(status_code=400, detail="Invalid frequency. Choose 'Daily', 'Weekly', or 'Monthly'.")

    if resampled_df.empty:
        print(f"DEBUG: 404 - No data available for symbol '{symbol}' after resampling for frequency '{frequency}'.")
        raise HTTPException(status_code=404, detail=f"No data available for {symbol} after resampling to {frequency} in the selected date range.")

    symbol_df = resampled_df

    # Calculate Z-score for CLOSE_PRICE if column exists
    if 'CLOSE_PRICE' in symbol_df.columns:
        symbol_df['Z_SCORE_CLOSE_PRICE'] = calculate_zscore(symbol_df.copy(), 'CLOSE_PRICE', zscore_window)

    # --- IMPORTANT FIX FOR NaN VALUES ---
    # Iterate over all columns and convert NaN/NaT to None for JSON compliance
    # This will ensure that all numpy.nan, pandas.NaT, etc. are converted
    for col in symbol_df.columns:
        # Check if column is numeric or datetime where NaNs can exist
        if pd.api.types.is_numeric_dtype(symbol_df[col]) or pd.api.types.is_datetime64_any_dtype(symbol_df[col]):
            symbol_df[col] = symbol_df[col].replace({np.nan: None, pd.NaT: None})
        # For object columns that might contain 'nan' strings or actual floats that are NaN
        elif symbol_df[col].dtype == 'object':
             symbol_df[col] = symbol_df[col].apply(lambda x: None if (isinstance(x, float) and np.isnan(x)) or pd.isna(x) else x)


    # Convert Timestamps to ISO 8601 strings AFTER all other NaN handling
    symbol_df['TIMESTAMP'] = symbol_df['TIMESTAMP'].apply(lambda x: x.isoformat() if pd.notna(x) else None)

    # Convert DataFrame to a list of dictionaries
    records = symbol_df.to_dict(orient='records')

    print(f"DEBUG: Successfully prepared {len(records)} records for {symbol}.")
    return records