-- Database optimization for TradingView-style lazy loading
-- Add composite indexes for efficient date range queries

-- Drop existing indexes if they exist (optional, for clean setup)
-- DROP INDEX IF EXISTS idx_symbol_timestamp_desc ON stock_data;
-- DROP INDEX IF EXISTS idx_timestamp_desc ON stock_data;

-- Add composite index for symbol + timestamp (DESC) for efficient lazy loading queries
-- This index optimizes queries like: WHERE symbol = ? AND timestamp >= ? AND timestamp <= ? ORDER BY timestamp DESC
CREATE INDEX IF NOT EXISTS idx_symbol_timestamp_desc ON stock_data (symbol, timestamp DESC);

-- Add standalone timestamp index (DESC) for general date queries
-- This index optimizes queries like: WHERE timestamp >= ? AND timestamp <= ? ORDER BY timestamp DESC
CREATE INDEX IF NOT EXISTS idx_timestamp_desc ON stock_data (timestamp DESC);

-- Add index for close_price for efficient filtering of valid data
-- This index optimizes queries that filter out NULL close_price values
CREATE INDEX IF NOT EXISTS idx_close_price ON stock_data (close_price);

-- Add composite index for symbol + close_price (non-null filtering)
-- This index optimizes queries like: WHERE symbol = ? AND close_price IS NOT NULL
CREATE INDEX IF NOT EXISTS idx_symbol_close_price ON stock_data (symbol, close_price);

-- Verify indexes were created successfully
SHOW INDEXES FROM stock_data;

-- Query to check index usage and performance
-- Use EXPLAIN to verify query optimization for lazy loading endpoints
/*
EXPLAIN SELECT timestamp, symbol, close_price 
FROM stock_data 
WHERE symbol = 'RELIANCE' 
AND timestamp >= '2024-01-01' 
AND timestamp <= '2024-12-31'
ORDER BY timestamp DESC
LIMIT 200;
*/