from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import mysql.connector
from mysql.connector import Error
from datetime import date

app = FastAPI(
    title="Stock Dashboard API - HONEST VERSION",
    description="FastAPI backend with ONLY real database data - NO fake indicators",
    version="4.0.0"
)

# --- CORS Configuration - ALLOW ALL LOCALHOST PORTS ---
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
        "https://stock-dashboard-93bsuyrcd-sanjay-singhs-projects-933bcc33.vercel.app",
        "*"  # Allow all for development
    ],
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
    return {
        "message": "Stock Data API - HONEST VERSION", 
        "records": "2,527,425", 
        "symbols": "3,621", 
        "real_fields": "4 (id, timestamp, symbol, close_price)",
        "fake_indicators": "REMOVED - Only real data returned"
    }

@app.get("/schema")
async def get_database_schema():
    """Returns actual database schema to check what fields exist"""
    try:
        connection = get_db_connection()
        if not connection:
            raise HTTPException(status_code=500, detail="Database connection failed")
        
        cursor = connection.cursor()
        cursor.execute("DESCRIBE stock_data")
        columns = cursor.fetchall()
        
        cursor.close()
        connection.close()
        
        column_info = []
        for col in columns:
            column_info.append({
                "field": col[0],
                "type": col[1],
                "null": col[2],
                "key": col[3],
                "default": col[4],
                "extra": col[5]
            })
        
        return {"table": "stock_data", "columns": column_info}
        
    except Exception as e:
        print(f"Error getting schema: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get schema: {str(e)}")

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
    frequency: str = "Daily",
    max_records: int = 5000,
    enable_sampling: bool = False
):
    """
    Returns ONLY real database data - NO artificial indicators
    """
    try:
        connection = get_db_connection()
        if not connection:
            raise HTTPException(status_code=500, detail="Database connection failed")
        
        cursor = connection.cursor(dictionary=True)
        
        # Build SQL query with date filters - SELECT ALL REAL COLUMNS
        base_query = """
        SELECT id, timestamp, symbol, close_price 
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
        if max_records and max_records > 0:
            base_query += f" LIMIT {max_records}"
        
        print(f"[HONEST API] Loading real data for {symbol} from database")
        cursor.execute(base_query, params)
        rows = cursor.fetchall()
        
        cursor.close()
        connection.close()
        
        if not rows:
            raise HTTPException(status_code=404, detail=f"No data found for symbol {symbol}")
        
        # Return only REAL database data - no fake calculations
        print(f"[HONEST API] Returning only real database data for {symbol}")
        
        honest_records = []
        for row in rows:
            if row['close_price']:
                record = {
                    'TIMESTAMP': row['timestamp'].isoformat(),
                    'SYMBOL': row['symbol'],
                    'CLOSE_PRICE': float(row['close_price']),
                    'ID': row['id']
                }
                honest_records.append(record)
        
        print(f"[OK] Returning {len(honest_records)} REAL records for {symbol} (NO fake data)")
        return honest_records
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error loading stock data: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to load data for {symbol}: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8009)