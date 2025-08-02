#!/usr/bin/env python3
"""
BigQuery Backend - Ultra Fast Stock Analytics
Direct parquet querying with sub-second performance
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from google.cloud import bigquery
import pandas as pd
from datetime import datetime
import os
from config import settings

app = FastAPI(
    title="Stock Dashboard API - BigQuery",
    description="Ultra-fast BigQuery backend with direct parquet querying",
    version="6.0.0"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS + ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# BigQuery client
client = bigquery.Client(project="triple-student-465020-g0")

# Dataset and table references
DATASET_ID = "stock_temp"
DIMENSION_TABLE = f"triple-student-465020-g0.{DATASET_ID}.dimension_table"
FACT_TABLE = f"triple-student-465020-g0.{DATASET_ID}.fact_table"

def get_bigquery_client():
    """Get BigQuery client"""
    try:
        return bigquery.Client(project="triple-student-465020-g0")
    except Exception as e:
        print(f"BigQuery client error: {e}")
        return None

@app.get("/")
async def root():
    """API Status with BigQuery metrics"""
    client = get_bigquery_client()
    
    if not client:
        raise HTTPException(status_code=500, detail="BigQuery connection failed")
    
    try:
        # Get dimension count
        dim_query = f"SELECT COUNT(*) as count FROM `{DIMENSION_TABLE}`"
        dim_result = client.query(dim_query).result()
        dim_count = next(dim_result).count
        
        # Get fact count
        fact_query = f"SELECT COUNT(*) as count FROM `{FACT_TABLE}`"
        fact_result = client.query(fact_query).result()
        fact_count = next(fact_result).count
        
        return {
            "message": "Stock Dashboard API - BigQuery Powered",
            "version": "6.0.0",
            "status": "operational",
            "data_model": "bigquery_analytics",
            "symbols": dim_count,
            "records": fact_count,
            "performance": "lightning_fast",
            "query_engine": "BigQuery",
            "data_source": "direct_parquet"
        }
        
    except Exception as e:
        return {
            "message": "Stock Dashboard API - BigQuery Setup",
            "version": "6.0.0", 
            "status": "setup_needed",
            "error": str(e)
        }

@app.get("/symbols")
async def get_symbols():
    """Get all symbols from BigQuery dimension table - lightning fast"""
    client = get_bigquery_client()
    
    if not client:
        return ["RELIANCE", "TCS", "HDFCBANK", "INFY", "HINDUNILVR"]
    
    try:
        query = f"""
        SELECT symbol 
        FROM `{DIMENSION_TABLE}` 
        ORDER BY symbol
        """
        
        result = client.query(query).result()
        symbols = [row.symbol for row in result]
        return symbols
        
    except Exception as e:
        print(f"BigQuery error in get_symbols: {e}")
        return ["RELIANCE", "TCS", "HDFCBANK", "INFY", "HINDUNILVR"]

@app.get("/stock_data/{symbol}")
async def get_stock_data(symbol: str):
    """Get stock data with BigQuery JOIN - ultra-fast analytics"""
    
    client = get_bigquery_client()
    if not client:
        raise HTTPException(status_code=500, detail="BigQuery connection failed")
    
    try:
        # Optimized BigQuery JOIN query
        query = f"""
        SELECT 
            f.timestamp, f.symbol, d.security, d.sector, d.industry,
            f.open_price, f.high_price, f.low_price, f.last_price, f.close_price,
            f.volume, f.turnover_lacs, f.no_of_trades, f.deliv_qty, f.deliv_per,
            f.rolling_median, f.rolling_mode, f.month, f.week, f.prev_high, f.prev_low,
            f.pp, f.s1, f.s2, f.s3, f.s4, f.r1, f.r2, f.r3, f.r4, f.bc, f.tc,
            f.vwap_w, f.vwap_std_w, f.vwap_upper_1_w, f.vwap_lower_1_w,
            f.vwap_upper_2_w, f.vwap_lower_2_w, f.vwap_upper_3_w, f.vwap_lower_3_w,
            f.vwap_m, f.vwap_std_m, f.vwap_upper_1_m, f.vwap_lower_1_m,
            f.vwap_upper_2_m, f.vwap_lower_2_m, f.vwap_upper_3_m, f.vwap_lower_3_m,
            f.vwap_q, f.vwap_std_q, f.vwap_upper_1_q, f.vwap_lower_1_q,
            f.vwap_upper_2_q, f.vwap_lower_2_q, f.vwap_upper_3_q, f.vwap_lower_3_q,
            f.vwap_y, f.vwap_std_y, f.vwap_upper_1_y, f.vwap_lower_1_y,
            f.vwap_upper_2_y, f.vwap_lower_2_y, f.vwap_upper_3_y, f.vwap_lower_3_y,
            f.ema_63, f.ema_144, f.ema_234,
            f.bullcross_63_144, f.bearcross_63_144, f.bullcross_144_234,
            f.bearcross_144_234, f.bullcross_63_234, f.bearcross_63_234,
            f.linreg_curve_63, f.volume_ma_45, f.turnover_lacs_ma_45,
            f.no_of_trades_ma_45, f.deliv_qty_ma_45, f.deliv_per_ma_45,
            f.fib_ext_0_236, f.fib_ext_0_786, f.avg_price, f.series,
            f.stock_rating, f.quality_score, f.growth_score, f.mcap_category,
            f.nifty_50, f.fno, f.flag, f.nifty_500, f.next_50, f.alpha_50, f.beta_50,
            f.trend_bias, f.price_category, f.one_year_growth_percent
        FROM `{FACT_TABLE}` f
        JOIN `{DIMENSION_TABLE}` d ON f.symbol = d.symbol
        WHERE f.symbol = @symbol
        ORDER BY f.timestamp ASC
        """
        
        # Use parameterized query for security
        job_config = bigquery.QueryJobConfig(
            query_parameters=[
                bigquery.ScalarQueryParameter("symbol", "STRING", symbol)
            ]
        )
        
        result = client.query(query, job_config=job_config).result()
        
        # Convert to list of dictionaries
        rows = []
        for row in result:
            record = {}
            for field in result.schema:
                value = getattr(row, field.name)
                
                if isinstance(value, datetime):
                    record[field.name.upper()] = value.isoformat()
                elif field.name.lower() == 'timestamp' and isinstance(value, int):
                    # Convert BigQuery timestamp (nanoseconds) to ISO format
                    try:
                        dt = datetime.fromtimestamp(value / 1_000_000_000)  # Convert nanoseconds to seconds
                        record[field.name.upper()] = dt.isoformat()
                    except Exception as e:
                        # Fallback to original value if conversion fails
                        record[field.name.upper()] = value
                else:
                    record[field.name.upper()] = value
            rows.append(record)
        
        if not rows:
            raise HTTPException(status_code=404, detail=f"No data found for symbol {symbol}")
        
        return rows
        
    except Exception as e:
        print(f"BigQuery error: {e}")
        raise HTTPException(status_code=500, detail=f"BigQuery error: {str(e)}")

@app.get("/analytics/summary/{symbol}")
async def get_analytics_summary(symbol: str):
    """Advanced analytics - only possible with BigQuery speed"""
    
    client = get_bigquery_client()
    if not client:
        raise HTTPException(status_code=500, detail="BigQuery connection failed")
    
    try:
        query = f"""
        SELECT 
            symbol,
            COUNT(*) as total_records,
            MIN(timestamp) as first_date,
            MAX(timestamp) as last_date,
            AVG(close_price) as avg_price,
            MIN(close_price) as min_price,
            MAX(close_price) as max_price,
            STDDEV(close_price) as price_volatility,
            AVG(volume) as avg_volume,
            SUM(volume) as total_volume
        FROM `{FACT_TABLE}`
        WHERE symbol = @symbol
        GROUP BY symbol
        """
        
        job_config = bigquery.QueryJobConfig(
            query_parameters=[
                bigquery.ScalarQueryParameter("symbol", "STRING", symbol)
            ]
        )
        
        result = client.query(query, job_config=job_config).result()
        
        for row in result:
            return {
                "symbol": row.symbol,
                "total_records": row.total_records,
                "first_date": row.first_date.isoformat() if row.first_date else None,
                "last_date": row.last_date.isoformat() if row.last_date else None,
                "avg_price": float(row.avg_price) if row.avg_price else None,
                "min_price": float(row.min_price) if row.min_price else None,
                "max_price": float(row.max_price) if row.max_price else None,
                "price_volatility": float(row.price_volatility) if row.price_volatility else None,
                "avg_volume": float(row.avg_volume) if row.avg_volume else None,
                "total_volume": int(row.total_volume) if row.total_volume else None
            }
        
        raise HTTPException(status_code=404, detail=f"No data found for symbol {symbol}")
        
    except Exception as e:
        print(f"BigQuery analytics error: {e}")
        raise HTTPException(status_code=500, detail=f"Analytics error: {str(e)}")

@app.get("/analytics/top-performers")
async def get_top_performers(limit: int = 10):
    """Get top performing stocks - BigQuery analytics power"""
    
    client = get_bigquery_client()
    if not client:
        raise HTTPException(status_code=500, detail="BigQuery connection failed")
    
    try:
        query = f"""
        WITH latest_prices AS (
            SELECT 
                f.symbol,
                d.security,
                f.close_price,
                f.timestamp,
                ROW_NUMBER() OVER (PARTITION BY f.symbol ORDER BY f.timestamp DESC) as rn
            FROM `{FACT_TABLE}` f
            JOIN `{DIMENSION_TABLE}` d ON f.symbol = d.symbol
        ),
        first_prices AS (
            SELECT 
                symbol,
                close_price as first_price,
                ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY timestamp ASC) as rn
            FROM `{FACT_TABLE}`
        )
        SELECT 
            l.symbol,
            l.security,
            l.close_price as current_price,
            f.first_price,
            ((l.close_price - f.first_price) / f.first_price) * 100 as growth_percent
        FROM latest_prices l
        JOIN first_prices f ON l.symbol = f.symbol
        WHERE l.rn = 1 AND f.rn = 1
        ORDER BY growth_percent DESC
        LIMIT @limit
        """
        
        job_config = bigquery.QueryJobConfig(
            query_parameters=[
                bigquery.ScalarQueryParameter("limit", "INT64", limit)
            ]
        )
        
        result = client.query(query, job_config=job_config).result()
        
        performers = []
        for row in result:
            performers.append({
                "symbol": row.symbol,
                "security": row.security,
                "current_price": float(row.current_price) if row.current_price else None,
                "first_price": float(row.first_price) if row.first_price else None,
                "growth_percent": float(row.growth_percent) if row.growth_percent else None
            })
        
        return performers
        
    except Exception as e:
        print(f"BigQuery top performers error: {e}")
        raise HTTPException(status_code=500, detail=f"Top performers error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)