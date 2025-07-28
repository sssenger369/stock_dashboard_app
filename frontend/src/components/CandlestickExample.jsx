// frontend/src/components/CandlestickExample.jsx
// Example usage and sample data for CandlestickChart component

import React, { useState } from 'react';
import CandlestickChart from './CandlestickChart';

// Sample OHLC data structure - shows expected format
const generateSampleData = (days = 30) => {
  const data = [];
  const basePrice = 150; // Starting price
  let currentPrice = basePrice;
  
  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    // Generate realistic OHLC data
    const volatility = 0.02; // 2% daily volatility
    const trend = Math.random() > 0.5 ? 1 : -1;
    const change = (Math.random() * volatility * 2 - volatility) * currentPrice;
    
    const open = currentPrice;
    const close = open + change;
    const high = Math.max(open, close) + (Math.random() * 0.01 * currentPrice);
    const low = Math.min(open, close) - (Math.random() * 0.01 * currentPrice);
    
    data.push({
      TIMESTAMP: date.toISOString(),
      OPEN_PRICE: open.toFixed(2),
      HIGH_PRICE: high.toFixed(2),
      LOW_PRICE: low.toFixed(2),
      CLOSE_PRICE: close.toFixed(2),
      // Optional: Add volume data
      TOTAL_TRADED_QUANTITY: Math.floor(Math.random() * 1000000) + 100000
    });
    
    currentPrice = close;
  }
  
  return data;
};

// Real-world example data structure (matches your backend API format)
const realWorldExample = [
  {
    TIMESTAMP: "2024-01-15T00:00:00",
    OPEN_PRICE: "2456.75",
    HIGH_PRICE: "2478.90",
    LOW_PRICE: "2445.20",
    CLOSE_PRICE: "2467.15",
    TOTAL_TRADED_QUANTITY: 1250000
  },
  {
    TIMESTAMP: "2024-01-16T00:00:00", 
    OPEN_PRICE: "2467.15",
    HIGH_PRICE: "2489.30",
    LOW_PRICE: "2458.75",
    CLOSE_PRICE: "2481.90",
    TOTAL_TRADED_QUANTITY: 980000
  },
  {
    TIMESTAMP: "2024-01-17T00:00:00",
    OPEN_PRICE: "2481.90",
    HIGH_PRICE: "2495.60",
    LOW_PRICE: "2471.25",
    CLOSE_PRICE: "2473.80",
    TOTAL_TRADED_QUANTITY: 1100000
  }
  // ... more data points
];

/**
 * Example component demonstrating CandlestickChart usage
 */
const CandlestickExample = () => {
  const [sampleData] = useState(() => generateSampleData(60)); // 60 days of sample data
  const [loading, setLoading] = useState(false);

  const handleRefreshData = () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
    }, 2000);
  };

  return (
    <div className="p-6 bg-gray-800 min-h-screen">
      <h1 className="text-2xl font-bold text-white mb-6">
        Candlestick Chart Component Examples
      </h1>
      
      {/* Example 1: Basic usage */}
      <div className="mb-8">
        <h2 className="text-xl text-white mb-4">1. Basic Usage</h2>
        <CandlestickChart
          data={sampleData}
          symbol="SAMPLE"
          height={400}
          loading={loading}
        />
      </div>

      {/* Example 2: Loading state */}
      <div className="mb-8">
        <h2 className="text-xl text-white mb-4">2. Loading State</h2>
        <button
          onClick={handleRefreshData}
          className="mb-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Toggle Loading
        </button>
        <CandlestickChart
          data={[]}
          symbol="LOADING_EXAMPLE"
          height={300}
          loading={loading}
        />
      </div>

      {/* Example 3: Custom height and styling */}
      <div className="mb-8">
        <h2 className="text-xl text-white mb-4">3. Custom Styling</h2>
        <CandlestickChart
          data={sampleData.slice(0, 20)} // Only show last 20 days
          symbol="CUSTOM"
          height={250}
          style={{ 
            border: '2px solid #3b82f6',
            borderRadius: '12px'
          }}
        />
      </div>

      {/* Code Examples */}
      <div className="mt-12 bg-gray-900 rounded-lg p-6">
        <h2 className="text-xl text-white mb-4">Usage Examples</h2>
        
        <div className="space-y-6">
          {/* Basic Usage */}
          <div>
            <h3 className="text-lg text-green-400 mb-2">Basic Usage:</h3>
            <pre className="bg-black p-4 rounded text-green-300 text-sm overflow-x-auto">
{`import CandlestickChart from './components/CandlestickChart';

// Your OHLC data
const stockData = [
  {
    TIMESTAMP: "2024-01-15T00:00:00",
    OPEN_PRICE: "2456.75",
    HIGH_PRICE: "2478.90", 
    LOW_PRICE: "2445.20",
    CLOSE_PRICE: "2467.15"
  }
  // ... more data
];

// Render the chart
<CandlestickChart
  data={stockData}
  symbol="RELIANCE"
  height={500}
  loading={false}
/>`}
            </pre>
          </div>

          {/* Data Format */}
          <div>
            <h3 className="text-lg text-blue-400 mb-2">Required Data Format:</h3>
            <pre className="bg-black p-4 rounded text-blue-300 text-sm overflow-x-auto">
{`// Each data object must contain these exact fields:
{
  TIMESTAMP: "2024-01-15T00:00:00",  // ISO date string or parseable date
  OPEN_PRICE: "2456.75",             // String or number
  HIGH_PRICE: "2478.90",             // String or number  
  LOW_PRICE: "2445.20",              // String or number
  CLOSE_PRICE: "2467.15"             // String or number
}`}
            </pre>
          </div>

          {/* Integration with your dashboard */}
          <div>
            <h3 className="text-lg text-yellow-400 mb-2">Integration with Stock Dashboard:</h3>
            <pre className="bg-black p-4 rounded text-yellow-300 text-sm overflow-x-auto">
{`// In your ProfessionalStockDashboard.jsx
import CandlestickChart from './CandlestickChart';

// Add to your dashboard component
<div className="chart-section">
  <CandlestickChart
    data={stockData}
    symbol={selectedSymbol}
    height={600}
    loading={dataLoading}
  />
</div>`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CandlestickExample;