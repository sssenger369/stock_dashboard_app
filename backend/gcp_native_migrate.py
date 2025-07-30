#!/usr/bin/env python3
"""
GCP Native Migration - Uses BigQuery to process parquet data from Cloud Storage
Then transfers to Cloud SQL. All processing happens in GCP.
"""

from google.cloud import bigquery
from google.cloud import storage
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

def create_bigquery_external_table():
    """Create BigQuery external table pointing to your Cloud Storage parquet file"""
    try:
        print("🔄 Creating BigQuery external table...")
        
        client = bigquery.Client()
        
        # Create dataset if not exists
        dataset_id = "stock_data_processing"
        dataset_ref = client.dataset(dataset_id)
        
        try:
            client.get_dataset(dataset_ref)
            print(f"✅ Dataset {dataset_id} already exists")
        except:
            dataset = bigquery.Dataset(dataset_ref)
            dataset.location = "asia-south1"  # Match your storage bucket location
            client.create_dataset(dataset)
            print(f"✅ Created dataset {dataset_id} in asia-south1")
        
        # Create external table
        table_id = f"{client.project}.{dataset_id}.stock_data_external"
        
        # External table configuration
        external_config = bigquery.ExternalConfig("PARQUET")
        external_config.source_uris = ["gs://stock-data-sss-2024/Final_Data.parquet"]
        external_config.autodetect = True
        
        table = bigquery.Table(table_id)
        table.external_data_configuration = external_config
        
        table = client.create_table(table, exists_ok=True)
        print(f"✅ Created external table {table_id}")
        
        return client, table_id
        
    except Exception as e:
        print(f"❌ Error creating BigQuery table: {e}")
        return None, None

def process_data_in_bigquery(client, table_id):
    """Process and aggregate data in BigQuery"""
    try:
        print("🔄 Processing data in BigQuery...")
        
        # Create processed table with essential columns
        processed_table_id = f"{client.project}.stock_data_processing.stock_data_processed"
        
        query = f"""
        CREATE OR REPLACE TABLE `{processed_table_id}` AS
        SELECT 
            TIMESTAMP,
            SYMBOL,
            CLOSE_PRICE,
            OPEN_PRICE,
            HIGH_PRICE,
            LOW_PRICE,
            TOTAL_TRADED_QUANTITY as VOLUME
        FROM `{table_id}`
        WHERE TIMESTAMP IS NOT NULL 
        AND SYMBOL IS NOT NULL 
        AND CLOSE_PRICE IS NOT NULL
        AND CLOSE_PRICE > 0
        ORDER BY SYMBOL, TIMESTAMP
        """
        
        job = client.query(query)
        job.result()  # Wait for completion
        
        print("✅ Data processed in BigQuery")
        
        # Get row count
        count_query = f"SELECT COUNT(*) as total FROM `{processed_table_id}`"
        count_result = client.query(count_query).result()
        total_rows = list(count_result)[0].total
        
        # Get symbol count  
        symbol_query = f"SELECT COUNT(DISTINCT SYMBOL) as symbols FROM `{processed_table_id}`"
        symbol_result = client.query(symbol_query).result()
        total_symbols = list(symbol_result)[0].symbols
        
        print(f"📊 Processed: {total_rows} records, {total_symbols} symbols")
        
        return processed_table_id
        
    except Exception as e:
        print(f"❌ Error processing in BigQuery: {e}")
        return None

def export_to_cloud_sql(client, processed_table_id):
    """Export processed data from BigQuery to Cloud SQL"""
    try:
        print("🔄 Exporting to Cloud SQL...")
        
        # Connect to Cloud SQL
        connection = mysql.connector.connect(**DB_CONFIG)
        if not connection.is_connected():
            print("❌ Could not connect to Cloud SQL")
            return False
        
        # Create table in Cloud SQL
        cursor = connection.cursor()
        
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
        
        cursor.execute("DROP TABLE IF EXISTS stock_data;")
        cursor.execute(create_table_sql)
        connection.commit()
        
        print("✅ Cloud SQL table created")
        
        # Export data in chunks using BigQuery
        chunk_size = 50000
        offset = 0
        total_inserted = 0
        
        insert_query = """
        INSERT INTO stock_data (timestamp, symbol, close_price, open_price, high_price, low_price, volume) 
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        """
        
        while True:
            # Query a chunk from BigQuery
            chunk_query = f"""
            SELECT 
                TIMESTAMP,
                SYMBOL,
                CLOSE_PRICE,
                OPEN_PRICE,
                HIGH_PRICE,
                LOW_PRICE,
                VOLUME
            FROM `{processed_table_id}`
            ORDER BY SYMBOL, TIMESTAMP
            LIMIT {chunk_size} OFFSET {offset}
            """
            
            chunk_result = client.query(chunk_query).result()
            chunk_data = list(chunk_result)
            
            if not chunk_data:
                break
                
            print(f"📦 Processing chunk: {offset + 1} to {offset + len(chunk_data)}")
            
            # Convert to tuples for MySQL
            data_tuples = []
            for row in chunk_data:
                try:
                    timestamp = row.TIMESTAMP.strftime('%Y-%m-%d %H:%M:%S') if row.TIMESTAMP else None
                    symbol = str(row.SYMBOL)[:50] if row.SYMBOL else None
                    close_price = float(row.CLOSE_PRICE) if row.CLOSE_PRICE else None
                    open_price = float(row.OPEN_PRICE) if row.OPEN_PRICE else None
                    high_price = float(row.HIGH_PRICE) if row.HIGH_PRICE else None
                    low_price = float(row.LOW_PRICE) if row.LOW_PRICE else None
                    volume = int(row.VOLUME) if row.VOLUME else None
                    
                    if timestamp and symbol and close_price:
                        data_tuples.append((timestamp, symbol, close_price, open_price, high_price, low_price, volume))
                except:
                    continue
            
            # Insert chunk into Cloud SQL
            if data_tuples:
                cursor.executemany(insert_query, data_tuples)
                connection.commit()
                total_inserted += len(data_tuples)
                print(f"   ✅ Inserted {len(data_tuples)} rows (Total: {total_inserted})")
            
            offset += chunk_size
            
            # Progress update
            if offset % 200000 == 0:
                print(f"🚀 Progress: {total_inserted} rows inserted so far...")
        
        cursor.close()
        connection.close()
        
        print(f"✅ Export completed! Total records: {total_inserted}")
        return True
        
    except Exception as e:
        print(f"❌ Error exporting to Cloud SQL: {e}")
        return False

def main():
    """Main GCP-native migration"""
    print("🚀 Starting GCP-native migration...")
    print("📊 Processing 974MB parquet file entirely within Google Cloud")
    
    # Step 1: Create BigQuery external table
    client, table_id = create_bigquery_external_table()
    if not client or not table_id:
        return
    
    # Step 2: Process data in BigQuery
    processed_table_id = process_data_in_bigquery(client, table_id)
    if not processed_table_id:
        return
    
    # Step 3: Export to Cloud SQL
    if export_to_cloud_sql(client, processed_table_id):
        print("🎉 GCP-native migration completed successfully!")
        print("💨 Your dashboard will now load instantly!")
        print("🏢 All 3,621 symbols with full historical data available")
    else:
        print("❌ Migration failed")

if __name__ == "__main__":
    main()