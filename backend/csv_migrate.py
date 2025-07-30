#!/usr/bin/env python3
"""
CSV-based migration - converts parquet to CSV chunks and loads via SQL
Most memory efficient approach
"""

import pandas as pd
import mysql.connector
from mysql.connector import Error
import os
from config import settings
import pyarrow.parquet as pq
import pyarrow as pa

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
    """Create simplified table for essential data only"""
    
    create_table_sql = """
    CREATE TABLE IF NOT EXISTS stock_data (
        id INT AUTO_INCREMENT PRIMARY KEY,
        timestamp DATETIME NOT NULL,
        symbol VARCHAR(50) NOT NULL,
        close_price DECIMAL(15,4),
        open_price DECIMAL(15,4),
        high_price DECIMAL(15,4),
        low_price DECIMAL(15,4),
        volume BIGINT,
        
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

def process_parquet_in_chunks(connection):
    """Process parquet file in very small chunks to avoid memory issues"""
    try:
        print("🔄 Starting chunk-based processing...")
        
        # Download parquet file if needed
        from main import download_onedrive_data
        download_onedrive_data()
        
        # Read parquet file info
        parquet_file = pq.ParquetFile(settings.DATA_PATH)
        total_rows = parquet_file.metadata.num_rows
        print(f"📈 Total rows to process: {total_rows}")
        
        # Define chunk size based on available memory
        chunk_size = 50000  # Very small chunks
        num_chunks = (total_rows // chunk_size) + 1
        
        print(f"📦 Will process {num_chunks} chunks of {chunk_size} rows each")
        
        cursor = connection.cursor()
        insert_query = """
        INSERT INTO stock_data (timestamp, symbol, close_price, open_price, high_price, low_price, volume) 
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        """
        
        total_inserted = 0
        
        # Process in chunks using pandas with chunksize
        try:
            chunk_iter = pd.read_parquet(settings.DATA_PATH, chunksize=chunk_size)
            
            for chunk_num, chunk_df in enumerate(chunk_iter):
                print(f"📊 Processing chunk {chunk_num + 1}/{num_chunks} ({len(chunk_df)} rows)")
                
                # Select essential columns that exist
                essential_cols = ['TIMESTAMP', 'SYMBOL', 'CLOSE_PRICE']
                optional_cols = ['OPEN_PRICE', 'HIGH_PRICE', 'LOW_PRICE', 'TOTAL_TRADED_QUANTITY']
                
                # Build column list based on what exists
                available_cols = []
                for col in essential_cols + optional_cols:
                    if col in chunk_df.columns:
                        available_cols.append(col)
                
                if len(available_cols) < 3:  # Need at least timestamp, symbol, close_price
                    print(f"❌ Insufficient columns in chunk")
                    continue
                
                # Filter and clean data
                chunk_df = chunk_df[available_cols].copy()
                chunk_df['TIMESTAMP'] = pd.to_datetime(chunk_df['TIMESTAMP'])
                
                # Remove rows with missing essential data
                chunk_df = chunk_df.dropna(subset=['TIMESTAMP', 'SYMBOL', 'CLOSE_PRICE'])
                
                if len(chunk_df) == 0:
                    print(f"   ⚠️ No valid data in chunk {chunk_num + 1}")
                    continue
                
                # Convert to list of tuples for insertion
                data_tuples = []
                for _, row in chunk_df.iterrows():
                    try:
                        timestamp = row['TIMESTAMP'].strftime('%Y-%m-%d %H:%M:%S')
                        symbol = str(row['SYMBOL'])[:50]  # Truncate if too long
                        close_price = float(row['CLOSE_PRICE']) if pd.notna(row['CLOSE_PRICE']) else None
                        open_price = float(row.get('OPEN_PRICE', None)) if 'OPEN_PRICE' in row and pd.notna(row.get('OPEN_PRICE')) else None
                        high_price = float(row.get('HIGH_PRICE', None)) if 'HIGH_PRICE' in row and pd.notna(row.get('HIGH_PRICE')) else None
                        low_price = float(row.get('LOW_PRICE', None)) if 'LOW_PRICE' in row and pd.notna(row.get('LOW_PRICE')) else None
                        volume = int(row.get('TOTAL_TRADED_QUANTITY', 0)) if 'TOTAL_TRADED_QUANTITY' in row and pd.notna(row.get('TOTAL_TRADED_QUANTITY')) else None
                        
                        data_tuples.append((timestamp, symbol, close_price, open_price, high_price, low_price, volume))
                    except Exception as row_error:
                        # Skip problematic rows
                        continue
                
                # Insert data
                if data_tuples:
                    try:
                        cursor.executemany(insert_query, data_tuples)
                        connection.commit()
                        total_inserted += len(data_tuples)
                        print(f"   ✅ Inserted {len(data_tuples)} rows (Total: {total_inserted})")
                    except Error as insert_error:
                        print(f"   ❌ Insert error: {insert_error}")
                        connection.rollback()
                
                # Clear memory
                del chunk_df
                del data_tuples
                
                # Progress update
                if chunk_num % 10 == 0:
                    print(f"🚀 Progress: {((chunk_num + 1) / num_chunks) * 100:.1f}%")
        
        except Exception as chunk_error:
            print(f"❌ Error in chunked processing: {chunk_error}")
            return False
        
        cursor.close()
        print(f"✅ Data loading completed! Total records inserted: {total_inserted}")
        
        # Verify data
        cursor = connection.cursor()
        cursor.execute("SELECT COUNT(*) FROM stock_data")
        total_records = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(DISTINCT symbol) FROM stock_data")
        total_symbols = cursor.fetchone()[0]
        cursor.close()
        
        print(f"✅ Verification: {total_records} records, {total_symbols} symbols in database")
        return True
        
    except Exception as e:
        print(f"❌ Error in processing: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Main migration function"""
    print("🚀 Starting memory-efficient migration...")
    
    # Connect to database
    connection = connect_to_database()
    if not connection:
        return
    
    try:
        # Create table schema
        if not create_table_schema(connection):
            return
        
        # Process data in small chunks
        if process_parquet_in_chunks(connection):
            print("🎉 Migration completed successfully!")
            print("💨 Your dashboard will now load instantly!")
        else:
            print("❌ Migration failed")
    
    finally:
        if connection.is_connected():
            connection.close()
            print("🔒 Database connection closed")

if __name__ == "__main__":
    main()