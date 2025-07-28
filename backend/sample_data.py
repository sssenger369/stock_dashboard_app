import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import os

def create_sample_data():
    """Creates sample stock data for demonstration purposes"""
    
    # Sample symbols
    symbols = ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'HINDUNILVR', 'ICICIBANK', 'BHARTIARTL', 'ITC', 'KOTAKBANK', 'WIPRO']
    
    # Generate date range (last 2 years)
    end_date = datetime.now()
    start_date = end_date - timedelta(days=730)
    date_range = pd.date_range(start=start_date, end=end_date, freq='D')
    
    # Remove weekends (assuming market is closed)
    date_range = date_range[date_range.weekday < 5]
    
    data = []
    
    for symbol in symbols:
        # Base price for each symbol
        base_prices = {
            'RELIANCE': 2500, 'TCS': 3500, 'HDFCBANK': 1600, 'INFY': 1400, 'HINDUNILVR': 2400,
            'ICICIBANK': 900, 'BHARTIARTL': 800, 'ITC': 450, 'KOTAKBANK': 1800, 'WIPRO': 400
        }
        
        base_price = base_prices.get(symbol, 1000)
        
        previous_price = base_price
        
        for i, date in enumerate(date_range):
            # Generate realistic price movement
            price_change = np.random.normal(0, 0.02)  # 2% daily volatility
            close_price = previous_price * (1 + price_change)
            previous_price = close_price
            
            # Generate OHLC
            high_price = close_price * (1 + abs(np.random.normal(0, 0.01)))
            low_price = close_price * (1 - abs(np.random.normal(0, 0.01)))
            open_price = low_price + (high_price - low_price) * np.random.random()
            
            # Technical indicators (simplified)
            rolling_median = close_price * (1 + np.random.normal(0, 0.005))
            pp = (high_price + low_price + close_price) / 3
            
            record = {
                'TIMESTAMP': date,
                'SYMBOL': symbol,
                'OPEN_PRICE': round(open_price, 2),
                'HIGH_PRICE': round(high_price, 2),
                'LOW_PRICE': round(low_price, 2),
                'CLOSE_PRICE': round(close_price, 2),
                'ROLLING_MEDIAN': round(rolling_median, 2),
                'ROLLING_MODE': round(rolling_median * 0.99, 2),
                'PP': round(pp, 2),
                'S1': round(2 * pp - high_price, 2),
                'S2': round(pp - (high_price - low_price), 2),
                'R1': round(2 * pp - low_price, 2),
                'R2': round(pp + (high_price - low_price), 2),
                'EMA_63': round(close_price * 0.98, 2),
                'EMA_144': round(close_price * 0.96, 2),
                'EMA_234': round(close_price * 0.94, 2),
                'VWAP_W': round(close_price * 1.001, 2),
                'VWAP_M': round(close_price * 1.002, 2),
                'VWAP_Q': round(close_price * 1.003, 2),
                'VWAP_Y': round(close_price * 1.004, 2),
                'BC': round(low_price * 0.95, 2),
                'TC': round(high_price * 1.05, 2),
                'FIB_EXT_0.236': round(close_price * 1.236, 2),
                'FIB_EXT_0.786': round(close_price * 1.786, 2),
                'PREV_HIGH': round(high_price * 0.99, 2),
                'PREV_LOW': round(low_price * 1.01, 2),
                'LINREG_CURVE_63': round(close_price * 0.995, 2),
                'SECTOR': 'Technology' if symbol in ['TCS', 'INFY', 'WIPRO'] else 'Finance' if symbol in ['HDFCBANK', 'ICICIBANK', 'KOTAKBANK'] else 'Energy',
                'INDUSTRY': 'IT Services' if symbol in ['TCS', 'INFY', 'WIPRO'] else 'Banking' if symbol in ['HDFCBANK', 'ICICIBANK', 'KOTAKBANK'] else 'Oil & Gas',
                'MCAP_CATEGORY': 'Large Cap',
                'STOCK_RATING': 'A',
                'QUALITY_SCORE': round(np.random.uniform(7, 9), 1),
                'GROWTH_SCORE': round(np.random.uniform(6, 8), 1),
                'NIFTY_50': 1 if symbol in ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY'] else 0,
                'NIFTY_500': 1,
                'NEXT_50': 0,
                'ALPHA_50': round(np.random.uniform(-5, 5), 2),
                'BETA_50': round(np.random.uniform(0.8, 1.2), 2),
                'FNO': 1 if symbol in ['RELIANCE', 'TCS', 'HDFCBANK'] else 0,
                'FLAG': 'Normal'
            }
            
            data.append(record)
    
    df = pd.DataFrame(data)
    return df

if __name__ == "__main__":
    # Create sample data
    df = create_sample_data()
    
    # Save to parquet file
    os.makedirs('data', exist_ok=True)
    df.to_parquet('data/Final_Data.parquet', index=False)
    print(f"Sample data created with {len(df)} records for {df['SYMBOL'].nunique()} symbols")
    print(f"Date range: {df['TIMESTAMP'].min()} to {df['TIMESTAMP'].max()}")
    print(f"Symbols: {', '.join(df['SYMBOL'].unique())}")