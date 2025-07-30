#!/usr/bin/env python3
"""
Check the actual schema of the BigQuery external table
"""

from google.cloud import bigquery

def check_table_schema():
    """Check what columns are actually available in the external table"""
    try:
        client = bigquery.Client()
        
        # Query to get table schema
        table_id = f"{client.project}.stock_data_processing.stock_data_external"
        
        print("🔍 Checking table schema...")
        
        # Get table metadata
        table = client.get_table(table_id)
        
        print("✅ Available columns:")
        for field in table.schema:
            print(f"   - {field.name} ({field.field_type})")
        
        # Also try to sample a few rows to see the data
        print("\n📊 Sample data (first 5 rows):")
        sample_query = f"SELECT * FROM `{table_id}` LIMIT 5"
        
        result = client.query(sample_query).result()
        
        for row in result:
            print(f"   Row: {dict(row)}")
            break  # Just show first row structure
            
        return True
        
    except Exception as e:
        print(f"❌ Error checking schema: {e}")
        return False

if __name__ == "__main__":
    check_table_schema()