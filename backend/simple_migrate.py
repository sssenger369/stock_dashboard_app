#!/usr/bin/env python3
"""
Simple migration script using basic MySQL connector
Avoids SQLAlchemy compatibility issues with Python 3.13
"""

import pandas as pd
import mysql.connector
from mysql.connector import Error
import os
from config import settings

# Database configuration
DB_CONFIG = {
    'host': '34.46.207.67',  # Your Cloud SQL public IP
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
        open_price DECIMAL(15,4),
        high_price DECIMAL(15,4),
        low_price DECIMAL(15,4),
        last_traded_price DECIMAL(15,4),
        total_traded_quantity BIGINT,
        total_traded_value DECIMAL(20,2),
        turnover DECIMAL(20,2),
        number_of_trades INT,
        rolling_median DECIMAL(15,4),
        rolling_mode DECIMAL(15,4),
        pp DECIMAL(15,4),
        s1 DECIMAL(15,4),
        s2 DECIMAL(15,4),
        s3 DECIMAL(15,4),
        s4 DECIMAL(15,4),
        r1 DECIMAL(15,4),
        r2 DECIMAL(15,4),
        r3 DECIMAL(15,4),
        r4 DECIMAL(15,4),
        fe_23_6 DECIMAL(15,4),
        fe_38_2 DECIMAL(15,4),
        fe_50 DECIMAL(15,4),
        fe_61_8 DECIMAL(15,4),
        vwap_weekly DECIMAL(15,4),
        vwap_monthly DECIMAL(15,4),
        vwap_quarterly DECIMAL(15,4),
        vwap_yearly DECIMAL(15,4),
        ema_63 DECIMAL(15,4),
        ema_144 DECIMAL(15,4),
        ema_234 DECIMAL(15,4),
        bc DECIMAL(15,4),
        tc DECIMAL(15,4),
        
        INDEX idx_symbol (symbol),
        INDEX idx_timestamp (timestamp),
        INDEX idx_symbol_timestamp (symbol, timestamp)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """
    
    try:
        cursor = connection.cursor()
        cursor.execute(create_table_sql)
        connection.commit()
        cursor.close()
        print("✅ Table schema created successfully")
        return True
    except Error as e:
        print(f"❌ Error creating table: {e}")
        return False

def load_parquet_data(connection):
    """Load data from parquet file to SQL database"""
    try:
        print("🔄 Loading parquet data...")
        
        # Download parquet file if needed
        from main import download_onedrive_data
        download_onedrive_data()
        
        # Read parquet file
        print("📊 Reading parquet file...")
        df = pd.read_parquet(settings.DATA_PATH)
        
        print(f"📈 Loaded {len(df)} records with {len(df.columns)} columns")
        print(f"🏢 Found {df['SYMBOL'].nunique()} unique symbols")
        
        # Clean and prepare data
        df['TIMESTAMP'] = pd.to_datetime(df['TIMESTAMP'])
        
        # Map column names to database schema
        column_mapping = {
            'TIMESTAMP': 'timestamp',
            'SYMBOL': 'symbol',
            'CLOSE_PRICE': 'close_price',
            'OPEN_PRICE': 'open_price',
            'HIGH_PRICE': 'high_price',
            'LOW_PRICE': 'low_price',
            'LAST_TRADED_PRICE': 'last_traded_price',
            'TOTAL_TRADED_QUANTITY': 'total_traded_quantity',
            'TOTAL_TRADED_VALUE': 'total_traded_value',
            'TURNOVER': 'turnover',
            'NUMBER_OF_TRADES': 'number_of_trades',
            'ROLLING_MEDIAN': 'rolling_median',
            'ROLLING_MODE': 'rolling_mode',
            'PP': 'pp',
            'S1': 's1', 'S2': 's2', 'S3': 's3', 'S4': 's4',
            'R1': 'r1', 'R2': 'r2', 'R3': 'r3', 'R4': 'r4',
            'FE_23_6': 'fe_23_6', 'FE_38_2': 'fe_38_2', 'FE_50': 'fe_50', 'FE_61_8': 'fe_61_8',
            'VWAP_WEEKLY': 'vwap_weekly', 'VWAP_MONTHLY': 'vwap_monthly', 
            'VWAP_QUARTERLY': 'vwap_quarterly', 'VWAP_YEARLY': 'vwap_yearly',
            'EMA_63': 'ema_63', 'EMA_144': 'ema_144', 'EMA_234': 'ema_234',
            'BC': 'bc', 'TC': 'tc'
        }
        
        # Select and rename columns that exist
        available_cols = []
        values_template = []
        
        for original_col, db_col in column_mapping.items():
            if original_col in df.columns:
                available_cols.append(original_col)
                values_template.append('%s')
        
        if not available_cols:
            print("❌ No matching columns found!")
            return False
        
        # Create insert query
        db_columns = [column_mapping[col] for col in available_cols]
        insert_query = f"""
        INSERT INTO stock_data ({', '.join(db_columns)}) 
        VALUES ({', '.join(values_template)})
        """
        
        # Load data in chunks
        cursor = connection.cursor()
        chunk_size = 1000
        total_chunks = len(df) // chunk_size + 1
        
        print(f"📦 Loading data in {total_chunks} chunks of {chunk_size} records each...")
        
        for i in range(0, len(df), chunk_size):
            chunk = df[available_cols].iloc[i:i+chunk_size]
            
            # Convert to list of tuples for MySQL
            data_tuples = []
            for _, row in chunk.iterrows():
                tuple_data = []
                for col in available_cols:
                    value = row[col]
                    if pd.isna(value):
                        tuple_data.append(None)
                    elif col == 'TIMESTAMP':
                        tuple_data.append(value.strftime('%Y-%m-%d %H:%M:%S'))
                    else:
                        tuple_data.append(value)
                data_tuples.append(tuple(tuple_data))
            
            # Insert chunk
            cursor.executemany(insert_query, data_tuples)
            connection.commit()
            
            progress = ((i + chunk_size) / len(df)) * 100
            print(f"⏳ Progress: {min(progress, 100):.1f}% ({i + len(chunk)}/{len(df)} records)")
        
        cursor.close()
        print("✅ Data loading completed successfully!")
        
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
        return False

def main():
    """Main migration function"""
    print("🚀 Starting stock data migration to Cloud SQL...")
    
    # Connect to database
    connection = connect_to_database()
    if not connection:
        return
    
    try:
        # Create table schema
        if not create_table_schema(connection):
            return
        
        # Load parquet data
        if load_parquet_data(connection):
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