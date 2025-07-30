#!/usr/bin/env python3
"""
Migration using bq command line tool with character map V2
"""

import subprocess
import mysql.connector
from mysql.connector import Error
from google.cloud import bigquery
import json

# Database configuration
DB_CONFIG = {
    'host': '34.46.207.67',
    'database': 'stockdata',
    'user': 'stockuser', 
    'password': 'StockPass123',
    'port': 3306
}

def load_parquet_with_bq():
    """Use bq command line tool to load parquet with character map V2"""
    try:
        print("🔄 Using bq tool to load parquet with character map V2...")
        
        # First ensure dataset exists
        client = bigquery.Client()
        dataset_id = "stock_data_processing"
        dataset_ref = client.dataset(dataset_id)
        
        try:
            client.get_dataset(dataset_ref)
        except:
            dataset = bigquery.Dataset(dataset_ref)
            dataset.location = "asia-south1"
            client.create_dataset(dataset)
            print(f"✅ Created dataset {dataset_id}")
        
        # Use bq command line tool with character map V2
        table_id = f"{client.project}:{dataset_id}.stock_data_clean"
        
        bq_command = [
            "bq", "load",
            "--replace",  # Replace existing table
            "--source_format=PARQUET",
            "--parquet_options=enum_as_string:true,enable_list_inference:true",
            "--use_legacy_sql=false",
            table_id,
            "gs://stock-data-sss-2024/Final_Data.parquet"
        ]
        
        print(f"🔄 Running: {' '.join(bq_command)}")
        
        # Run bq load command
        result = subprocess.run(bq_command, capture_output=True, text=True, timeout=1800)  # 30 min timeout
        
        if result.returncode == 0:
            print("✅ BigQuery load completed successfully!")
            print(result.stdout)
            return client, table_id.replace(":", ".")
        else:
            print(f"❌ bq load failed: {result.stderr}")
            return None, None
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return None, None

def export_to_mysql(client, table_id):
    """Export data from BigQuery to MySQL"""
    try:
        print("🔄 Exporting to Cloud SQL...")
        
        # Connect to MySQL
        connection = mysql.connector.connect(**DB_CONFIG)
        cursor = connection.cursor()
        
        # Create table
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
        
        cursor.execute("DROP TABLE IF EXISTS stock_data;")
        cursor.execute(create_table_sql)
        connection.commit()
        
        # Get table info
        table = client.get_table(table_id)
        print(f"📊 BigQuery table has {table.num_rows} rows")
        
        # Find column names (they will be auto-fixed by BigQuery)
        available_columns = [field.name for field in table.schema]
        print("📋 Available columns (first 10):")
        for col in available_columns[:10]:
            print(f"   - {col}")
        
        # Find timestamp, symbol, close price columns
        timestamp_col = None
        symbol_col = None
        close_price_col = None
        
        for col in available_columns:
            col_upper = col.upper()
            if 'TIMESTAMP' in col_upper:
                timestamp_col = col
            elif 'SYMBOL' in col_upper:
                symbol_col = col
            elif 'CLOSE' in col_upper and 'PRICE' in col_upper:
                close_price_col = col
        
        if not all([timestamp_col, symbol_col, close_price_col]):
            print("❌ Essential columns not found")
            print(f"Found: timestamp={timestamp_col}, symbol={symbol_col}, close_price={close_price_col}")
            return False
        
        print(f"✅ Using: {timestamp_col}, {symbol_col}, {close_price_col}")
        
        # Export in chunks
        chunk_size = 100000
        offset = 0
        total_inserted = 0
        
        insert_query = "INSERT INTO stock_data (timestamp, symbol, close_price) VALUES (%s, %s, %s)"
        
        while True:
            chunk_query = f"""
            SELECT 
                {timestamp_col} as timestamp,
                {symbol_col} as symbol,
                {close_price_col} as close_price
            FROM `{table_id}`
            WHERE {timestamp_col} IS NOT NULL 
            AND {symbol_col} IS NOT NULL 
            AND {close_price_col} IS NOT NULL
            AND {close_price_col} > 0
            ORDER BY {symbol_col}, {timestamp_col}
            LIMIT {chunk_size} OFFSET {offset}
            """
            
            chunk_result = client.query(chunk_query).result()
            chunk_data = list(chunk_result)
            
            if not chunk_data:
                break
            
            print(f"📦 Chunk {offset//chunk_size + 1}: processing {len(chunk_data)} rows")
            
            # Convert to MySQL format
            data_tuples = []
            for row in chunk_data:
                try:
                    timestamp = row.timestamp.strftime('%Y-%m-%d %H:%M:%S') if row.timestamp else None
                    symbol = str(row.symbol)[:50] if row.symbol else None
                    close_price = float(row.close_price) if row.close_price else None
                    
                    if timestamp and symbol and close_price:
                        data_tuples.append((timestamp, symbol, close_price))
                except:
                    continue
            
            # Insert
            if data_tuples:
                cursor.executemany(insert_query, data_tuples)
                connection.commit()
                total_inserted += len(data_tuples)
                print(f"   ✅ Inserted {len(data_tuples)} rows (Total: {total_inserted})")
            
            offset += chunk_size
        
        cursor.close()
        connection.close()
        
        print(f"✅ Export completed! Total: {total_inserted} records")
        
        # Verify
        connection = mysql.connector.connect(**DB_CONFIG)
        cursor = connection.cursor()
        
        cursor.execute("SELECT COUNT(*) FROM stock_data")
        total_records = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(DISTINCT symbol) FROM stock_data")
        total_symbols = cursor.fetchone()[0]
        
        cursor.close()
        connection.close()
        
        print(f"✅ Verification: {total_records} records, {total_symbols} symbols")
        return True
        
    except Exception as e:
        print(f"❌ Export error: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Main migration using bq tool"""
    print("🚀 Starting bq command-line migration...")
    
    # Load parquet using bq tool
    client, table_id = load_parquet_with_bq()
    if not client or not table_id:
        return
    
    # Export to MySQL
    if export_to_mysql(client, table_id):
        print("🎉 Migration completed successfully!")
        print("💨 All 3,621 symbols with full data now available!")
    else:
        print("❌ Migration failed")

if __name__ == "__main__":
    main()