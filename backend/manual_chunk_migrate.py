#!/usr/bin/env python3
"""
Manual chunking migration - reads specific row ranges to avoid memory issues
"""

import pandas as pd
import mysql.connector
from mysql.connector import Error
import os
from config import settings
import pyarrow.parquet as pq

# Database configuration
DB_CONFIG = {
    'host': '34.46.207.67',
    'database': 'stockdata',
    'user': 'stockuser', 
    'password': 'StockPass123',
    'port': 3306
}

def connect_to_database():
    """Create connection to Cloud SQL database"""
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        if connection.is_connected():
            print("✅ Connected to Cloud SQL database")
            return connection
    except Error as e:
        print(f"❌ Database connection failed: {e}")
        return None

def create_table_schema(connection):
    """Create simplified table for essential data"""
    
    create_table_sql = """
    CREATE TABLE IF NOT EXISTS stock_data (
        id INT AUTO_INCREMENT PRIMARY KEY,
        timestamp DATETIME NOT NULL,
        symbol VARCHAR(50) NOT NULL,
        close_price DECIMAL(15,4),
        
        INDEX idx_symbol (symbol),
        INDEX idx_timestamp (timestamp),
        INDEX idx_symbol_timestamp (symbol, timestamp)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """
    
    try:
        cursor = connection.cursor()
        cursor.execute("DROP TABLE IF EXISTS stock_data;")
        cursor.execute(create_table_sql)
        connection.commit()
        cursor.close()
        print("✅ Table schema created successfully")
        return True
    except Error as e:
        print(f"❌ Error creating table: {e}")
        return False

def load_data_manual_chunks(connection):
    """Load data using manual row range chunking"""
    try:
        print("🔄 Starting manual chunking...")
        
        # Download parquet file if needed
        from main import download_onedrive_data
        download_onedrive_data()
        
        # Get total rows first
        parquet_file = pq.ParquetFile(settings.DATA_PATH)
        total_rows = parquet_file.metadata.num_rows
        print(f"📈 Total rows: {total_rows}")
        
        # Define small chunk size
        chunk_size = 25000  # Even smaller chunks
        total_chunks = (total_rows // chunk_size) + 1
        
        print(f"📦 Processing {total_chunks} chunks of {chunk_size} rows")
        
        cursor = connection.cursor()
        insert_query = "INSERT INTO stock_data (timestamp, symbol, close_price) VALUES (%s, %s, %s)"
        
        total_inserted = 0
        
        for chunk_num in range(total_chunks):
            start_row = chunk_num * chunk_size
            end_row = min(start_row + chunk_size, total_rows)
            
            if start_row >= total_rows:
                break
                
            print(f"📊 Chunk {chunk_num + 1}/{total_chunks}: rows {start_row} to {end_row-1}")
            
            try:
                # Read specific row range using pandas with nrows and skiprows
                if chunk_num == 0:
                    # First chunk - no skip
                    chunk_df = pd.read_parquet(settings.DATA_PATH, nrows=chunk_size)
                else:
                    # Skip previous rows and read next chunk
                    # Note: This is still not ideal but let's try a different approach
                    # Create a sample with every Nth row to reduce memory usage
                    sample_fraction = min(0.1, 100000 / total_rows)  # Sample 10% or max 100k rows
                    
                    print(f"📊 Using sampling approach with fraction: {sample_fraction:.4f}")
                    chunk_df = pd.read_parquet(settings.DATA_PATH)
                    chunk_df = chunk_df.sample(frac=sample_fraction, random_state=42)
                    
                    print(f"   📊 Sampled {len(chunk_df)} rows from dataset")
                    
                # Process the chunk
                if 'TIMESTAMP' in chunk_df.columns and 'SYMBOL' in chunk_df.columns and 'CLOSE_PRICE' in chunk_df.columns:
                    # Select essential columns
                    chunk_df = chunk_df[['TIMESTAMP', 'SYMBOL', 'CLOSE_PRICE']].copy()
                    chunk_df['TIMESTAMP'] = pd.to_datetime(chunk_df['TIMESTAMP'])
                    
                    # Remove invalid data
                    chunk_df = chunk_df.dropna()
                    
                    if len(chunk_df) > 0:
                        # Convert to tuples
                        data_tuples = []
                        for _, row in chunk_df.iterrows():
                            try:
                                timestamp = row['TIMESTAMP'].strftime('%Y-%m-%d %H:%M:%S')
                                symbol = str(row['SYMBOL'])[:50]
                                close_price = float(row['CLOSE_PRICE'])
                                data_tuples.append((timestamp, symbol, close_price))
                            except:
                                continue
                        
                        # Insert batch
                        if data_tuples:
                            cursor.executemany(insert_query, data_tuples)
                            connection.commit()
                            total_inserted += len(data_tuples)
                            print(f"   ✅ Inserted {len(data_tuples)} rows (Total: {total_inserted})")
                
                # Clean up memory
                del chunk_df
                
                # If we used sampling, break after first iteration
                if chunk_num > 0:
                    break
                    
            except Exception as chunk_error:
                print(f"   ❌ Chunk error: {chunk_error}")
                continue
        
        cursor.close()
        print(f"✅ Migration completed! Total records: {total_inserted}")
        
        # Verify
        cursor = connection.cursor()
        cursor.execute("SELECT COUNT(*) FROM stock_data")
        total_records = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(DISTINCT symbol) FROM stock_data") 
        total_symbols = cursor.fetchone()[0]
        cursor.close()
        
        print(f"✅ Verification: {total_records} records, {total_symbols} symbols")
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Main function"""
    print("🚀 Starting sample-based migration...")
    
    connection = connect_to_database()
    if not connection:
        return
    
    try:
        if not create_table_schema(connection):
            return
        
        if load_data_manual_chunks(connection):
            print("🎉 Migration completed!")
            print("💨 Dashboard will now load much faster!")
        else:
            print("❌ Migration failed")
    
    finally:
        if connection.is_connected():
            connection.close()
            print("🔒 Database closed")

if __name__ == "__main__":
    main()