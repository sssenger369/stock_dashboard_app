# Stock Dashboard Backend

FastAPI-based backend service for the Stock Dashboard application that provides real-time Indian stock market data with technical indicators.

## 🚀 Features

- **FastAPI REST API** with automatic OpenAPI documentation
- **Real-time Stock Data** from Parquet files
- **Technical Indicators** calculation (Z-scores, EMAs, VWAP, Pivot Points)
- **CORS Support** for frontend integration
- **Data Caching** with LRU cache for improved performance
- **Flexible Date Filtering** with multiple frequency options
- **Error Handling** with detailed HTTP responses

## 📋 Prerequisites

- Python 3.8 or higher
- Stock data in Parquet format
- Virtual environment (recommended)

## 🛠️ Installation

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   ```

3. **Activate virtual environment**
   ```bash
   # Windows
   venv\Scripts\activate
   
   # macOS/Linux
   source venv/bin/activate
   ```

4. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

5. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env file with your data path
   ```

## 🚦 Running the Server

### Option 1: Using the startup script (Recommended)
```bash
python start.py
```

### Option 2: Using uvicorn directly
```bash
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

The API will be available at:
- **API Base URL**: http://127.0.0.1:8000
- **Interactive Docs**: http://127.0.0.1:8000/docs
- **ReDoc**: http://127.0.0.1:8000/redoc

## 📡 API Endpoints

### Health Check
```http
GET /
```
Returns welcome message and API status.

### Get Available Symbols
```http
GET /symbols
```
Returns list of all available stock symbols.

**Response:**
```json
["RELIANCE", "TCS", "HDFCBANK", "INFY", ...]
```

### Get Stock Data
```http
GET /stock_data/{symbol}?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD&frequency=Daily&zscore_window=30
```

**Parameters:**
- `symbol` (path): Stock symbol (e.g., "RELIANCE")
- `start_date` (query, optional): Start date in YYYY-MM-DD format
- `end_date` (query, optional): End date in YYYY-MM-DD format
- `frequency` (query, optional): "Daily", "Weekly", or "Monthly" (default: "Daily")
- `zscore_window` (query, optional): Window size for Z-score calculation (default: 30)

**Response:**
```json
[
  {
    "TIMESTAMP": "2024-01-01T00:00:00",
    "SYMBOL": "RELIANCE",
    "CLOSE_PRICE": 2456.78,
    "OPEN_PRICE": 2450.00,
    "HIGH_PRICE": 2460.00,
    "LOW_PRICE": 2445.00,
    "ROLLING_MEDIAN": 2450.0,
    "PP": 2451.67,
    "S1": 2441.34,
    "R1": 2462.00,
    "EMA_63": 2448.50,
    "EMA_144": 2445.30,
    "EMA_234": 2440.10,
    "VWAP_W": 2452.25,
    "Z_SCORE_CLOSE_PRICE": 0.125,
    "SECTOR": "Energy",
    "INDUSTRY": "Oil & Gas",
    "MCAP_CATEGORY": "Large Cap",
    "STOCK_RATING": "A+",
    ...
  }
]
```

## 🔧 Configuration

### Environment Variables

The backend can be configured using environment variables in `.env` file:

```env
# Data Configuration
DATA_DIRECTORY=C:\path\to\your\data
DATA_FILENAME=Final_Data.parquet

# Server Configuration  
HOST=127.0.0.1
PORT=8000
DEBUG=True

# CORS Origins (comma-separated)
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# Z-Score Calculation
DEFAULT_ZSCORE_WINDOW=30
```

### Data File Structure

The backend expects a Parquet file with the following columns:
- `TIMESTAMP`: Date/time of the record
- `SYMBOL`: Stock symbol
- `OPEN_PRICE`, `HIGH_PRICE`, `LOW_PRICE`, `CLOSE_PRICE`: OHLC data
- Technical indicator columns (PP, S1-S4, R1-R4, EMA_*, VWAP_*, etc.)
- Stock information (SECTOR, INDUSTRY, MCAP_CATEGORY, etc.)

## 🛡️ Error Handling

The API provides detailed error responses:

- **404**: Symbol not found or no data available
- **400**: Invalid date format or parameters
- **500**: Server errors (file not found, data loading issues)

## 🔍 Technical Indicators

The backend calculates and provides:

### Price-based Indicators
- **Rolling Median/Mode**: Statistical measures of price
- **Z-Score**: Standardized price deviation
- **EMAs**: Exponential Moving Averages (63, 144, 234 periods)

### Support & Resistance
- **Pivot Points**: PP, S1-S4, R1-R4 levels
- **Fibonacci Extensions**: 23.6%, 78.6% levels

### Volume-based Indicators  
- **VWAP**: Volume Weighted Average Price (Weekly, Monthly, Quarterly, Yearly)

### Channel Indicators
- **BC/TC**: Bottom and Top Channel levels

## 🚀 Performance Features

- **LRU Caching**: Main data is cached in memory for faster access
- **Data Sampling**: Large datasets are automatically sampled for better performance
- **Efficient Filtering**: Optimized pandas operations for date range filtering
- **NaN Handling**: Proper JSON serialization of null values

## 🔐 Security

- **CORS Protection**: Configurable allowed origins
- **Input Validation**: Date format and parameter validation
- **Error Sanitization**: Prevents sensitive information leakage

## 🧪 Testing

To test the API:

1. **Start the server**
2. **Visit the interactive docs**: http://127.0.0.1:8000/docs
3. **Test endpoints** using the built-in interface

Or use curl:
```bash
# Get symbols
curl http://127.0.0.1:8000/symbols

# Get stock data
curl "http://127.0.0.1:8000/stock_data/RELIANCE?start_date=2024-01-01&end_date=2024-01-31"
```

## 🛠️ Development

### Project Structure
```
backend/
├── main.py              # FastAPI application
├── start.py             # Startup script
├── requirements.txt     # Python dependencies
├── .env.example         # Environment template
└── README.md           # This file
```

### Adding New Endpoints

1. Add new route functions in `main.py`
2. Follow FastAPI conventions for path parameters and query parameters
3. Include proper type hints and documentation
4. Handle errors appropriately with HTTPException

### Data Processing

The backend uses pandas for efficient data processing:
- Date filtering with timezone awareness
- Resampling for different frequencies
- NaN value handling for JSON compatibility
- Memory-efficient operations with chunking

## 📈 Monitoring

The server provides console output for:
- Data loading status
- Request processing
- Error tracking
- Performance metrics

## 🤝 Integration

This backend is designed to work with the React frontend in the `frontend/` directory. The frontend expects specific data formats and field names as defined in the API responses.

---

*For issues or questions, please refer to the main project README or create an issue in the repository.*