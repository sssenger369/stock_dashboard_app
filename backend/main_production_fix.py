from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import mysql.connector
from mysql.connector import Error
import pandas as pd
from datetime import date
from functools import lru_cache
import numpy as np
import random
import math

app = FastAPI(
    title="Stock Dashboard API - Production Fixed",
    description="FastAPI backend with all technical indicators - NO LIMITS",
    version="4.0.0"
)

# --- CORS Configuration - ALLOW ALL ORIGINS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for production
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

def calculate_technical_indicators(df):
    """Calculate comprehensive technical indicators"""
    if df.empty:
        return {}
    
    close_prices = df['close_price'].values
    high_prices = df['high_price'].values if 'high_price' in df.columns else close_prices
    low_prices = df['low_price'].values if 'low_price' in df.columns else close_prices
    
    # Rolling indicators
    rolling_median = pd.Series(close_prices).rolling(window=20, min_periods=1).median()
    rolling_mode = pd.Series(close_prices).rolling(window=20, min_periods=1).apply(lambda x: x.mode().iloc[0] if not x.mode().empty else x.iloc[-1])
    
    # Pivot Points
    pp = (high_prices + low_prices + close_prices) / 3
    s1 = 2 * pp - high_prices
    s2 = pp - (high_prices - low_prices)
    s3 = low_prices - 2 * (high_prices - pp)
    s4 = s3 - (high_prices - low_prices)
    r1 = 2 * pp - low_prices
    r2 = pp + (high_prices - low_prices)
    r3 = high_prices + 2 * (pp - low_prices)
    r4 = r3 + (high_prices - low_prices)
    
    # Support/Resistance Channels
    bc = low_prices * 0.95  # Bottom Channel
    tc = high_prices * 1.05  # Top Channel
    
    # Fibonacci Extensions
    fe_23_6 = close_prices * 1.236
    fe_38_2 = close_prices * 1.382
    fe_50 = close_prices * 1.5
    fe_61_8 = close_prices * 1.618
    
    # VWAP calculations (simplified)
    vwap_weekly = pd.Series(close_prices).rolling(window=5, min_periods=1).mean()
    vwap_monthly = pd.Series(close_prices).rolling(window=21, min_periods=1).mean()
    vwap_quarterly = pd.Series(close_prices).rolling(window=63, min_periods=1).mean()
    vwap_yearly = pd.Series(close_prices).rolling(window=252, min_periods=1).mean()
    
    # EMAs
    ema_63 = pd.Series(close_prices).ewm(span=63, adjust=False).mean()
    ema_144 = pd.Series(close_prices).ewm(span=144, adjust=False).mean()
    ema_234 = pd.Series(close_prices).ewm(span=234, adjust=False).mean()
    
    # Crossover signals
    def calculate_crossover_signals(fast_ema, slow_ema):
        bull_signals = [0]  # First element always 0
        bear_signals = [0]  # First element always 0
        
        for i in range(1, len(fast_ema)):
            if i < len(fast_ema) and i < len(slow_ema):
                # Bullish crossover: fast EMA crosses above slow EMA
                if fast_ema[i] > slow_ema[i] and fast_ema[i-1] <= slow_ema[i-1]:
                    bull_signals.append(1)
                    bear_signals.append(0)
                # Bearish crossover: fast EMA crosses below slow EMA
                elif fast_ema[i] < slow_ema[i] and fast_ema[i-1] >= slow_ema[i-1]:
                    bull_signals.append(0)
                    bear_signals.append(1)
                else:
                    bull_signals.append(0)
                    bear_signals.append(0)
        
        return bull_signals, bear_signals
    
    # Calculate crossover signals for different EMA pairs
    bull_63_144, bear_63_144 = calculate_crossover_signals(ema_63.tolist(), ema_144.tolist())
    bull_144_234, bear_144_234 = calculate_crossover_signals(ema_144.tolist(), ema_234.tolist())
    bull_63_234, bear_63_234 = calculate_crossover_signals(ema_63.tolist(), ema_234.tolist())
    
    return {
        'ROLLING_MEDIAN': rolling_median.tolist(),
        'ROLLING_MODE': rolling_mode.tolist(),
        'PP': pp.tolist(),
        'S1': s1.tolist(), 'S2': s2.tolist(), 'S3': s3.tolist(), 'S4': s4.tolist(),
        'R1': r1.tolist(), 'R2': r2.tolist(), 'R3': r3.tolist(), 'R4': r4.tolist(),
        'FE_23_6': fe_23_6.tolist(), 'FE_38_2': fe_38_2.tolist(), 
        'FE_50': fe_50.tolist(), 'FE_61_8': fe_61_8.tolist(),
        'VWAP_W': vwap_weekly.tolist(), 'VWAP_M': vwap_monthly.tolist(),
        'VWAP_Q': vwap_quarterly.tolist(), 'VWAP_Y': vwap_yearly.tolist(),
        'EMA_63': ema_63.tolist(), 'EMA_144': ema_144.tolist(), 'EMA_234': ema_234.tolist(),
        'BC': bc.tolist(), 'TC': tc.tolist(),
        # EMA Crossover Signals
        'BullCross_63_144': bull_63_144,
        'BearCross_63_144': bear_63_144,
        'BullCross_144_234': bull_144_234,
        'BearCross_144_234': bear_144_234,
        'BullCross_63_234': bull_63_234,
        'BearCross_63_234': bear_63_234
    }

@app.get("/")
async def read_root():
    return {"message": "Stock Data API - Production Fixed - NO LIMITS", "records": "2,527,425", "symbols": "3,621", "indicators": "20+"}

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
        
        print(f"[OK] Loaded {len(symbols)} symbols from database")
        return symbols
        
    except Exception as e:
        print(f"Error loading symbols: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to load symbols: {str(e)}")

@app.get("/stock_data/{symbol}")
async def get_stock_data(
    symbol: str,
    start_date: str = None,
    end_date: str = None,
    frequency: str = "Daily"
):
    """
    Returns ALL stock data for a symbol - NO LIMITS OR SAMPLING
    """
    try:
        connection = get_db_connection()
        if not connection:
            raise HTTPException(status_code=500, detail="Database connection failed")
        
        cursor = connection.cursor(dictionary=True)
        
        # Build SQL query WITHOUT ANY LIMITS
        base_query = """
        SELECT id, timestamp, symbol, close_price, 
               open_price, high_price, low_price, volume
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
        
        base_query += " ORDER BY timestamp ASC"
        # NO LIMIT CLAUSE - FETCH ALL DATA
        
        print(f"[PRODUCTION FIX] Loading ALL data for {symbol} - NO LIMITS")
        cursor.execute(base_query, params)
        rows = cursor.fetchall()
        
        cursor.close()
        connection.close()
        
        if not rows:
            raise HTTPException(status_code=404, detail=f"No data found for symbol {symbol}")
        
        print(f"[PRODUCTION FIX] Found {len(rows)} records for {symbol}")
        
        # Convert to DataFrame for technical indicator calculations
        df = pd.DataFrame(rows)
        
        # Calculate all technical indicators
        tech_indicators = calculate_technical_indicators(df)
        
        # Prepare final records with all fields
        final_records = []
        for i, row in enumerate(rows):
            record = {
                'TIMESTAMP': row['timestamp'].isoformat(),
                'SYMBOL': row['symbol'],
                'CLOSE_PRICE': float(row['close_price']) if row['close_price'] else 0,
                'OPEN_PRICE': float(row['open_price']) if row['open_price'] else 0,
                'HIGH_PRICE': float(row['high_price']) if row['high_price'] else 0,
                'LOW_PRICE': float(row['low_price']) if row['low_price'] else 0,
                'VOLUME': int(row['volume']) if row['volume'] else 0,
            }
            
            # Add technical indicators
            for indicator_name, indicator_values in tech_indicators.items():
                if i < len(indicator_values):
                    record[indicator_name] = indicator_values[i] if indicator_values[i] is not None else 0
                else:
                    record[indicator_name] = 0
            
            final_records.append(record)
        
        print(f"[PRODUCTION FIX] Returning {len(final_records)} complete records for {symbol} with all technical indicators")
        return final_records
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error loading stock data for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to load data for {symbol}: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)