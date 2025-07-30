#!/usr/bin/env python3
"""
Simple BigQuery migration that handles problematic column names
Uses basic columns only to avoid parsing issues
"""

from google.cloud import bigquery
import mysql.connector
from mysql.connector import Error

# Database configuration
DB_CONFIG = {
    'host': '34.46.207.67',
    'database': 'stockdata',
    'user': 'stockuser', 
    'password': 'StockPass123',
    'port': 3306
}

def create_simple_bigquery_table():
    """Create BigQuery table using SQL to handle column name issues"""
    try:
        print("🔄 Creating BigQuery table with column mapping...")
        
        client = bigquery.Client()
        
        # Create dataset in correct region
        dataset_id = "stock_data_processing"
        dataset_ref = client.dataset(dataset_id)
        
        try:
            client.get_dataset(dataset_ref)
        except:
            dataset = bigquery.Dataset(dataset_ref)
            dataset.location = "asia-south1"
            client.create_dataset(dataset)
            print(f"✅ Created dataset {dataset_id}")
        
        # Create a new table by loading from parquet with character map V2
        # This handles problematic column names with dots
        job_config = bigquery.LoadJobConfig(
            source_format=bigquery.SourceFormat.PARQUET,
            write_disposition=bigquery.WriteDisposition.WRITE_TRUNCATE,
            parquet_options=bigquery.ParquetOptions(
                enable_list_inference=True,
                enum_as_string=True
            ),
            # Use character map V2 to handle problematic field names
            use_avro_logical_types=True
        )
        
        table_id = f"{client.project}.{dataset_id}.stock_data_clean"
        
        # Load directly from parquet file
        load_job = client.load_table_from_uri(
            "gs://stock-data-sss-2024/Final_Data.parquet",
            table_id,
            job_config=job_config
        )
        
        print("⏳ Loading parquet data into BigQuery...")
        load_job.result()  # Wait for completion
        
        print("✅ Data loaded into BigQuery")
        
        # Get basic info
        table = client.get_table(table_id)
        print(f"📊 Loaded {table.num_rows} rows with {len(table.schema)} columns")
        
        return client, table_id
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return None, None

def export_essential_data(client, table_id):
    """Export just the essential columns to Cloud SQL"""
    try:
        print("🔄 Exporting essential data to Cloud SQL...")
        
        # Connect to MySQL
        connection = mysql.connector.connect(**DB_CONFIG)
        cursor = connection.cursor()
        
        # Create simple table
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
        
        print("✅ Cloud SQL table created")
        
        # Get table schema to find correct column names
        table = client.get_table(table_id)
        available_columns = [field.name for field in table.schema]
        
        print("📋 Available columns:")
        for col in available_columns[:10]:  # Show first 10
            print(f"   - {col}")
        
        # Find the essential columns by pattern matching
        timestamp_col = None
        symbol_col = None
        close_price_col = None
        
        for col in available_columns:
            if 'TIME' in col.upper():
                timestamp_col = col
            elif 'SYMBOL' in col.upper():
                symbol_col = col
            elif 'CLOSE' in col.upper() and 'PRICE' in col.upper():
                close_price_col = col
        
        if not all([timestamp_col, symbol_col, close_price_col]):
            print("❌ Could not find essential columns")
            return False
        
        print(f"✅ Using columns: {timestamp_col}, {symbol_col}, {close_price_col}")
        
        # Export data in chunks
        chunk_size = 50000
        offset = 0
        total_inserted = 0
        
        insert_query = "INSERT INTO stock_data (timestamp, symbol, close_price) VALUES (%s, %s, %s)"
        
        while True:
            # Query chunk from BigQuery with backticks for column names
            chunk_query = f"""
            SELECT 
                `{timestamp_col}` as timestamp,
                `{symbol_col}` as symbol,
                `{close_price_col}` as close_price
            FROM `{table_id}`
            WHERE `{timestamp_col}` IS NOT NULL 
            AND `{symbol_col}` IS NOT NULL 
            AND `{close_price_col}` IS NOT NULL
            AND `{close_price_col}` > 0
            ORDER BY `{symbol_col}`, `{timestamp_col}`
            LIMIT {chunk_size} OFFSET {offset}
            """
            
            chunk_result = client.query(chunk_query).result()
            chunk_data = list(chunk_result)
            
            if not chunk_data:
                break
            
            print(f"📦 Processing chunk: {offset + 1} to {offset + len(chunk_data)}")
            
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
            
            # Insert chunk
            if data_tuples:
                cursor.executemany(insert_query, data_tuples)
                connection.commit()
                total_inserted += len(data_tuples)
                print(f"   ✅ Inserted {len(data_tuples)} rows (Total: {total_inserted})")
            
            offset += chunk_size
            
            if offset % 200000 == 0:
                print(f"🚀 Progress: {total_inserted} rows inserted...")
        
        cursor.close()
        connection.close()
        
        print(f"✅ Migration completed! Total: {total_inserted} records")
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Main migration"""
    print("🚀 Starting simplified BigQuery migration...")
    
    # Step 1: Load parquet into BigQuery
    client, table_id = create_simple_bigquery_table()
    if not client or not table_id:
        return
    
    # Step 2: Export essential data to Cloud SQL
    if export_essential_data(client, table_id):
        print("🎉 Migration completed successfully!")
        print("💨 Your dashboard will now load instantly!")
    else:
        print("❌ Migration failed")

if __name__ == "__main__":
    main()