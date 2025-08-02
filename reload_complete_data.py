#!/usr/bin/env python3
"""
Reload Complete Dataset to BigQuery
Ensures all 110 columns from Final_Data.parquet are included
"""

import pandas as pd
from google.cloud import bigquery
import os
from datetime import datetime

def reload_complete_bigquery_data():
    """
    Reload the complete dataset from Final_Data.parquet to BigQuery
    with all 110 columns included
    """
    
    print("Starting complete data reload to BigQuery...")
    
    # BigQuery setup
    project_id = "triple-student-465020-g0"
    dataset_id = "stock_temp"
    
    client = bigquery.Client(project=project_id)
    
    # Source file
    parquet_file = r"C:\Users\sssen\Trading\OneDrive\Bhav copy Script\Final_Data.parquet"
    
    print(f"Loading data from: {parquet_file}")
    
    # Load complete parquet file
    df = pd.read_parquet(parquet_file)
    print(f"Loaded {len(df):,} records with {len(df.columns)} columns")
    print(f"Columns: {list(df.columns)}")
    
    # Check for Fibonacci fields
    fib_fields = [col for col in df.columns if 'FIB' in col.upper()]
    print(f"Fibonacci fields found: {fib_fields}")
    
    # Data type optimization to match previous work
    print("Optimizing data types...")
    
    # Convert float64 to float32 for memory efficiency
    float_cols = df.select_dtypes(include=['float64']).columns
    for col in float_cols:
        df[col] = df[col].astype('float32')
    
    # Standardize column names for BigQuery (lowercase, underscores)
    print("Standardizing column names for BigQuery...")
    
    # Create column mapping
    column_mapping = {}
    for col in df.columns:
        # Convert to lowercase and replace dots/spaces with underscores
        new_col = col.lower().replace('.', '_').replace(' ', '_')
        column_mapping[col] = new_col
    
    df = df.rename(columns=column_mapping)
    print(f"Column names standardized: {len(df.columns)} columns")
    
    # Drop existing fact table and recreate with complete schema
    table_id = f"{project_id}.{dataset_id}.fact_table"
    
    print(f"Dropping existing fact table: {table_id}")
    try:
        client.delete_table(table_id)
        print("Existing table deleted")
    except Exception as e:
        print(f"Table doesn't exist or couldn't be deleted: {e}")
    
    # Configure load job
    job_config = bigquery.LoadJobConfig(
        write_disposition=bigquery.WriteDisposition.WRITE_TRUNCATE,
        autodetect=True,  # Let BigQuery auto-detect schema from parquet
        source_format=bigquery.SourceFormat.PARQUET,
    )
    
    print(f"Loading complete dataset to BigQuery table: {table_id}")
    print(f"Records to load: {len(df):,}")
    print(f"Columns to load: {len(df.columns)}")
    
    # Save optimized data to temporary parquet file
    temp_parquet = "temp_complete_data.parquet"
    df.to_parquet(temp_parquet, engine='pyarrow', compression='snappy')
    print(f"Saved temporary file: {temp_parquet}")
    
    # Load to BigQuery from parquet file
    with open(temp_parquet, 'rb') as source_file:
        load_job = client.load_table_from_file(
            source_file,
            table_id,
            job_config=job_config
        )
    
    print("Loading data to BigQuery...")
    load_job.result()  # Wait for job to complete
    
    # Verify the load
    table = client.get_table(table_id)
    print(f"SUCCESS! Loaded {table.num_rows:,} rows to BigQuery")
    print(f"Schema columns: {len(table.schema)}")
    
    # Clean up temporary file
    os.remove(temp_parquet)
    print(f"Cleaned up temporary file")
    
    # Display schema summary
    print("\nFinal BigQuery Schema Summary:")
    schema_fields = [field.name for field in table.schema]
    
    # Check for key indicator fields
    key_indicators = ['fib_ext_0_236', 'fib_ext_0_786', 'prev_high', 'prev_low', 
                     'stock_rating', 'quality_score', 'growth_score']
    
    print("Key Indicators Status:")
    for indicator in key_indicators:
        status = "FOUND" if indicator in schema_fields else "MISSING"
        print(f"  {indicator}: {status}")
    
    print(f"\nComplete! BigQuery fact table now has {len(schema_fields)} columns")
    print("Ready to update backend to use all available fields!")
    
    return True

if __name__ == "__main__":
    reload_complete_bigquery_data()