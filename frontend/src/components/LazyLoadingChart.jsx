// frontend/src/components/LazyLoadingChart.jsx
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { format, parseISO, isValid, subDays, addDays } from 'date-fns';

// Lazy load ApexCharts to avoid SSR issues
const Chart = React.lazy(() => import('react-apexcharts'));

/**
 * TradingView-style Lazy Loading Candlestick Chart Component
 * 
 * Features:
 * - Viewport-based data loading (load only visible data)
 * - Progressive data fetching when panning/zooming
 * - Smart buffering for smooth navigation
 * - Optimized performance for large datasets
 * 
 * @param {Object} props
 * @param {string} props.symbol - Stock symbol to display
 * @param {number} props.height - Chart height in pixels (default: 500)
 * @param {Array} props.selectedIndicators - Technical indicators to overlay
 * @param {string} props.apiBaseUrl - Backend API base URL
 */
const LazyLoadingChart = ({ 
  symbol = '', 
  height = 500, 
  selectedIndicators = [],
  apiBaseUrl = 'http://127.0.0.1:8000'
}) => {
  
  // State management for lazy loading
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [viewportRange, setViewportRange] = useState({
    start: null,
    end: null
  });
  
  // Chart reference for viewport management
  const chartRef = useRef(null);
  
  // Data cache for efficient range queries
  const dataCache = useRef(new Map());
  const [totalDataRange, setTotalDataRange] = useState({
    min: null,
    max: null
  });

  // Buffer settings for smooth navigation
  const BUFFER_DAYS = 50; // Load 50 extra days on each side
  const INITIAL_LOAD_DAYS = 100; // Initial load size
  const CHUNK_SIZE = 200; // Max records per API call

  /**
   * Initial data load - fallback to existing API until lazy endpoints are available
   */
  const loadInitialData = useCallback(async () => {
    if (!symbol) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Try new lazy loading endpoint first, fallback to existing API
      let url = `${apiBaseUrl}/stock_data/${symbol}/latest?days=${INITIAL_LOAD_DAYS}`;
      console.log(`🚀 Trying lazy loading endpoint for ${symbol}`);
      console.log(`🔗 API URL: ${url}`);
      
      let response = await fetch(url);
      console.log(`📡 Response status: ${response.status}`);
      
      // If lazy endpoint fails, fallback to existing API
      if (!response.ok) {
        console.log(`⚠️ Lazy endpoint failed, falling back to existing API`);
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        url = `${apiBaseUrl}/stock_data/${symbol}?start_date=${startDate}&end_date=${endDate}`;
        console.log(`🔗 Fallback URL: ${url}`);
        
        response = await fetch(url);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ API Error: ${response.status} ${response.statusText}`, errorText);
          throw new Error(`Failed to load data: ${response.status} ${response.statusText}`);
        }
      }
      
      const data = await response.json();
      console.log(`📊 Raw data received:`, data ? data.length || 'N/A' : 'null', 'records');
      
      if (data && data.length > 0) {
        // Sort by timestamp
        const sortedData = data.sort((a, b) => new Date(a.TIMESTAMP) - new Date(b.TIMESTAMP));
        
        // Update data cache
        const cacheKey = `initial_${INITIAL_LOAD_DAYS}`;
        dataCache.current.set(cacheKey, sortedData);
        
        // Set initial viewport range
        const startDate = new Date(sortedData[0].TIMESTAMP);
        const endDate = new Date(sortedData[sortedData.length - 1].TIMESTAMP);
        
        setChartData(sortedData);
        setViewportRange({
          start: startDate,
          end: endDate
        });
        
        setTotalDataRange({
          min: startDate,
          max: endDate
        });
        
        console.log(`✅ Loaded ${sortedData.length} initial records for ${symbol}`);
      } else {
        setError('No data available for this symbol');
      }
    } catch (err) {
      console.error('Error loading initial data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [symbol, apiBaseUrl]);

  /**
   * Load data for a specific date range with buffering
   */
  const loadRangeData = useCallback(async (startDate, endDate, useBuffer = true) => {
    if (!symbol || !startDate || !endDate) return [];
    
    // Add buffer for smooth navigation
    let queryStart = startDate;
    let queryEnd = endDate;
    
    if (useBuffer) {
      queryStart = subDays(startDate, BUFFER_DAYS);
      queryEnd = addDays(endDate, BUFFER_DAYS);
    }
    
    const cacheKey = `${symbol}_${format(queryStart, 'yyyy-MM-dd')}_${format(queryEnd, 'yyyy-MM-dd')}`;
    
    // Check cache first
    if (dataCache.current.has(cacheKey)) {
      console.log(`📦 Using cached data for ${cacheKey}`);
      return dataCache.current.get(cacheKey);
    }
    
    try {
      console.log(`🔍 Loading range data: ${format(queryStart, 'yyyy-MM-dd')} to ${format(queryEnd, 'yyyy-MM-dd')}`);
      
      // Try lazy range endpoint first, fallback to existing API
      let url = `${apiBaseUrl}/stock_data/${symbol}/range?start_date=${format(queryStart, 'yyyy-MM-dd')}&end_date=${format(queryEnd, 'yyyy-MM-dd')}&limit=${CHUNK_SIZE}`;
      let response = await fetch(url);
      
      // If range endpoint fails, fallback to existing API
      if (!response.ok) {
        console.log(`⚠️ Range endpoint failed, falling back to existing API`);
        url = `${apiBaseUrl}/stock_data/${symbol}?start_date=${format(queryStart, 'yyyy-MM-dd')}&end_date=${format(queryEnd, 'yyyy-MM-dd')}`;
        response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`Failed to load range data: ${response.statusText}`);
        }
      }
      
      const result = await response.json();
      const data = result.data || result || []; // Handle both new and old API response formats
      
      if (data.length > 0) {
        // Sort by timestamp
        const sortedData = data.sort((a, b) => new Date(a.TIMESTAMP) - new Date(b.TIMESTAMP));
        
        // Cache the data
        dataCache.current.set(cacheKey, sortedData);
        
        console.log(`✅ Loaded ${sortedData.length} range records for ${symbol}`);
        return sortedData;
      }
      
      return [];
    } catch (err) {
      console.error('Error loading range data:', err);
      return [];
    }
  }, [symbol, apiBaseUrl]);

  /**
   * Handle viewport changes (zoom/pan events)
   */
  const handleViewportChange = useCallback(async (newStart, newEnd) => {
    if (!newStart || !newEnd) return;
    
    console.log(`👁️ Viewport changed: ${format(newStart, 'yyyy-MM-dd')} to ${format(newEnd, 'yyyy-MM-dd')}`);
    
    // Load data for new viewport range
    const newData = await loadRangeData(newStart, newEnd);
    
    if (newData.length > 0) {
      // Merge with existing data and remove duplicates
      const mergedData = [...chartData, ...newData];
      const uniqueData = mergedData.reduce((acc, current) => {
        const exists = acc.find(item => item.TIMESTAMP === current.TIMESTAMP);
        if (!exists) {
          acc.push(current);
        }
        return acc;
      }, []);
      
      // Sort by timestamp
      uniqueData.sort((a, b) => new Date(a.TIMESTAMP) - new Date(b.TIMESTAMP));
      
      setChartData(uniqueData);
      setViewportRange({
        start: newStart,
        end: newEnd
      });
    }
  }, [chartData, loadRangeData]);

  // Load initial data when symbol changes
  useEffect(() => {
    if (symbol) {
      // Clear cache and data when symbol changes
      dataCache.current.clear();
      setChartData([]);
      loadInitialData();
    }
  }, [symbol, loadInitialData]);

  // Transform data for ApexCharts
  const processedChartData = useMemo(() => {
    if (!chartData || chartData.length === 0) return { candlestickData: [], indicatorSeries: [] };
    
    // Filter out invalid data points
    const cleanData = chartData.filter(item => 
      item.OPEN_PRICE && 
      item.HIGH_PRICE && 
      item.LOW_PRICE && 
      item.CLOSE_PRICE &&
      !isNaN(parseFloat(item.OPEN_PRICE)) &&
      !isNaN(parseFloat(item.HIGH_PRICE)) &&
      !isNaN(parseFloat(item.LOW_PRICE)) &&
      !isNaN(parseFloat(item.CLOSE_PRICE))
    );

    if (cleanData.length === 0) return { candlestickData: [], indicatorSeries: [] };

    // Prepare candlestick data
    const candlestickData = cleanData.map(item => {
      const date = parseISO(item.TIMESTAMP);
      const timestamp = isValid(date) ? date.getTime() : new Date(item.TIMESTAMP).getTime();
      
      const open = parseFloat(item.OPEN_PRICE);
      const high = parseFloat(item.HIGH_PRICE);
      const low = parseFloat(item.LOW_PRICE);
      const close = parseFloat(item.CLOSE_PRICE);
      
      return {
        x: timestamp,
        y: [open, high, low, close],
        originalData: item
      };
    });

    // Prepare technical indicator data
    const indicatorSeries = selectedIndicators
      .filter(indicator => cleanData.some(d => d[indicator] !== null && d[indicator] !== undefined))
      .map(indicator => ({
        name: indicator,
        type: 'line',
        data: cleanData.map(item => {
          const date = parseISO(item.TIMESTAMP);
          const timestamp = isValid(date) ? date.getTime() : new Date(item.TIMESTAMP).getTime();
          return {
            x: timestamp,
            y: parseFloat(item[indicator]) || null
          };
        }).filter(point => point.y !== null)
      }));

    return { candlestickData, indicatorSeries };
  }, [chartData, selectedIndicators]);

  // Calculate Y-axis range
  const yAxisRange = useMemo(() => {
    if (processedChartData.candlestickData.length === 0) return { min: 0, max: 100 };
    
    const allPrices = processedChartData.candlestickData.flatMap(item => item.y);
    const minPrice = Math.min(...allPrices);
    const maxPrice = Math.max(...allPrices);
    const padding = (maxPrice - minPrice) * 0.1;
    
    return {
      min: Math.max(0, minPrice - padding),
      max: maxPrice + padding
    };
  }, [processedChartData.candlestickData]);

  // TradingView-style chart configuration
  const chartOptions = {
    chart: {
      type: 'candlestick',
      height: height,
      width: '100%',
      background: 'transparent',
      foreColor: '#ffffff',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      toolbar: {
        show: true,
        tools: {
          download: true,
          selection: true,
          zoom: true,
          zoomin: true,
          zoomout: true,
          pan: true,
          reset: true
        },
        theme: 'dark'
      },
      zoom: {
        enabled: true,
        type: 'x',
        autoScaleYaxis: true
      },
      animations: {
        enabled: false // Better performance for lazy loading
      },
      events: {
        // Handle zoom/pan events for lazy loading
        zoomed: function(chartContext, { xaxis }) {
          if (xaxis && xaxis.min && xaxis.max) {
            const newStart = new Date(xaxis.min);
            const newEnd = new Date(xaxis.max);
            handleViewportChange(newStart, newEnd);
          }
        }
      }
    },
    title: {
      text: `${symbol} - TradingView Style Lazy Loading`,
      align: 'left',
      style: {
        fontSize: '18px',
        fontWeight: 'bold',
        color: '#ffffff'
      }
    },
    subtitle: {
      text: loading ? 'Loading data...' : `${processedChartData.candlestickData.length} candles loaded`,
      align: 'left',
      style: {
        fontSize: '14px',
        color: '#94a3b8'
      }
    },
    xaxis: {
      type: 'datetime',
      labels: {
        style: {
          colors: '#94a3b8'
        },
        formatter: function(val) {
          return format(new Date(val), 'MMM dd');
        }
      },
      axisBorder: {
        color: '#374151'
      },
      axisTicks: {
        color: '#374151'
      }
    },
    yaxis: {
      tooltip: {
        enabled: true
      },
      labels: {
        style: {
          colors: '#94a3b8'
        },
        formatter: function(val) {
          return `₹${val.toFixed(2)}`;
        }
      },
      min: yAxisRange.min,
      max: yAxisRange.max
    },
    grid: {
      borderColor: '#374151',
      strokeDashArray: 3,
      xaxis: {
        lines: {
          show: true
        }
      },
      yaxis: {
        lines: {
          show: true
        }
      }
    },
    plotOptions: {
      candlestick: {
        colors: {
          upward: '#22c55e',
          downward: '#ef4444'
        },
        wick: {
          useFillColor: true
        }
      }
    },
    dataLabels: {
      enabled: false
    },
    legend: {
      show: true,
      position: 'top',
      horizontalAlign: 'right',
      labels: {
        colors: '#94a3b8'
      }
    },
    tooltip: {
      enabled: true,
      theme: 'dark',
      style: {
        fontSize: '12px'
      },
      custom: function({ seriesIndex, dataPointIndex, w }) {
        const data = w.globals.initialSeries[seriesIndex].data[dataPointIndex];
        if (!data) return '';

        // Handle candlestick data
        if (seriesIndex === 0 && data.originalData) {
          const item = data.originalData;
          return `
            <div class="apexcharts-tooltip-candlestick" style="padding: 12px; background: #1f2937; border: 1px solid #374151; border-radius: 8px;">
              <div style="color: #06b6d4; font-weight: bold; margin-bottom: 8px;">
                ${format(new Date(data.x), 'MMM dd, yyyy')}
              </div>
              <div style="color: #ffffff; line-height: 1.5;">
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: #94a3b8;">Open:</span>
                  <span style="color: #06b6d4; font-weight: 500;">₹${parseFloat(item.OPEN_PRICE).toFixed(2)}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: #94a3b8;">High:</span>
                  <span style="color: #22c55e; font-weight: 500;">₹${parseFloat(item.HIGH_PRICE).toFixed(2)}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: #94a3b8;">Low:</span>
                  <span style="color: #ef4444; font-weight: 500;">₹${parseFloat(item.LOW_PRICE).toFixed(2)}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: #94a3b8;">Close:</span>
                  <span style="color: #06b6d4; font-weight: 500;">₹${parseFloat(item.CLOSE_PRICE).toFixed(2)}</span>
                </div>
                ${item.VOLUME ? `
                <div style="display: flex; justify-content: space-between; margin-top: 4px; padding-top: 4px; border-top: 1px solid #374151;">
                  <span style="color: #94a3b8;">Volume:</span>
                  <span style="color: #a78bfa; font-weight: 500;">${parseInt(item.VOLUME).toLocaleString()}</span>
                </div>
                ` : ''}
              </div>
            </div>
          `;
        }

        return '';
      }
    }
  };

  // Series data for ApexCharts
  const series = [
    {
      name: 'OHLC',
      type: 'candlestick',
      data: processedChartData.candlestickData
    },
    ...processedChartData.indicatorSeries
  ];

  // Loading state
  if (loading && chartData.length === 0) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-6">
        <div className="flex items-center justify-center" style={{ height: height }}>
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading TradingView-style chart...</p>
            <p className="text-gray-500 text-sm mt-2">Initializing lazy loading for {symbol}</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-6">
        <div className="flex items-center justify-center" style={{ height: height }}>
          <div className="text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h3 className="text-xl font-semibold text-white mb-2">Loading Error</h3>
            <p className="text-red-400 text-lg">{error}</p>
            <button 
              onClick={loadInitialData}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No data state
  if (!symbol) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-6">
        <div className="flex items-center justify-center" style={{ height: height }}>
          <div className="text-center">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-white mb-2">Select a Symbol</h3>
            <p className="text-gray-400 text-lg">Choose a stock symbol to view TradingView-style chart</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-6">
      {/* Chart Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-white">
            {symbol} - TradingView Style Lazy Loading
          </h3>
          <div className="flex items-center space-x-4 text-sm">
            <div className="text-slate-400">
              {processedChartData.candlestickData.length} candles loaded
            </div>
            {loading && (
              <div className="flex items-center text-blue-400">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400 mr-2"></div>
                Loading...
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-4 text-sm text-slate-400">
          <span>🔄 Progressive loading enabled</span>
          <span>🎯 Viewport-based fetching</span>
          <span>📦 Smart caching active</span>
        </div>
      </div>

      {/* TradingView-style Lazy Loading Chart */}
      <div className="w-full" style={{ minHeight: height }}>
        <React.Suspense 
          fallback={
            <div className="flex items-center justify-center" style={{ height: height }}>
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-400">Loading chart component...</p>
              </div>
            </div>
          }
        >
          <Chart
            ref={chartRef}
            options={chartOptions}
            series={series}
            type="candlestick"
            height={height}
            width="100%"
          />
        </React.Suspense>
      </div>

      {/* Chart Footer */}
      <div className="mt-4 text-xs text-gray-500 border-t border-gray-700 pt-3">
        <div className="flex justify-between">
          <span>💡 Zoom/Pan to load more data automatically</span>
          <span>Cache: {dataCache.current.size} ranges stored</span>
        </div>
        <div className="mt-2 text-center">
          <span className="text-slate-500">TradingView-style lazy loading • Optimized for performance</span>
        </div>
      </div>
    </div>
  );
};

export default LazyLoadingChart;