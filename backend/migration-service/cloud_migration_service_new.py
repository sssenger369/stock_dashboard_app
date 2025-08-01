#!/usr/bin/env python3
"""
Cloud Run Migration Service - Recovery from Ransomware Attack
Migrates parquet data to new secure Cloud SQL instance
"""

from fastapi import FastAPI, HTTPException
import pandas as pd
import mysql.connector
from mysql.connector import Error
import os
from google.cloud import storage
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Stock Data Migration Service - Secure Recovery")

# New secure database configuration
DB_CONFIG = {
    'unix_socket': '/cloudsql/triple-student-465020-g0:us-central1:stock-data-new',
    'database': 'stockdata',
    'user': 'stockuser',
    'password': 'Vascodigama@113',
    'connection_timeout': 300,
    'autocommit': True
}

# GCS configuration
BUCKET_NAME = 'stock-data-sss-2024'
PARQUET_FILE = 'Final_Data.parquet'

@app.get("/")
async def root():
    return {
        "service": "Stock Data Migration Service",
        "purpose": "Recovery from ransomware attack",
        "target": "stock-data-new (secure instance)",
        "source": f"gs://{BUCKET_NAME}/{PARQUET_FILE}",
        "status": "Ready for migration"
    }

@app.post("/migrate")
async def migrate_data():
    """Migrate parquet data to new secure Cloud SQL instance"""
    try:
        logger.info("🚀 Starting secure migration process...")
        
        # Step 1: Download parquet file from GCS
        logger.info("📥 Downloading parquet file from GCS...")
        client = storage.Client()
        bucket = client.bucket(BUCKET_NAME)
        blob = bucket.blob(PARQUET_FILE)
        
        # Download to memory or temp file
        parquet_data = blob.download_as_bytes()
        logger.info(f"✅ Downloaded {len(parquet_data)} bytes")
        
        # Step 2: Read parquet data
        logger.info("📊 Reading parquet data...")
        df = pd.read_parquet(pd.io.common.BytesIO(parquet_data))
        
        logger.info(f"📈 Data shape: {df.shape}")
        logger.info(f"🏷️ Columns: {list(df.columns)}")
        logger.info(f"🔢 Total records: {len(df):,}")
        
        if 'SYMBOL' in df.columns:
            unique_symbols = df['SYMBOL'].nunique()
            logger.info(f"📋 Unique symbols: {unique_symbols:,}")
        
        # Step 3: Create table
        logger.info("🏗️ Creating stock_data table...")
        connection = mysql.connector.connect(**DB_CONFIG)
        cursor = connection.cursor()
        
        # Drop existing table
        cursor.execute("DROP TABLE IF EXISTS stock_data")
        
        # Create new table
        create_table_sql = """
        CREATE TABLE stock_data (
            id INT AUTO_INCREMENT PRIMARY KEY,
            timestamp DATETIME,
            symbol VARCHAR(50),
            close_price DECIMAL(15,4),
            open_price DECIMAL(15,4),
            high_price DECIMAL(15,4),
            low_price DECIMAL(15,4),
            volume BIGINT,
            turnover_lacs DECIMAL(15,4),
            no_of_trades INT,
            deliv_qty BIGINT,
            deliv_per DECIMAL(5,2),
            
            INDEX idx_symbol (symbol),
            INDEX idx_timestamp (timestamp),
            INDEX idx_symbol_timestamp (symbol, timestamp)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        """
        
        cursor.execute(create_table_sql)
        connection.commit()
        logger.info("✅ Table created successfully")
        
        # Step 4: Insert data in batches
        logger.info("📊 Starting data insertion...")
        batch_size = 1000
        total_inserted = 0
        
        for i in range(0, len(df), batch_size):
            batch = df.iloc[i:i+batch_size]
            
            # Prepare batch insert
            insert_sql = """
            INSERT INTO stock_data (
                timestamp, symbol, close_price, open_price, high_price,
                low_price, volume, turnover_lacs, no_of_trades, deliv_qty, deliv_per
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            
            batch_data = []
            for _, row in batch.iterrows():
                values = (
                    row.get('TIMESTAMP'),
                    row.get('SYMBOL'),
                    row.get('CLOSE_PRICE'),
                    row.get('OPEN_PRICE'),
                    row.get('HIGH_PRICE'),
                    row.get('LOW_PRICE'),
                    row.get('VOLUME'),
                    row.get('TURNOVER_LACS'),
                    row.get('NO_OF_TRADES'),
                    row.get('DELIV_QTY'),
                    row.get('DELIV_PER')
                )
                batch_data.append(values)
            
            # Execute batch insert
            cursor.executemany(insert_sql, batch_data)
            connection.commit()
            
            total_inserted += len(batch_data)
            logger.info(f"⏳ Inserted {total_inserted:,} records...")
        
        # Step 5: Verify data
        cursor.execute("SELECT COUNT(*) FROM stock_data")
        total_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(DISTINCT symbol) FROM stock_data")
        symbol_count = cursor.fetchone()[0]
        
        cursor.close()
        connection.close()
        
        logger.info("🎉 Migration completed successfully!")
        
        return {
            "status": "success",
            "message": "Data migration completed successfully",
            "total_records": total_count,
            "unique_symbols": symbol_count,
            "target_database": "stock-data-new (secure)",
            "recovery_status": "Ransomware recovery successful"
        }
        
    except Exception as e:
        logger.error(f"❌ Migration failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Migration failed: {str(e)}")

@app.get("/status")
async def check_status():
    """Check migration status and database connectivity"""
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        cursor = connection.cursor()
        
        cursor.execute("SELECT COUNT(*) FROM stock_data")
        total_records = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(DISTINCT symbol) FROM stock_data")
        unique_symbols = cursor.fetchone()[0]
        
        cursor.close()
        connection.close()
        
        return {
            "database_status": "connected",
            "total_records": total_records,
            "unique_symbols": unique_symbols,
            "instance": "stock-data-new (secure)"
        }
        
    except Exception as e:
        return {
            "database_status": "error",
            "error": str(e),
            "instance": "stock-data-new"
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)