#!/usr/bin/env python3
"""
Migration script to load stock data from parquet to Cloud SQL
This creates instant loading for all 3,621 symbols
"""

import pandas as pd
import mysql.connector
from mysql.connector import Error
import os
from google.cloud.sql.connector import Connector
import sqlalchemy
from config import settings

# Database configuration
DB_CONFIG = {
    'instance_connection_name': 'triple-student-465020-g0:us-central1:stock-db',
    'database': 'stockdata',
    'user': 'stockuser', 
    'password': 'StockPass123'
}

def connect_to_database():
    """Create connection to Cloud SQL database"""
    try:
        # Initialize Cloud SQL Python Connector
        connector = Connector()
        
        def getconn():
            conn = connector.connect(
                DB_CONFIG['instance_connection_name'],  
                "pymysql",
                user=DB_CONFIG['user'],
                password=DB_CONFIG['password'],
                db=DB_CONFIG['database']
            )
            return conn
        
        # Create SQLAlchemy engine
        engine = sqlalchemy.create_engine(
            "mysql+pymysql://",
            creator=getconn,
        )
        
        print("✅ Connected to Cloud SQL database")
        return engine
        
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return None

def create_table_schema(engine):
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
        with engine.connect() as conn:
            conn.execute(sqlalchemy.text(create_table_sql))
            conn.commit()
        print("✅ Table schema created successfully")
        return True
    except Exception as e:
        print(f"❌ Error creating table: {e}")
        return False

def load_parquet_data(engine):
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
        
        # Clean column names for MySQL (lowercase, replace special chars)
        df.columns = [col.lower().replace('_price', '_price').replace('-', '_') for col in df.columns]
        
        # Ensure timestamp is properly formatted
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        
        # Load data in chunks for better performance
        chunk_size = 10000
        total_chunks = len(df) // chunk_size + 1
        
        print(f"📦 Loading data in {total_chunks} chunks of {chunk_size} records each...")
        
        for i in range(0, len(df), chunk_size):
            chunk = df.iloc[i:i+chunk_size]
            chunk.to_sql(
                'stock_data', 
                engine, 
                if_exists='append',
                index=False,
                method='multi'
            )
            
            progress = ((i + chunk_size) / len(df)) * 100
            print(f"⏳ Progress: {min(progress, 100):.1f}% ({i + len(chunk)}/{len(df)} records)")
        
        print("✅ Data loading completed successfully!")
        
        # Verify data
        with engine.connect() as conn:
            result = conn.execute(sqlalchemy.text("SELECT COUNT(*) as total FROM stock_data"))
            total_records = result.fetchone()[0]
            
            result = conn.execute(sqlalchemy.text("SELECT COUNT(DISTINCT symbol) as symbols FROM stock_data"))
            total_symbols = result.fetchone()[0]
            
        print(f"✅ Verification: {total_records} records, {total_symbols} symbols in database")
        return True
        
    except Exception as e:
        print(f"❌ Error loading data: {e}")
        return False

def main():
    """Main migration function"""
    print("🚀 Starting stock data migration to Cloud SQL...")
    
    # Connect to database
    engine = connect_to_database()
    if not engine:
        return
    
    # Create table schema
    if not create_table_schema(engine):
        return
    
    # Load parquet data
    if load_parquet_data(engine):
        print("🎉 Migration completed successfully!")
        print("💨 Your dashboard will now load instantly!")
    else:
        print("❌ Migration failed")

if __name__ == "__main__":
    main()