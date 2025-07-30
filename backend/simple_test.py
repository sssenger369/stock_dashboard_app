from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Simple CORS configuration for testing
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5181",
        "http://127.0.0.1:5181",
        "http://localhost:5180",
        "http://127.0.0.1:5180",
        "http://localhost:5177",
        "http://127.0.0.1:5177", 
        "http://localhost:5176",
        "http://localhost:5175",
        "*"  # Allow all origins for testing
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Simple test API working"}

@app.get("/symbols")
async def get_symbols():
    return ["RELIANCE", "TCS", "HDFCBANK", "INFY", "WIPRO", "SBIN"]

@app.get("/test-symbols")
async def test_symbols():
    return ["RELIANCE", "TCS", "HDFCBANK", "INFY"]

@app.get("/stock_data/{symbol}")
async def get_test_stock_data(symbol: str):
    # Return sample stock data for testing
    from datetime import datetime, timedelta
    import random
    
    # Generate 30 days of sample data
    data = []
    base_price = 2500.0 if symbol == "RELIANCE" else 3500.0
    
    for i in range(30):
        date = datetime.now() - timedelta(days=29-i)
        price = base_price + random.uniform(-50, 50)
        
        data.append({
            "TIMESTAMP": date.isoformat(),
            "SYMBOL": symbol,
            "CLOSE_PRICE": round(price, 2),
            "OPEN_PRICE": round(price + random.uniform(-10, 10), 2),
            "HIGH_PRICE": round(price + random.uniform(5, 20), 2),
            "LOW_PRICE": round(price - random.uniform(5, 20), 2),
            "VOLUME": random.randint(100000, 1000000),
            "ROLLING_MEDIAN": round(price, 2),
            "PP": round(price, 2),
            "EMA_63": round(price - 5, 2),
            "EMA_144": round(price - 10, 2),
            "EMA_234": round(price - 15, 2)
        })
    
    return data

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8004)