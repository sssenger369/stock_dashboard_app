from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import os
from datetime import date
from functools import lru_cache
import numpy as np # Import numpy for NaN check
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

@lru_cache(maxsize=1)
def get_main_data():
    """Loads the main Parquet data once and caches it."""
    try:
        df = pd.read_parquet(settings.DATA_PATH)
        df['TIMESTAMP'] = pd.to_datetime(df['TIMESTAMP'])
        print(f"DEBUG: Data loaded successfully from {settings.DATA_PATH}. Shape: {df.shape}")
        print(f"DEBUG: Columns: {df.columns.tolist()}")
        print(f"DEBUG: TIMESTAMP dtype after load: {df['TIMESTAMP'].dtype}")
        return df
    except FileNotFoundError:
        print(f"ERROR: Parquet file not found at {settings.DATA_PATH}")
        raise HTTPException(status_code=500, detail="Data file not found on server. Please check DATA_PATH.")
    except Exception as e:
        print(f"ERROR: Failed to load data from {settings.DATA_PATH}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to load data from server: {e}")

# Load data on application startup (and cache it)
main_df = get_main_data()

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
    if main_df.empty:
        raise HTTPException(status_code=404, detail="No stock data loaded from Final_Data.parquet.")
    symbols = main_df['SYMBOL'].unique().tolist()
    return sorted(symbols)

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
    Applies Z-score calculation.
    """
    if main_df.empty:
        print("DEBUG: 404 - main_df is empty, cannot process request.")
        raise HTTPException(status_code=404, detail="Backend data is not loaded.")

    symbol_df = main_df[main_df['SYMBOL'] == symbol].copy()

    if symbol_df.empty:
        print(f"DEBUG: 404 - Symbol '{symbol}' not found in main data or no data for symbol.")
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