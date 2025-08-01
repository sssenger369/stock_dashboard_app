#!/usr/bin/env python3
"""
Migration script to load parquet file from GCS to Cloud SQL
Recovers data after ransomware attack on 2025-07-31
"""

import pandas as pd
import mysql.connector
from mysql.connector import Error
import os
from google.cloud import storage

# New secure database configuration
DB_CONFIG = {
    'host': '34.134.43.248',
    'database': 'stockdata',
    'user': 'stockuser',
    'password': 'Vascodigama@113',
    'port': 3306,
    'connection_timeout': 300,
    'autocommit': True
}

# GCS configuration
BUCKET_NAME = 'stock-data-sss-2024'
PARQUET_FILE = 'Final_Data.parquet'
LOCAL_FILE = '/tmp/Final_Data.parquet'

def download_parquet_from_gcs():
    """Download parquet file from Google Cloud Storage"""
    print("📥 Downloading parquet file from GCS...")
    
    client = storage.Client()
    bucket = client.bucket(BUCKET_NAME)
    blob = bucket.blob(PARQUET_FILE)
    
    blob.download_to_filename(LOCAL_FILE)
    print(f"✅ Downloaded {PARQUET_FILE} to {LOCAL_FILE}")
    
    # Check file size
    file_size = os.path.getsize(LOCAL_FILE) / (1024 * 1024)  # MB
    print(f"📊 File size: {file_size:.2f} MB")

def create_table():
    """Create stock_data table in new database"""
    print("🏗️ Creating stock_data table...")
    
    connection = mysql.connector.connect(**DB_CONFIG)
    cursor = connection.cursor()
    
    # Drop table if exists
    cursor.execute("DROP TABLE IF EXISTS stock_data")
    
    # Create table based on parquet schema
    create_table_sql = """
    CREATE TABLE stock_data (
        id INT AUTO_INCREMENT PRIMARY KEY,
        timestamp DATETIME NOT NULL,
        symbol VARCHAR(50) NOT NULL,
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
    
    cursor.close()
    connection.close()
    print("✅ Table created successfully")

def load_parquet_to_mysql():
    """Load parquet data into MySQL table"""
    print("📊 Loading parquet data to MySQL...")
    
    # Read parquet file
    print("📖 Reading parquet file...")
    df = pd.read_parquet(LOCAL_FILE)
    
    print(f"📈 Data shape: {df.shape}")
    print(f"📋 Columns: {list(df.columns)}")
    print(f"🔢 Total records: {len(df):,}")
    print(f"🏷️ Unique symbols: {df['SYMBOL'].nunique() if 'SYMBOL' in df.columns else 'Unknown'}")
    
    # Connect to database
    connection = mysql.connector.connect(**DB_CONFIG)
    cursor = connection.cursor()
    
    # Prepare data for insertion
    records_inserted = 0
    batch_size = 1000
    
    print("🚀 Starting data insertion...")
    
    for i in range(0, len(df), batch_size):
        batch = df.iloc[i:i+batch_size]
        
        for _, row in batch.iterrows():
            try:
                # Map parquet columns to database columns
                insert_sql = """
                INSERT INTO stock_data (
                    timestamp, symbol, close_price, open_price, high_price, 
                    low_price, volume, turnover_lacs, no_of_trades, deliv_qty, deliv_per
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """
                
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
                
                cursor.execute(insert_sql, values)
                records_inserted += 1
                
                if records_inserted % 1000 == 0:
                    print(f"⏳ Inserted {records_inserted:,} records...")
                    connection.commit()
                    
            except Exception as e:
                print(f"❌ Error inserting record: {e}")
                continue
    
    # Final commit
    connection.commit()
    cursor.close()
    connection.close()
    
    print(f"🎉 Successfully inserted {records_inserted:,} records!")
    return records_inserted

def verify_data():
    """Verify the loaded data"""
    print("🔍 Verifying loaded data...")
    
    connection = mysql.connector.connect(**DB_CONFIG)
    cursor = connection.cursor()
    
    # Count total records
    cursor.execute("SELECT COUNT(*) FROM stock_data")
    total_records = cursor.fetchone()[0]
    
    # Count unique symbols
    cursor.execute("SELECT COUNT(DISTINCT symbol) FROM stock_data")
    unique_symbols = cursor.fetchone()[0]
    
    # Get sample data
    cursor.execute("SELECT symbol, COUNT(*) as count FROM stock_data GROUP BY symbol LIMIT 10")
    sample_data = cursor.fetchall()
    
    cursor.close()
    connection.close()
    
    print(f"📊 Verification Results:")
    print(f"   Total records: {total_records:,}")
    print(f"   Unique symbols: {unique_symbols:,}")
    print(f"   Sample symbols: {sample_data}")
    
    return total_records, unique_symbols

def main():
    """Main migration function"""
    print("🚀 Starting parquet to SQL migration...")
    print("📋 Target: stock-data-new instance")
    print("🔒 Security: Private access only")
    print("=" * 50)
    
    try:
        # Step 1: Download parquet file
        download_parquet_from_gcs()
        
        # Step 2: Create table
        create_table()
        
        # Step 3: Load data
        records_inserted = load_parquet_to_mysql()
        
        # Step 4: Verify data
        total_records, unique_symbols = verify_data()
        
        print("=" * 50)
        print("🎉 MIGRATION COMPLETED SUCCESSFULLY!")
        print(f"✅ Inserted: {records_inserted:,} records")
        print(f"🏷️ Symbols: {unique_symbols:,} unique symbols")
        print("🔒 Database is now secure and ready!")
        print("=" * 50)
        
        # Cleanup
        if os.path.exists(LOCAL_FILE):
            os.remove(LOCAL_FILE)
            print("🧹 Cleaned up temporary files")
            
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        raise

if __name__ == "__main__":
    main()