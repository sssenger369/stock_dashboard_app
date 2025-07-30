
#!/usr/bin/env python3
import pandas as pd
import mysql.connector
from mysql.connector import Error
import os
from config import settings
from fastapi import FastAPI
import uvicorn

app = FastAPI()

# Database configuration
DB_CONFIG = {
    'host': '34.46.207.67',
    'database': 'stockdata',
    'user': 'stockuser', 
    'password': 'StockPass123',
    'port': 3306
}

@app.get("/")
async def root():
    return {"message": "Migration service ready"}

@app.post("/migrate")
async def run_migration():
    '''Run the full data migration with 8GB memory'''
    try:
        print("🚀 Starting migration with high memory...")
        
        # Connect to MySQL
        connection = mysql.connector.connect(**DB_CONFIG)
        cursor = connection.cursor()
        
        # Create table
        create_table_sql = '''
        CREATE TABLE IF NOT EXISTS stock_data (
            id INT AUTO_INCREMENT PRIMARY KEY,
            timestamp DATETIME NOT NULL,
            symbol VARCHAR(50) NOT NULL,
            close_price DECIMAL(15,4),
            
            INDEX idx_symbol (symbol),
            INDEX idx_timestamp (timestamp),
            INDEX idx_symbol_timestamp (symbol, timestamp)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        '''
        
        cursor.execute("DROP TABLE IF EXISTS stock_data;")
        cursor.execute(create_table_sql)
        connection.commit()
        print("✅ Table created")
        
        # Download and process parquet file with high memory
        print("📊 Loading parquet file...")
        
        # Use requests to stream download
        import requests
        parquet_url = "https://storage.googleapis.com/stock-data-sss-2024/Final_Data.parquet"
        
        # Download to temp file
        response = requests.get(parquet_url, stream=True)
        with open("/tmp/data.parquet", "wb") as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        
        print("📊 Processing parquet file...")
        
        # Load parquet with pandas (we have 8GB memory now)
        df = pd.read_parquet("/tmp/data.parquet")
        print(f"📈 Loaded {len(df)} rows, {len(df.columns)} columns")
        
        # Filter to essential columns
        essential_cols = ['TIMESTAMP', 'SYMBOL', 'CLOSE_PRICE']
        available_cols = [col for col in essential_cols if col in df.columns]
        
        if len(available_cols) < 3:
            return {"error": f"Missing essential columns. Available: {list(df.columns)[:10]}"}
        
        df = df[available_cols].copy()
        df['TIMESTAMP'] = pd.to_datetime(df['TIMESTAMP'])
        df = df.dropna()
        
        print(f"📊 Cleaned data: {len(df)} rows")
        
        # Insert in chunks
        chunk_size = 10000
        total_inserted = 0
        
        insert_query = "INSERT INTO stock_data (timestamp, symbol, close_price) VALUES (%s, %s, %s)"
        
        for i in range(0, len(df), chunk_size):
            chunk = df.iloc[i:i+chunk_size]
            
            data_tuples = []
            for _, row in chunk.iterrows():
                timestamp = row['TIMESTAMP'].strftime('%Y-%m-%d %H:%M:%S')
                symbol = str(row['SYMBOL'])[:50]
                close_price = float(row['CLOSE_PRICE'])
                data_tuples.append((timestamp, symbol, close_price))
            
            cursor.executemany(insert_query, data_tuples)
            connection.commit()
            total_inserted += len(data_tuples)
            
            if total_inserted % 50000 == 0:
                print(f"⏳ Inserted {total_inserted} rows...")
        
        cursor.close()
        connection.close()
        
        # Clean up
        os.remove("/tmp/data.parquet")
        
        print(f"✅ Migration completed! {total_inserted} records")
        
        return {
            "status": "success",
            "records_inserted": total_inserted,
            "message": "Migration completed successfully!"
        }
        
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)
