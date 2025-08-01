#!/usr/bin/env python3
"""
Create table for direct parquet import
"""

import mysql.connector

# Database configuration
DB_CONFIG = {
    'host': '34.134.43.248',
    'database': 'stockdata',
    'user': 'stockuser',
    'password': 'Vascodigama@113',
    'port': 3306
}

def create_table():
    """Create stock_data table for parquet import"""
    connection = mysql.connector.connect(**DB_CONFIG)
    cursor = connection.cursor()
    
    # Create table matching parquet schema
    create_sql = """
    CREATE TABLE IF NOT EXISTS stock_data (
        TIMESTAMP DATETIME,
        SYMBOL VARCHAR(50),
        CLOSE_PRICE DECIMAL(15,4),
        OPEN_PRICE DECIMAL(15,4),
        HIGH_PRICE DECIMAL(15,4),
        LOW_PRICE DECIMAL(15,4),
        VOLUME BIGINT,
        
        INDEX idx_symbol (SYMBOL),
        INDEX idx_timestamp (TIMESTAMP)
    ) ENGINE=InnoDB;
    """
    
    cursor.execute(create_sql)
    connection.commit()
    cursor.close()
    connection.close()
    print("✅ Table created for direct parquet import")

if __name__ == "__main__":
    create_table()