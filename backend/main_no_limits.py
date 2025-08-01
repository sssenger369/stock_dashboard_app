from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import mysql.connector
from mysql.connector import Error
import pandas as pd
from datetime import date
import numpy as np

app = FastAPI(
    title="Stock Dashboard API - NO LIMITS",
    description="FastAPI backend with all technical indicators - UNLIMITED DATA",
    version="5.0.0"
)

# CORS Configuration - Allow all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
    """Calculate all technical indicators from OHLC data"""
    if df.empty:
        return {}
    
    # Convert to pandas series for calculations
    close = pd.Series([float(x) if x else 0 for x in df['close_price']])
    high = pd.Series([float(x) if x else 0 for x in df.get('high_price', df['close_price'])])
    low = pd.Series([float(x) if x else 0 for x in df.get('low_price', df['close_price'])])
    open_price = pd.Series([float(x) if x else 0 for x in df.get('open_price', df['close_price'])])
    
    n = len(close)
    
    # Rolling indicators
    rolling_median = close.rolling(window=20, min_periods=1).median()
    rolling_mode = close.rolling(window=20, min_periods=1).apply(lambda x: x.mode().iloc[0] if not x.mode().empty else x.iloc[-1])
    
    # Pivot Points
    pp = (high + low + close) / 3
    s1 = 2 * pp - high
    s2 = pp - (high - low)
    s3 = low - 2 * (high - pp)
    s4 = s3 - (high - low)
    r1 = 2 * pp - low
    r2 = pp + (high - low)
    r3 = high + 2 * (pp - low)
    r4 = r3 + (high - low)
    
    # Fibonacci Extensions
    fe_23_6 = close * 1.236
    fe_38_2 = close * 1.382 
    fe_50 = close * 1.5
    fe_61_8 = close * 1.618
    
    # VWAP approximations
    vwap_w = close.rolling(window=5, min_periods=1).mean()
    vwap_m = close.rolling(window=21, min_periods=1).mean()
    vwap_q = close.rolling(window=63, min_periods=1).mean()
    vwap_y = close.rolling(window=252, min_periods=1).mean()
    
    # EMAs
    ema_63 = close.ewm(span=63, adjust=False).mean()
    ema_144 = close.ewm(span=144, adjust=False).mean()
    ema_234 = close.ewm(span=234, adjust=False).mean()
    
    # Support/Resistance channels
    bc = low * 0.95
    tc = high * 1.05
    
    # EMA Crossover signals
    def get_crossover_signals(fast, slow):
        bull_cross = np.zeros(n)
        bear_cross = np.zeros(n)
        
        for i in range(1, n):
            if fast.iloc[i] > slow.iloc[i] and fast.iloc[i-1] <= slow.iloc[i-1]:
                bull_cross[i] = 1
            elif fast.iloc[i] < slow.iloc[i] and fast.iloc[i-1] >= slow.iloc[i-1]:
                bear_cross[i] = 1
                
        return bull_cross.tolist(), bear_cross.tolist()
    
    bull_63_144, bear_63_144 = get_crossover_signals(ema_63, ema_144)
    bull_144_234, bear_144_234 = get_crossover_signals(ema_144, ema_234)
    bull_63_234, bear_63_234 = get_crossover_signals(ema_63, ema_234)
    
    return {
        'ROLLING_MEDIAN': rolling_median.fillna(0).tolist(),
        'ROLLING_MODE': rolling_mode.fillna(0).tolist(),
        'PP': pp.fillna(0).tolist(),
        'S1': s1.fillna(0).tolist(), 'S2': s2.fillna(0).tolist(), 'S3': s3.fillna(0).tolist(), 'S4': s4.fillna(0).tolist(),
        'R1': r1.fillna(0).tolist(), 'R2': r2.fillna(0).tolist(), 'R3': r3.fillna(0).tolist(), 'R4': r4.fillna(0).tolist(),
        'FE_23_6': fe_23_6.fillna(0).tolist(), 'FE_38_2': fe_38_2.fillna(0).tolist(),
        'FE_50': fe_50.fillna(0).tolist(), 'FE_61_8': fe_61_8.fillna(0).tolist(),
        'VWAP_W': vwap_w.fillna(0).tolist(), 'VWAP_M': vwap_m.fillna(0).tolist(),
        'VWAP_Q': vwap_q.fillna(0).tolist(), 'VWAP_Y': vwap_y.fillna(0).tolist(),
        'EMA_63': ema_63.fillna(0).tolist(), 'EMA_144': ema_144.fillna(0).tolist(), 'EMA_234': ema_234.fillna(0).tolist(),
        'BC': bc.fillna(0).tolist(), 'TC': tc.fillna(0).tolist(),
        'BullCross_63_144': bull_63_144, 'BearCross_63_144': bear_63_144,
        'BullCross_144_234': bull_144_234, 'BearCross_144_234': bear_144_234,
        'BullCross_63_234': bull_63_234, 'BearCross_63_234': bear_63_234
    }

@app.get("/")
async def read_root():
    return {
        "message": "Stock Data API - NO LIMITS VERSION", 
        "records": "2,527,425", 
        "symbols": "3,621", 
        "status": "UNLIMITED DATA ACCESS"
    }

@app.get("/symbols")
async def get_symbols():
    """Returns all stock symbols - NO LIMITS"""
    try:
        connection = get_db_connection()
        if not connection:
            raise HTTPException(status_code=500, detail="Database connection failed")
        
        cursor = connection.cursor()
        # NO LIMIT - get all symbols
        cursor.execute("SELECT DISTINCT symbol FROM stock_data ORDER BY symbol")
        symbols = [row[0] for row in cursor.fetchall()]
        
        cursor.close()
        connection.close()
        
        print(f"[NO LIMITS] Loaded {len(symbols)} symbols")
        return symbols
        
    except Exception as e:
        print(f"Error loading symbols: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to load symbols: {str(e)}")

@app.get("/stock_data/{symbol}")
async def get_stock_data(symbol: str, start_date: str = None, end_date: str = None, frequency: str = "Daily"):
    """
    Returns ALL stock data for symbol - ABSOLUTELY NO LIMITS OR SAMPLING
    """
    try:
        connection = get_db_connection()
        if not connection:
            raise HTTPException(status_code=500, detail="Database connection failed")
        
        cursor = connection.cursor(dictionary=True)
        
        # Build query - NO LIMIT CLAUSE AT ALL
        query = """
        SELECT id, timestamp, symbol, close_price, 
               open_price, high_price, low_price, volume,
               turnover_lacs, no_of_trades, deliv_qty, deliv_per
        FROM stock_data 
        WHERE symbol = %s
        """
        
        params = [symbol]
        
        if start_date:
            query += " AND timestamp >= %s"
            params.append(start_date)
            
        if end_date:
            query += " AND timestamp <= %s"
            params.append(end_date)
        
        query += " ORDER BY timestamp ASC"
        # CRITICAL: NO LIMIT CLAUSE - FETCH EVERYTHING
        
        print(f"[NO LIMITS] Executing query for {symbol} - FETCHING ALL DATA")
        cursor.execute(query, params)
        rows = cursor.fetchall()
        
        cursor.close()
        connection.close()
        
        if not rows:
            raise HTTPException(status_code=404, detail=f"No data found for symbol {symbol}")
        
        print(f"[NO LIMITS] Raw database returned {len(rows)} records for {symbol}")
        
        # Convert to DataFrame for indicator calculations
        df = pd.DataFrame(rows)
        print(f"[NO LIMITS] DataFrame created with {len(df)} rows")
        
        # Calculate technical indicators
        tech_indicators = calculate_technical_indicators(df)
        print(f"[NO LIMITS] Technical indicators calculated")
        
        # Build final records with all data
        final_records = []
        for i, row in enumerate(rows):
            record = {
                'TIMESTAMP': row['timestamp'].isoformat() if row['timestamp'] else '',
                'SYMBOL': row['symbol'] or symbol,
                'CLOSE_PRICE': float(row['close_price']) if row['close_price'] else 0,
                'OPEN_PRICE': float(row['open_price']) if row['open_price'] else 0,
                'HIGH_PRICE': float(row['high_price']) if row['high_price'] else 0,
                'LOW_PRICE': float(row['low_price']) if row['low_price'] else 0,
                'VOLUME': int(row['volume']) if row['volume'] else 0,
                'TURNOVER_LACS': float(row['turnover_lacs']) if row['turnover_lacs'] else 0,
                'NO_OF_TRADES': int(row['no_of_trades']) if row['no_of_trades'] else 0,
                'DELIV_QTY': int(row['deliv_qty']) if row['deliv_qty'] else 0,
                'DELIV_PER': float(row['deliv_per']) if row['deliv_per'] else 0
            }
            
            # Add ALL technical indicators
            for indicator_name, indicator_values in tech_indicators.items():
                if i < len(indicator_values):
                    record[indicator_name] = indicator_values[i]
                else:
                    record[indicator_name] = 0
            
            final_records.append(record)
        
        print(f"[SUCCESS] Returning {len(final_records)} complete records for {symbol} with ALL technical indicators")
        return final_records
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to load data for {symbol}: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)