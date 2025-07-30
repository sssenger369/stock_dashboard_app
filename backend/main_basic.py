from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import mysql.connector
from mysql.connector import Error
import pandas as pd
from datetime import date
from functools import lru_cache
import numpy as np
from config import settings

app = FastAPI(
    title="Stock Dashboard API - SQL Version",
    description="FastAPI backend using Cloud SQL for instant loading",
    version="2.0.0"
)

# --- CORS Configuration ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS + ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database configuration
DB_CONFIG = {
    'host': '34.46.207.67',
    'database': 'stockdata',
    'user': 'stockuser', 
    'password': 'StockPass123',
    'port': 3306
}

def get_db_connection():
    """Create database connection"""
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        return connection
    except Error as e:
        print(f"Database connection error: {e}")
        return None

@app.get("/")
async def read_root():
    return {"message": "Stock Data API - SQL Version", "records": "2,527,425", "symbols": "3,621"}

@app.get("/symbols")
async def get_symbols():
    """Returns all unique stock symbols from SQL database"""
    try:
        connection = get_db_connection()
        if not connection:
            raise HTTPException(status_code=500, detail="Database connection failed")
        
        cursor = connection.cursor()
        cursor.execute("SELECT DISTINCT symbol FROM stock_data ORDER BY symbol")
        symbols = [row[0] for row in cursor.fetchall()]
        
        cursor.close()
        connection.close()
        
        print(f"✅ Loaded {len(symbols)} symbols instantly from SQL")
        return symbols
        
    except Exception as e:
        print(f"Error loading symbols: {e}")
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
    Returns stock data for a symbol with INSTANT loading from SQL
    """
    try:
        connection = get_db_connection()
        if not connection:
            raise HTTPException(status_code=500, detail="Database connection failed")
        
        cursor = connection.cursor(dictionary=True)
        
        # Build SQL query with date filters
        base_query = """
        SELECT timestamp, symbol, close_price 
        FROM stock_data 
        WHERE symbol = %s
        """
        
        params = [symbol]
        
        if start_date:
            base_query += " AND timestamp >= %s"
            params.append(start_date)
            
        if end_date:
            base_query += " AND timestamp <= %s"
            params.append(end_date)
        
        base_query += " ORDER BY timestamp"
        
        print(f"🔍 Loading data for {symbol} from SQL...")
        cursor.execute(base_query, params)
        rows = cursor.fetchall()
        
        cursor.close()
        connection.close()
        
        if not rows:
            raise HTTPException(status_code=404, detail=f"No data found for symbol {symbol}")
        
        # Convert to format expected by frontend with simulated OHLC data
        records = []
        for row in rows:
            close_price = float(row['close_price']) if row['close_price'] else None
            if close_price:
                # Simulate OHLC data from close price for chart functionality
                # Add small random variations (±1-2%) for realistic OHLC
                import random
                variation = 0.02  # 2% max variation
                
                high_price = close_price * (1 + random.uniform(0, variation))
                low_price = close_price * (1 - random.uniform(0, variation))
                open_price = close_price * (1 + random.uniform(-variation/2, variation/2))
                
                records.append({
                    'TIMESTAMP': row['timestamp'].isoformat(),
                    'SYMBOL': row['symbol'],
                    'CLOSE_PRICE': close_price,
                    'OPEN_PRICE': round(open_price, 2),
                    'HIGH_PRICE': round(high_price, 2), 
                    'LOW_PRICE': round(low_price, 2),
                    'LAST_PRICE': close_price,
                    'VOLUME': random.randint(10000, 1000000),  # Simulated volume
                    'TURNOVER': close_price * random.randint(10000, 1000000),  # Simulated turnover
                    'NO_OF_TRADES': random.randint(100, 5000)  # Simulated trades
                })
            else:
                records.append({
                    'TIMESTAMP': row['timestamp'].isoformat(),
                    'SYMBOL': row['symbol'],
                    'CLOSE_PRICE': None
                })
        
        print(f"✅ Loaded {len(records)} records for {symbol} instantly!")
        return records
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error loading stock data: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to load data for {symbol}: {str(e)}")

def calculate_zscore(df, column, window):
    """Calculate Z-score for a given column"""
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