# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Frontend Development (Located in `frontend/` directory)
- `npm run dev` - Start Vite development server with hot reload
- `npm run build` - Build production bundle  
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint to check code quality

### Working Directory
Always run frontend commands from the `frontend/` directory, not the root.

## Architecture Overview

This is a **React-based stock market dashboard** that visualizes Indian stock data with technical indicators.

### Frontend Stack
- **React 19.1** with hooks-based components
- **Vite** for fast development and building
- **Tailwind CSS v4** for styling with gradient backgrounds and glass-morphism design
- **Recharts** for interactive data visualization
- **Lucide React** for consistent iconography
- **Axios** for API communication
- **Date-fns** for date manipulation

### Key Components Structure

**App.jsx** (`src/App.jsx`)
- Main application container with state management
- Handles API communication with FastAPI backend at `http://127.0.0.1:8000`
- Manages symbol selection, date ranges, and technical indicators
- Contains fallback logic for when backend is unavailable

**ProfessionalStockDashboard.jsx** (`src/components/ProfessionalStockDashboard.jsx`)
- Primary dashboard UI component with tabbed interface
- Implements responsive design with dark gradient theme
- Features advanced date range slider with custom drag handlers
- Supports multiple technical indicators overlay on price charts
- Includes metric cards showing price statistics and volatility

**StockPriceChart.jsx** (`src/components/StockPriceChart.jsx`)  
- Specialized chart component using Recharts AreaChart
- Custom tooltip showing OHLC data and technical indicators
- Handles data validation and filtering for clean visualization

### Backend Integration

The frontend expects a **FastAPI backend** running on port 8000 with these endpoints:
- `GET /symbols` - Returns available stock symbols
- `GET /stock_data/{symbol}?frequency=Daily&start_date=YYYY-MM-DD&end_date=YYYY-MM-DD` - Returns time series data

**Expected Data Format:**
```json
{
  "TIMESTAMP": "2024-01-01T00:00:00",
  "CLOSE_PRICE": 1234.56,
  "ROLLING_MEDIAN": 1230.0,
  "PP": 1235.0,
  "S1": 1220.0,
  "R1": 1250.0,
  // ... additional technical indicators
}
```

### Technical Indicators Supported
The dashboard can display 20+ technical indicators including:
- Rolling Median/Mode
- Pivot Points (PP, S1-S4, R1-R4)
- Fibonacci Extensions
- VWAP (Weekly, Monthly, Quarterly, Yearly)  
- EMAs (63, 144, 234 periods)
- Channel indicators (BC, TC)

### Styling Approach
- Uses Tailwind CSS v4 with minimal config file
- Consistent dark theme with slate color palette
- Glass-morphism effects with backdrop blur
- Gradient backgrounds and animated elements
- Responsive grid layouts for different screen sizes

### State Management
- React useState hooks for local component state
- Props drilling for parent-child communication
- No external state management library (Redux/Zustand)
- Date range management with debounced API calls

## Development Notes

### Code Style
- ESLint configured with React hooks and refresh plugins
- Unused variables allowed if they match pattern `^[A-Z_]` (constants)
- Modern ES2020+ syntax with modules

### Date Handling
- All dates use ISO format (YYYY-MM-DD) for API communication
- Frontend displays dates in Indian locale format
- Date range selection supports both quick presets and custom slider

### Performance Considerations
- Chart data is filtered to remove null/invalid values
- Slider interactions are debounced to prevent excessive API calls
- Responsive container ensures proper chart sizing

## Testing

No test framework is currently configured. Consider adding Jest or Vitest for component testing.