#!/usr/bin/env python3
"""
Streaming migration script - reads parquet file in chunks to avoid memory issues
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
    """Create the stock_data table with proper schema"""
    
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
        cursor.execute("DROP TABLE IF EXISTS stock_data;")  # Fresh start
        cursor.execute(create_table_sql)
        connection.commit()
        cursor.close()
        print("✅ Table schema created successfully")
        return True
    except Error as e:
        print(f"❌ Error creating table: {e}")
        return False

def load_parquet_streaming(connection):
    """Load data from parquet file using streaming approach"""
    try:
        print("🔄 Starting streaming data load...")
        
        # Download parquet file if needed
        from main import download_onedrive_data
        download_onedrive_data()
        
        # Use pyarrow for streaming read
        print("📊 Opening parquet file for streaming...")
        parquet_file = pq.ParquetFile(settings.DATA_PATH)
        
        print(f"📈 Total rows in file: {parquet_file.metadata.num_rows}")
        print(f"🏢 Number of row groups: {parquet_file.num_row_groups}")
        
        cursor = connection.cursor()
        
        # Simple insert query for just essential columns
        insert_query = """
        INSERT INTO stock_data (timestamp, symbol, close_price) 
        VALUES (%s, %s, %s)
        """
        
        total_inserted = 0
        
        # Read in row groups (chunks)
        for i in range(parquet_file.num_row_groups):
            print(f"📦 Processing row group {i+1}/{parquet_file.num_row_groups}")
            
            # Read one row group
            row_group = parquet_file.read_row_group(i)
            df = row_group.to_pandas()
            
            print(f"   📊 Row group size: {len(df)} records")
            
            # Filter to essential columns only
            if 'TIMESTAMP' in df.columns and 'SYMBOL' in df.columns and 'CLOSE_PRICE' in df.columns:
                df = df[['TIMESTAMP', 'SYMBOL', 'CLOSE_PRICE']]
                df['TIMESTAMP'] = pd.to_datetime(df['TIMESTAMP'])
                
                # Insert in smaller batches
                batch_size = 500
                for j in range(0, len(df), batch_size):
                    batch = df.iloc[j:j+batch_size]
                    
                    # Convert to list of tuples
                    data_tuples = []
                    for _, row in batch.iterrows():
                        timestamp = row['TIMESTAMP'].strftime('%Y-%m-%d %H:%M:%S') if pd.notna(row['TIMESTAMP']) else None
                        symbol = row['SYMBOL'] if pd.notna(row['SYMBOL']) else None
                        close_price = float(row['CLOSE_PRICE']) if pd.notna(row['CLOSE_PRICE']) else None
                        
                        if timestamp and symbol and close_price:
                            data_tuples.append((timestamp, symbol, close_price))
                    
                    if data_tuples:
                        cursor.executemany(insert_query, data_tuples)
                        connection.commit()
                        total_inserted += len(data_tuples)
                        
                        if total_inserted % 10000 == 0:
                            print(f"   ⏳ Inserted {total_inserted} rows so far...")
            
            # Clear memory
            del df
            del row_group
            
            print(f"   ✅ Completed row group {i+1}, total inserted: {total_inserted}")
        
        cursor.close()
        print(f"✅ Data loading completed! Total records: {total_inserted}")
        
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
        print(f"❌ Error loading data: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Main migration function"""
    print("🚀 Starting streaming stock data migration...")
    
    # Connect to database
    connection = connect_to_database()
    if not connection:
        return
    
    try:
        # Create simple table schema
        if not create_table_schema(connection):
            return
        
        # Load parquet data using streaming
        if load_parquet_streaming(connection):
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