# Stock Dashboard App

A professional React-based stock market dashboard that visualizes Indian stock data with technical indicators and interactive charts.

![Dashboard Preview](https://via.placeholder.com/800x400/1e293b/ffffff?text=Stock+Dashboard+Preview)

## ✨ Features

- **Professional Trading Interface**: Compact controls layout similar to real-world trading platforms
- **Interactive Charts**: Candlestick and line charts with zoom and brush functionality
- **Technical Indicators**: Support for 20+ indicators including EMAs, VWAP, Pivot Points, Fibonacci levels
- **Search Functionality**: Searchable dropdowns for symbols, indicators, and crossover signals
- **Real-time Data**: Integration with FastAPI backend for Indian stock market data
- **Responsive Design**: Modern UI with Tailwind CSS v4 and glass-morphism effects
- **Performance Optimized**: Data sampling and lazy loading for large datasets

## 🚀 Tech Stack

### Frontend
- **React 19.1** with hooks-based components
- **Vite** for fast development and building
- **Tailwind CSS v4** for styling with gradient backgrounds
- **Recharts** for interactive data visualization
- **Lucide React** for consistent iconography
- **Axios** for API communication
- **Date-fns** for date manipulation

### Backend (Expected)
- **FastAPI** running on port 8000
- Endpoints for stock symbols and time series data
- Support for technical indicators calculation

## 📊 Technical Indicators Supported

- Rolling Median/Mode
- Pivot Points (PP, S1-S4, R1-R4) 
- Fibonacci Extensions (23.6%, 78.6%)
- VWAP (Weekly, Monthly, Quarterly, Yearly)
- EMAs (63, 144, 234 periods)
- Channel indicators (BC, TC)
- Previous High/Low
- Linear Regression Curve

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/sssenger369/stock_dashboard_app.git
   cd stock_dashboard_app
   ```

2. **Install dependencies**
   ```bash
   cd frontend
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Access the application**
   - Frontend: `http://localhost:5173`
   - Expected Backend: `http://127.0.0.1:8000`

## 📁 Project Structure

```
stock_dashboard_app/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ProfessionalStockDashboard.jsx    # Main dashboard component
│   │   │   ├── StockPriceChart.jsx               # Chart component
│   │   │   ├── CandlestickChart.jsx              # Candlestick chart
│   │   │   └── MultiFieldChart.jsx               # Multi-field visualization
│   │   ├── App.jsx                               # Main app with state management
│   │   └── main.jsx                              # React entry point
│   ├── package.json
│   └── vite.config.js
├── CLAUDE.md                                     # Development instructions
└── README.md
```

## 🔧 Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run ESLint
npm run lint
```

## 📡 API Integration

The dashboard expects a FastAPI backend with these endpoints:

### Get Symbols
```
GET /symbols
Response: ["RELIANCE", "TCS", "HDFCBANK", ...]
```

### Get Stock Data
```
GET /stock_data/{symbol}?frequency=Daily&start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
Response: [
  {
    "TIMESTAMP": "2024-01-01T00:00:00",
    "CLOSE_PRICE": 1234.56,
    "ROLLING_MEDIAN": 1230.0,
    "PP": 1235.0,
    "S1": 1220.0,
    "R1": 1250.0,
    // ... additional technical indicators
  }
]
```

## 🎨 UI Features

- **Compact Layout**: All controls (symbol, indicators, signals, date range) in a single horizontal row
- **Searchable Dropdowns**: Quickly find symbols, indicators, and signals without scrolling
- **Interactive Date Sliders**: Smooth date range selection with debounced API calls
- **Dark Theme**: Professional dark gradient theme with glass-morphism effects
- **Responsive Design**: Works on desktop and tablet devices

## 📈 Chart Features

- **Multiple Chart Types**: Line charts, area charts, and candlestick charts
- **Technical Overlays**: Display multiple indicators on the same chart
- **Interactive Tooltips**: OHLC data and indicator values on hover
- **Zoom & Pan**: Brush selection for detailed analysis
- **Performance Optimized**: Data sampling for large datasets (>5000 points)

## 🛡️ Error Handling

- Graceful fallback when backend is unavailable
- Input validation for date ranges
- Loading states and error messages
- Data validation and filtering

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👨‍💻 Author

**sssenger369**
- GitHub: [@sssenger369](https://github.com/sssenger369)
- Email: sssenger@outlook.com

## 🙏 Acknowledgments

- Built with React and modern web technologies
- Charts powered by Recharts library
- UI styled with Tailwind CSS
- Icons from Lucide React

---

*This project was developed with assistance from Claude Code for efficient React development and professional UI design.*