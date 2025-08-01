// src/components/ProfessionalStockDashboard.jsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Area, Brush } from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Activity, 
  DollarSign, 
  Target, 
  AlertCircle, 
  Loader,
  Building2
} from 'lucide-react';
import CandlestickChart from './CandlestickChart';
import StockPriceChart from './StockPriceChart';
import MultiFieldChart from './MultiFieldChart';

function ProfessionalStockDashboard({ 
  symbols = [], 
  selectedSymbol = '', 
  onSymbolChange, 
  stockData = [], 
  startDate, 
  endDate, 
  setStartDate, 
  setEndDate,
  dataLoading = false,
  dataError = null,
  onLoadAllData,
  selectedIndicators = [],
  onIndicatorChange,
  dataDateRange = { min: null, max: null },
  fullDatasetRange = { min: null, max: null }
}) {
  const [activeTab, setActiveTab] = useState('overview');
  const [brushStartIndex, setBrushStartIndex] = useState(null);
  const [brushEndIndex, setBrushEndIndex] = useState(null);
  const [sliderMin, setSliderMin] = useState(0);
  const [sliderMax, setSliderMax] = useState(100);
  const [selectedCrossoverSignals, setSelectedCrossoverSignals] = useState([]);
  const [isIndicatorDropdownOpen, setIsIndicatorDropdownOpen] = useState(false);
  const indicatorDropdownRef = useRef(null);
  const sliderTimeoutRef = useRef(null);
  const [chartsLoaded, setChartsLoaded] = useState(false);
  
  // Search states
  const [symbolSearch, setSymbolSearch] = useState('');
  const [debouncedSymbolSearch, setDebouncedSymbolSearch] = useState('');
  const [indicatorSearch, setIndicatorSearch] = useState('');
  const [signalSearch, setSignalSearch] = useState('');
  const [isSymbolDropdownOpen, setIsSymbolDropdownOpen] = useState(false);
  const [isSignalDropdownOpen, setIsSignalDropdownOpen] = useState(false);
  const symbolDropdownRef = useRef(null);
  const signalDropdownRef = useRef(null);
  const symbolSearchTimeoutRef = useRef(null);

  // Debounce symbol search for better performance
  useEffect(() => {
    if (symbolSearchTimeoutRef.current) {
      clearTimeout(symbolSearchTimeoutRef.current);
    }
    
    symbolSearchTimeoutRef.current = setTimeout(() => {
      setDebouncedSymbolSearch(symbolSearch);
    }, 150); // 150ms debounce
    
    return () => {
      if (symbolSearchTimeoutRef.current) {
        clearTimeout(symbolSearchTimeoutRef.current);
      }
    };
  }, [symbolSearch]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (indicatorDropdownRef.current && !indicatorDropdownRef.current.contains(event.target)) {
        setIsIndicatorDropdownOpen(false);
      }
      if (symbolDropdownRef.current && !symbolDropdownRef.current.contains(event.target)) {
        setIsSymbolDropdownOpen(false);
        setSymbolSearch(''); // Clear search when closing
      }
      if (signalDropdownRef.current && !signalDropdownRef.current.contains(event.target)) {
        setIsSignalDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Clean symbol name for display
  const getDisplaySymbol = useCallback((symbol) => {
    return symbol.replace('.NS', '').replace('.BO', '');
  }, []);

  // Available technical indicators (updated to match backend field names)
  const availableIndicators = [
    // Basic Price Data
    { value: 'CLOSE_PRICE', label: 'Close Price', color: '#3b82f6' },
    { value: 'OPEN_PRICE', label: 'Open Price', color: '#10b981' },
    { value: 'HIGH_PRICE', label: 'High Price', color: '#22c55e' },
    { value: 'LOW_PRICE', label: 'Low Price', color: '#ef4444' },
    { value: 'AVG_PRICE', label: 'Average Price', color: '#8b5cf6' },
    
    // Rolling Indicators
    { value: 'ROLLING_MEDIAN', label: 'Rolling Median', color: '#f59e0b' },
    { value: 'ROLLING_MODE', label: 'Rolling Mode', color: '#f97316' },
    
    // Pivot Points & Support/Resistance
    { value: 'PP', label: 'Pivot Point', color: '#6366f1' },
    { value: 'S1', label: 'Support 1', color: '#ef4444' },
    { value: 'S2', label: 'Support 2', color: '#dc2626' },
    { value: 'S3', label: 'Support 3', color: '#b91c1c' },
    { value: 'S4', label: 'Support 4', color: '#991b1b' },
    { value: 'R1', label: 'Resistance 1', color: '#22c55e' },
    { value: 'R2', label: 'Resistance 2', color: '#16a34a' },
    { value: 'R3', label: 'Resistance 3', color: '#15803d' },
    { value: 'R4', label: 'Resistance 4', color: '#166534' },
    { value: 'BC', label: 'Bottom Channel', color: '#be123c' },
    { value: 'TC', label: 'Top Channel', color: '#059669' },
    
    // VWAP Indicators
    { value: 'VWAP_W', label: 'VWAP Weekly', color: '#0ea5e9' },
    { value: 'VWAP_M', label: 'VWAP Monthly', color: '#0284c7' },
    { value: 'VWAP_Q', label: 'VWAP Quarterly', color: '#0369a1' },
    { value: 'VWAP_Y', label: 'VWAP Yearly', color: '#075985' },
    
    // VWAP Bands Weekly
    { value: 'VWAP_UPPER_1_W', label: 'VWAP Upper 1σ (W)', color: '#84cc16' },
    { value: 'VWAP_LOWER_1_W', label: 'VWAP Lower 1σ (W)', color: '#eab308' },
    { value: 'VWAP_UPPER_2_W', label: 'VWAP Upper 2σ (W)', color: '#65a30d' },
    { value: 'VWAP_LOWER_2_W', label: 'VWAP Lower 2σ (W)', color: '#ca8a04' },
    
    // EMAs
    { value: 'EMA_63', label: 'EMA 63', color: '#8b5cf6' },
    { value: 'EMA_144', label: 'EMA 144', color: '#a855f7' },
    { value: 'EMA_234', label: 'EMA 234', color: '#9333ea' },
    
    // Fibonacci Extensions
    { value: 'FIB_EXT_0.236', label: 'Fibonacci 23.6%', color: '#f472b6' },
    { value: 'FIB_EXT_0.786', label: 'Fibonacci 78.6%', color: '#ec4899' },
    
    // Linear Regression
    { value: 'LINREG_CURVE_63', label: 'LinReg Curve 63', color: '#14b8a6' },
    
    // Previous Levels
    { value: 'PREV_HIGH', label: 'Previous High', color: '#fbbf24' },
    { value: 'PREV_LOW', label: 'Previous Low', color: '#fb923c' },
    { value: 'PREV_CLOSE_X', label: 'Previous Close', color: '#f87171' }
  ];

  // Optimized filter functions with limits for performance
  const filteredSymbols = useMemo(() => {
    if (!debouncedSymbolSearch.trim()) {
      // Show first 50 symbols when no search
      return symbols.slice(0, 50);
    }
    
    const searchTerm = debouncedSymbolSearch.toLowerCase();
    const filtered = symbols.filter(symbol => 
      getDisplaySymbol(symbol).toLowerCase().includes(searchTerm)
    );
    
    // Limit results to 100 for performance
    return filtered.slice(0, 100);
  }, [symbols, debouncedSymbolSearch, getDisplaySymbol]);

  const filteredIndicators = useMemo(() => {
    return availableIndicators.filter(indicator => 
      indicator.label.toLowerCase().includes(indicatorSearch.toLowerCase())
    );
  }, [indicatorSearch]);

  // Available crossover signals with arrow marker styles
  const availableCrossoverSignals = [
    { 
      value: 'BullCross_63_144', 
      label: 'Bull Cross (63/144)', 
      color: '#22c55e',
      markerType: 'arrow-up',
      description: 'Bullish crossover of 63 over 144 EMA'
    },
    { 
      value: 'BearCross_63_144', 
      label: 'Bear Cross (63/144)', 
      color: '#ef4444',
      markerType: 'arrow-down',
      description: 'Bearish crossover of 63 under 144 EMA'
    },
    { 
      value: 'BullCross_144_234', 
      label: 'Bull Cross (144/234)', 
      color: '#10b981',
      markerType: 'arrow-up',
      description: 'Bullish crossover of 144 over 234 EMA'
    },
    { 
      value: 'BearCross_144_234', 
      label: 'Bear Cross (144/234)', 
      color: '#dc2626',
      markerType: 'arrow-down',
      description: 'Bearish crossover of 144 under 234 EMA'
    },
    { 
      value: 'BullCross_63_234', 
      label: 'Bull Cross (63/234)', 
      color: '#06b6d4',
      markerType: 'arrow-up',
      description: 'Bullish crossover of 63 over 234 EMA'
    },
    { 
      value: 'BearCross_63_234', 
      label: 'Bear Cross (63/234)', 
      color: '#be185d',
      markerType: 'arrow-down',
      description: 'Bearish crossover of 63 under 234 EMA'
    }
  ];

  const filteredSignals = useMemo(() => {
    return availableCrossoverSignals.filter(signal => 
      signal.label.toLowerCase().includes(signalSearch.toLowerCase())
    );
  }, [signalSearch]);

  // Debounced slider change handler
  const handleSliderChange = useCallback((percentage, isStart) => {
    if (sliderTimeoutRef.current) {
      clearTimeout(sliderTimeoutRef.current);
    }
    
    sliderTimeoutRef.current = setTimeout(() => {
      if (fullDatasetRange.min && fullDatasetRange.max) {
        const minTime = fullDatasetRange.min.getTime();
        const maxTime = fullDatasetRange.max.getTime();
        const selectedTime = minTime + (percentage / 100) * (maxTime - minTime);
        const selectedDate = new Date(selectedTime);
        
        if (isStart && setStartDate) {
          setStartDate(selectedDate);
        } else if (!isStart && setEndDate) {
          setEndDate(selectedDate);
        }
      }
    }, 150); // 150ms debounce
  }, [fullDatasetRange, setStartDate, setEndDate]);

  // Lazy load charts after initial render
  useEffect(() => {
    const timer = setTimeout(() => {
      setChartsLoaded(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);



  // Format date for input fields
  const formatDateForInput = (date) => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  };

  // Prepare chart data from your backend format - optimized for performance
  const chartFormattedData = React.useMemo(() => {
    console.log('🔍 Dashboard chartFormattedData processing - Raw stockData:', stockData?.length || 0, 'records');
    
    if (!stockData || stockData.length === 0) {
      return [];
    }
    
    // Use all data - no sampling to show all data points
    const sampleData = stockData;
    
    const formatted = sampleData
      .filter(d => d.CLOSE_PRICE && !isNaN(parseFloat(d.CLOSE_PRICE)))
      .map((d) => {
        const baseData = {
          date: d.TIMESTAMP,
          price: parseFloat(d.CLOSE_PRICE),
          timestamp: new Date(d.TIMESTAMP).getTime()
        };
        
        // Only add selected indicators to reduce memory usage
        selectedIndicators.forEach(indicatorValue => {
          if (d[indicatorValue] !== null && d[indicatorValue] !== undefined) {
            baseData[indicatorValue] = parseFloat(d[indicatorValue]);
          }
        });
        
        return baseData;
      });
    
    console.log('🔍 Dashboard chartFormattedData final result:', formatted.length, 'records');
    console.log('🔍 First 3 formatted records:', formatted.slice(0, 3));
    console.log('🔍 Last 3 formatted records:', formatted.slice(-3));
    
    return formatted;
  }, [stockData, selectedIndicators]); // Include selectedIndicators for efficiency

  // Calculate metrics - memoize to prevent recalculation
  const metrics = useMemo(() => {
    if (chartFormattedData.length === 0) {
      return { currentPrice: 0, previousPrice: 0, priceChange: 0, percentChange: 0, minPrice: 0, maxPrice: 0, avgPrice: 0 };
    }

    const prices = chartFormattedData.map(item => item.price);
    const currentPrice = prices[prices.length - 1] || 0;
    const previousPrice = prices.length > 1 ? prices[prices.length - 2] : currentPrice;
    const priceChange = currentPrice - previousPrice;
    const percentChange = previousPrice > 0 ? ((priceChange / previousPrice) * 100) : 0;
    
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    
    return { currentPrice, previousPrice, priceChange, percentChange, minPrice, maxPrice, avgPrice };
  }, [chartFormattedData]);
  
  const { currentPrice, previousPrice, priceChange, percentChange, minPrice, maxPrice, avgPrice } = metrics;

  const formatPrice = (price) => `₹${price.toFixed(2)}`;
  const formatPercent = (percent) => `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;

  const setQuickRange = (range) => {
    // Use actual data date range if available, otherwise fall back to current date
    const dataEndDate = dataDateRange.max || new Date();
    const dataStartDate = dataDateRange.min || new Date();
    
    let end = new Date(dataEndDate);
    end.setHours(23, 59, 59, 999);
    
    let start = new Date(dataEndDate); // Start from data end date and go back
    switch(range) {
      case '1M':
        start.setMonth(start.getMonth() - 1);
        break;
      case '3M':
        start.setMonth(start.getMonth() - 3);
        break;
      case '6M':
        start.setMonth(start.getMonth() - 6);
        break;
      case '1Y':
        start.setFullYear(start.getFullYear() - 1);
        break;
      default:
        start.setMonth(start.getMonth() - 6);
    }
    start.setHours(0, 0, 0, 0);
    
    // Ensure start date is not before the actual data start date
    if (start < dataStartDate) {
      start = new Date(dataStartDate);
    }
    
    
    if (setStartDate) setStartDate(start);
    if (setEndDate) setEndDate(end);
  };

  const formatDateTick = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  };

  // Handle brush/slider change for custom date range selection
  const handleBrushChange = (brushData) => {
    if (brushData && brushData.startIndex !== undefined && brushData.endIndex !== undefined) {
      setBrushStartIndex(brushData.startIndex);
      setBrushEndIndex(brushData.endIndex);
      
      // Update date range based on brush selection using actual data indices
      if (chartFormattedData.length > 0) {
        const startIndex = Math.max(0, brushData.startIndex);
        const endIndex = Math.min(chartFormattedData.length - 1, brushData.endIndex);
        
        const startDate = new Date(chartFormattedData[startIndex].date);
        const endDate = new Date(chartFormattedData[endIndex].date);
        
        
        if (setStartDate) setStartDate(startDate);
        if (setEndDate) setEndDate(endDate);
      }
    }
  };


  // Format date for brush display
  const formatBrushTick = (tickItem) => {
    if (typeof tickItem === 'number') {
      // tickItem is an index in this case
      if (chartFormattedData[tickItem]) {
        const date = new Date(chartFormattedData[tickItem].date);
        return date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
      }
    }
    return '';
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="bg-slate-800/50 backdrop-blur-lg border-b border-slate-700/50">
          <div className="w-full px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-3 rounded-xl">
                  <BarChart3 className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">Stock Analytics</h1>
                  <p className="text-slate-400">Indian Stock Market Dashboard</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="bg-slate-700/50 px-4 py-2 rounded-lg">
                  <span className="text-slate-300 text-sm">Last Updated:</span>
                  <span className="text-white ml-2">{new Date().toLocaleTimeString('en-IN')}</span>
                </div>
                <div className={`w-3 h-3 rounded-full ${dataLoading ? 'bg-yellow-500 animate-pulse' : 'bg-green-500 animate-pulse'}`}></div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="w-full px-6 py-8">
          {/* Compact Controls Section */}
          <div className="mb-4 relative z-[9998]">
            <div className="bg-slate-800/50 backdrop-blur-lg rounded-xl border border-slate-700/50 p-4">
              {/* Top Row - Main Controls */}
              <div className="flex flex-wrap items-center gap-4 mb-4">
                {/* Symbol Selector with Search */}
                <div className="flex items-center gap-2 min-w-0 relative z-[10000]">
                  <label className="text-sm font-medium text-slate-300 whitespace-nowrap">Symbol:</label>
                  <div className="relative" ref={symbolDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setIsSymbolDropdownOpen(!isSymbolDropdownOpen)}
                      className="bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all min-w-[240px] h-10 flex items-center justify-between"
                    >
                      <span className="truncate">
                        {selectedSymbol ? getDisplaySymbol(selectedSymbol) : 'Select Symbol'}
                      </span>
                      <svg className={`w-4 h-4 transition-transform ${isSymbolDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {isSymbolDropdownOpen && (
                      <div className="absolute top-full left-0 mt-1 w-full bg-slate-700 border border-slate-600 rounded-lg shadow-xl z-[99999] max-h-60 overflow-hidden">
                        <div className="p-2 border-b border-slate-600">
                          <input
                            type="text"
                            placeholder="Type to search 3,621 symbols..."
                            value={symbolSearch}
                            onChange={(e) => setSymbolSearch(e.target.value)}
                            className="w-full bg-slate-600 border border-slate-500 rounded px-2 py-1 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            autoFocus
                          />
                          {symbolSearch.trim() && symbolSearch !== debouncedSymbolSearch && (
                            <div className="text-xs text-blue-400 mt-1 flex items-center gap-1">
                              <div className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                              Searching...
                            </div>
                          )}
                          {symbolSearch.trim() && symbolSearch === debouncedSymbolSearch && filteredSymbols.length === 100 && (
                            <div className="text-xs text-slate-400 mt-1">
                              Showing first 100 matches. Refine search for more.
                            </div>
                          )}
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          {filteredSymbols.map(symbol => (
                            <button
                              key={symbol}
                              onClick={() => {
                                onSymbolChange && onSymbolChange(symbol);
                                setIsSymbolDropdownOpen(false);
                                setSymbolSearch('');
                                setDebouncedSymbolSearch('');
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-slate-600/50 text-white text-sm border-none bg-transparent"
                            >
                              {getDisplaySymbol(symbol)}
                            </button>
                          ))}
                          {filteredSymbols.length === 0 && (
                            <div className="px-3 py-2 text-slate-400 text-sm">No symbols found</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Technical Indicators with Checkbox Dropdown */}
                <div className="flex items-center gap-2 min-w-0 relative z-[10000]">
                  <label className="text-sm font-medium text-slate-300 whitespace-nowrap">Indicators:</label>
                  <div className="relative z-[10000]" ref={indicatorDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setIsIndicatorDropdownOpen(!isIndicatorDropdownOpen)}
                      className="bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all min-w-[240px] h-10 flex items-center justify-between"
                    >
                      <span className="truncate">
                        {selectedIndicators.length === 0 
                          ? 'Select Indicators' 
                          : `${selectedIndicators.length} selected`
                        }
                      </span>
                      <svg className={`w-4 h-4 transition-transform ${isIndicatorDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {isIndicatorDropdownOpen && (
                      <div className="absolute top-full left-0 mt-1 w-full bg-slate-700 border border-slate-600 rounded-lg shadow-xl z-[99999] max-h-60 overflow-hidden">
                        <div className="p-2 border-b border-slate-600">
                          <input
                            type="text"
                            placeholder="Search indicators..."
                            value={indicatorSearch}
                            onChange={(e) => setIndicatorSearch(e.target.value)}
                            className="w-full bg-slate-600 border border-slate-500 rounded px-2 py-1 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          {filteredIndicators.map(indicator => (
                            <label key={indicator.value} className="flex items-center px-3 py-2 hover:bg-slate-600/50 cursor-pointer text-sm">
                              <input
                                type="checkbox"
                                checked={selectedIndicators.includes(indicator.value)}
                                onChange={(e) => {
                                  let newSelected;
                                  if (e.target.checked) {
                                    newSelected = [...selectedIndicators, indicator.value];
                                  } else {
                                    newSelected = selectedIndicators.filter(id => id !== indicator.value);
                                  }
                                  console.log('📊 Indicator selection changed:', newSelected);
                                  onIndicatorChange && onIndicatorChange(newSelected);
                                }}
                                className="mr-2 w-4 h-4 text-blue-500 bg-slate-600 border-slate-500 rounded focus:ring-blue-500 focus:ring-2"
                              />
                              <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: indicator.color }}></div>
                              <span className="text-white truncate">{indicator.label}</span>
                            </label>
                          ))}
                          {filteredIndicators.length === 0 && (
                            <div className="px-3 py-2 text-slate-400 text-sm">No indicators found</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Crossover Signals with Search */}
                <div className="flex items-center gap-2 min-w-0 relative z-[10000]">
                  <label className="text-sm font-medium text-slate-300 whitespace-nowrap">Signal:</label>
                  <div className="relative" ref={signalDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setIsSignalDropdownOpen(!isSignalDropdownOpen)}
                      className="bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all min-w-[240px] h-10 flex items-center justify-between"
                    >
                      <span className="truncate">
                        {selectedCrossoverSignals.length > 0 
                          ? availableCrossoverSignals.find(s => s.value === selectedCrossoverSignals[0])?.label || 'Signal Selected'
                          : 'No Signal'
                        }
                      </span>
                      <svg className={`w-4 h-4 transition-transform ${isSignalDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {isSignalDropdownOpen && (
                      <div className="absolute top-full left-0 mt-1 w-full bg-slate-700 border border-slate-600 rounded-lg shadow-xl z-[99999] max-h-60 overflow-hidden">
                        <div className="p-2 border-b border-slate-600">
                          <input
                            type="text"
                            placeholder="Search signals..."
                            value={signalSearch}
                            onChange={(e) => setSignalSearch(e.target.value)}
                            className="w-full bg-slate-600 border border-slate-500 rounded px-2 py-1 text-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          />
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          <button
                            onClick={() => {
                              setSelectedCrossoverSignals([]);
                              setIsSignalDropdownOpen(false);
                              setSignalSearch('');
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-slate-600/50 text-slate-400 text-sm border-none bg-transparent"
                          >
                            No Signal
                          </button>
                          {filteredSignals.map(signal => (
                            <button
                              key={signal.value}
                              onClick={() => {
                                setSelectedCrossoverSignals([signal.value]);
                                setIsSignalDropdownOpen(false);
                                setSignalSearch('');
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-slate-600/50 text-white text-sm border-none bg-transparent flex items-center"
                            >
                              <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: signal.color }}></div>
                              {signal.label}
                            </button>
                          ))}
                          {filteredSignals.length === 0 && signalSearch && (
                            <div className="px-3 py-2 text-slate-400 text-sm">No signals found</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Date Range Sliders */}
                {fullDatasetRange.min && fullDatasetRange.max && (
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <label className="text-sm font-medium text-slate-300 whitespace-nowrap">Date Range:</label>
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="0.5"
                        value={startDate ? ((startDate.getTime() - fullDatasetRange.min.getTime()) / (fullDatasetRange.max.getTime() - fullDatasetRange.min.getTime())) * 100 : 0}
                        onChange={(e) => handleSliderChange(parseFloat(e.target.value), true)}
                        className="flex-1 h-2 bg-gradient-to-r from-green-500 to-slate-600 rounded appearance-none cursor-pointer min-w-[100px]"
                      />
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="0.5"
                        value={endDate ? ((endDate.getTime() - fullDatasetRange.min.getTime()) / (fullDatasetRange.max.getTime() - fullDatasetRange.min.getTime())) * 100 : 100}
                        onChange={(e) => handleSliderChange(parseFloat(e.target.value), false)}
                        className="flex-1 h-2 bg-gradient-to-r from-slate-600 to-red-500 rounded appearance-none cursor-pointer min-w-[100px]"
                      />
                    </div>
                    <div className="text-xs text-slate-400 whitespace-nowrap">
                      {startDate ? startDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : 'Start'} → {endDate ? endDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : 'End'}
                    </div>
                  </div>
                )}

                {/* Quick Range Buttons */}
                <div className="flex items-center gap-1">
                  {['1M', '3M', '6M', '1Y'].map(range => (
                    <button
                      key={range}
                      onClick={() => setQuickRange(range)}
                      className="px-2 py-1 bg-slate-700/50 hover:bg-blue-500/20 text-slate-300 hover:text-white rounded text-xs transition-all duration-200"
                    >
                      {range}
                    </button>
                  ))}
                  {onLoadAllData && (
                    <button
                      onClick={onLoadAllData}
                      className="px-2 py-1 bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 hover:text-white rounded text-xs transition-all duration-200"
                    >
                      All
                    </button>
                  )}
                </div>
              </div>


              {/* Selected Items Display */}
              {(selectedIndicators.length > 0 || selectedCrossoverSignals.length > 0) && (
                <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-700/30">
                  {selectedIndicators.map(indicatorValue => {
                    const indicator = availableIndicators.find(ind => ind.value === indicatorValue);
                    return (
                      <span key={indicatorValue} className="inline-flex items-center gap-1 px-3 py-1 bg-slate-600/50 rounded-full text-xs text-slate-300">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: indicator?.color || '#10b981' }}></div>
                        📊 {indicator?.label || indicatorValue}
                      </span>
                    );
                  })}
                  {selectedCrossoverSignals.length > 0 && (() => {
                    const signal = availableCrossoverSignals.find(s => s.value === selectedCrossoverSignals[0]);
                    return (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs text-white" style={{ backgroundColor: signal?.color + '40', borderLeft: `3px solid ${signal?.color}` }}>
                        🎯 {signal?.label}
                      </span>
                    );
                  })()}
                </div>
              )}

              <style jsx>{`
                input[type="range"]::-webkit-slider-thumb {
                  appearance: none;
                  height: 16px;
                  width: 16px;
                  border-radius: 50%;
                  background: white;
                  border: 2px solid #3b82f6;
                  box-shadow: 0 1px 3px rgba(0,0,0,0.3);
                  cursor: grab;
                }
                input[type="range"]::-webkit-slider-thumb:active {
                  cursor: grabbing;
                  transform: scale(1.1);
                }
              `}</style>
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-8">
            <div className="flex space-x-1 bg-slate-800/30 p-1 rounded-xl">
              {[
                { id: 'overview', label: 'Overview', icon: Activity },
                { id: 'fields', label: 'Volume Analysis', icon: Target },
                { id: 'analysis', label: 'Analysis', icon: TrendingUp },
                { id: 'alerts', label: 'Alerts', icon: AlertCircle }
              ].map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                      activeTab === tab.id 
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg' 
                        : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Loading State */}
          {dataLoading && (
            <div className="bg-slate-800/50 backdrop-blur-lg rounded-2xl border border-slate-700/50 p-8 text-center">
              <Loader className="w-16 h-16 text-blue-400 mx-auto mb-4 animate-spin" />
              <h3 className="text-xl font-semibold text-white mb-2">Loading Stock Data</h3>
              <p className="text-slate-400">Fetching data for {getDisplaySymbol(selectedSymbol)}...</p>
            </div>
          )}

          {/* Error State */}
          {dataError && (
            <div className="bg-red-500/10 backdrop-blur-lg rounded-2xl border border-red-500/20 p-8 text-center">
              <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Error Loading Data</h3>
              <p className="text-red-400">{dataError}</p>
            </div>
          )}

          {/* Overview Tab */}
          {activeTab === 'overview' && !dataLoading && !dataError && stockData.length > 0 && (
            <div className="space-y-8">
              {/* Compact Key Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-8 gap-3 mb-6">
                <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 backdrop-blur-lg rounded-lg border border-blue-500/20 p-3">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-slate-400 text-xs truncate">Current Price</p>
                      <p className="text-lg font-bold text-white truncate">{formatPrice(currentPrice)}</p>
                      <div className={`flex items-center space-x-1 ${priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {priceChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        <span className="text-xs font-medium truncate">{formatPercent(percentChange)}</span>
                      </div>
                    </div>
                    <div className="bg-blue-500/20 p-2 rounded-lg ml-2">
                      <DollarSign className="w-4 h-4 text-blue-400" />
                    </div>
                  </div>
                </div>

                <div className={`bg-gradient-to-br ${((currentPrice - (chartFormattedData[0]?.price || 0)) >= 0) ? 'from-emerald-500/10 to-emerald-600/10 border-emerald-500/20' : 'from-rose-500/10 to-rose-600/10 border-rose-500/20'} backdrop-blur-lg rounded-lg border p-3`}>
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-slate-400 text-xs truncate">Total Change</p>
                      <p className="text-lg font-bold text-white truncate">
                        {formatPrice(Math.abs(currentPrice - (chartFormattedData[0]?.price || 0)))}
                      </p>
                      <div className={`flex items-center space-x-1 ${((currentPrice - (chartFormattedData[0]?.price || 0)) >= 0) ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {((currentPrice - (chartFormattedData[0]?.price || 0)) >= 0) ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        <span className="text-xs font-medium truncate">
                          {formatPercent(((currentPrice - (chartFormattedData[0]?.price || 0)) / (chartFormattedData[0]?.price || 1)) * 100)}
                        </span>
                      </div>
                    </div>
                    <div className={`${((currentPrice - (chartFormattedData[0]?.price || 0)) >= 0) ? 'bg-emerald-500/20' : 'bg-rose-500/20'} p-2 rounded-lg ml-2`}>
                      {((currentPrice - (chartFormattedData[0]?.price || 0)) >= 0) ? 
                        <TrendingUp className={`w-4 h-4 ${((currentPrice - (chartFormattedData[0]?.price || 0)) >= 0) ? 'text-emerald-400' : 'text-rose-400'}`} /> : 
                        <TrendingDown className={`w-4 h-4 ${((currentPrice - (chartFormattedData[0]?.price || 0)) >= 0) ? 'text-emerald-400' : 'text-rose-400'}`} />
                      }
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 backdrop-blur-lg rounded-lg border border-green-500/20 p-3">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-slate-400 text-xs truncate">Maximum</p>
                      <p className="text-lg font-bold text-white truncate">{formatPrice(maxPrice)}</p>
                      <p className="text-green-400 text-xs truncate">Period High</p>
                    </div>
                    <div className="bg-green-500/20 p-2 rounded-lg ml-2">
                      <TrendingUp className="w-4 h-4 text-green-400" />
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-red-500/10 to-red-600/10 backdrop-blur-lg rounded-lg border border-red-500/20 p-3">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-slate-400 text-xs truncate">Minimum</p>
                      <p className="text-lg font-bold text-white truncate">{formatPrice(minPrice)}</p>
                      <p className="text-red-400 text-xs truncate">Period Low</p>
                    </div>
                    <div className="bg-red-500/20 p-2 rounded-lg ml-2">
                      <TrendingDown className="w-4 h-4 text-red-400" />
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 backdrop-blur-lg rounded-lg border border-orange-500/20 p-3">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-slate-400 text-xs truncate">Average</p>
                      <p className="text-lg font-bold text-white truncate">{formatPrice(avgPrice)}</p>
                      <p className="text-orange-400 text-xs truncate">Period Avg</p>
                    </div>
                    <div className="bg-orange-500/20 p-2 rounded-lg ml-2">
                      <Target className="w-4 h-4 text-orange-400" />
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-teal-500/10 to-teal-600/10 backdrop-blur-lg rounded-lg border border-teal-500/20 p-3">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-slate-400 text-xs truncate">Volatility</p>
                      <p className="text-lg font-bold text-white truncate">{avgPrice > 0 ? (((maxPrice - minPrice) / avgPrice) * 100).toFixed(1) : '0.0'}%</p>
                      <p className="text-teal-400 text-xs truncate">Range</p>
                    </div>
                    <div className="bg-teal-500/20 p-2 rounded-lg ml-2">
                      <Activity className="w-4 h-4 text-teal-400" />
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 backdrop-blur-lg rounded-lg border border-purple-500/20 p-3">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-slate-400 text-xs truncate">Data Points</p>
                      <p className="text-lg font-bold text-white truncate">{stockData.length}</p>
                      <p className="text-purple-400 text-xs truncate">Days</p>
                    </div>
                    <div className="bg-purple-500/20 p-2 rounded-lg ml-2">
                      <BarChart3 className="w-4 h-4 text-purple-400" />
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-indigo-500/10 to-indigo-600/10 backdrop-blur-lg rounded-lg border border-indigo-500/20 p-3">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-slate-400 text-xs truncate">Price Category</p>
                      <p className="text-lg font-bold text-white truncate">
                        {stockData.length > 0 
                          ? (stockData[stockData.length - 1]?.PRICE_CATEGORY || stockData[stockData.length - 1]?.Price_Category || 'N/A')
                          : 'N/A'
                        }
                      </p>
                      <p className="text-indigo-400 text-xs truncate">Classification</p>
                    </div>
                    <div className="bg-indigo-500/20 p-2 rounded-lg ml-2">
                      <Building2 className="w-4 h-4 text-indigo-400" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Enhanced Interactive Price Chart */}
              {chartsLoaded ? (
                <StockPriceChart
                  data={stockData}
                  selectedSymbol={selectedSymbol}
                  height={450}
                  loading={dataLoading}
                  selectedIndicators={selectedIndicators}
                  selectedCrossoverSignals={selectedCrossoverSignals}
                  availableCrossoverSignals={availableCrossoverSignals}
                />
              ) : (
                <div className="bg-slate-800/50 backdrop-blur-lg rounded-2xl border border-slate-700/50 p-8 text-center h-[450px] flex items-center justify-center">
                  <div className="text-slate-400">Loading chart...</div>
                </div>
              )}

              {/* Candlestick Chart */}
              {chartsLoaded ? (
                <CandlestickChart
                  data={stockData}
                  symbol={selectedSymbol}
                  height={600}
                  loading={dataLoading}
                  selectedIndicators={selectedIndicators}
                  selectedCrossoverSignals={selectedCrossoverSignals}
                  availableCrossoverSignals={availableCrossoverSignals}
                />
              ) : (
                <div className="bg-slate-800/50 backdrop-blur-lg rounded-2xl border border-slate-700/50 p-8 text-center h-[600px] flex items-center justify-center">
                  <div className="text-slate-400">Loading candlestick chart...</div>
                </div>
              )}

            </div>
          )}

          {/* No Data State */}
          {!dataLoading && !dataError && stockData.length === 0 && selectedSymbol && (
            <div className="bg-slate-800/50 backdrop-blur-lg rounded-2xl border border-slate-700/50 p-8 text-center">
              <BarChart3 className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Data Available</h3>
              <p className="text-slate-400">No data found for {getDisplaySymbol(selectedSymbol)} in the selected date range.</p>
            </div>
          )}


          {/* Volume Analysis Tab */}
          {activeTab === 'fields' && (
            <div className="space-y-6">
              <MultiFieldChart
                data={stockData}
                selectedSymbol={selectedSymbol}
                loading={dataLoading}
              />
            </div>
          )}

          {/* Analysis Tab */}
          {activeTab === 'analysis' && (
            <div className="bg-slate-800/50 backdrop-blur-lg rounded-2xl border border-slate-700/50 p-8 text-center">
              <TrendingUp className="w-16 h-16 text-blue-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Advanced Analysis</h3>
              <p className="text-slate-400">Technical analysis and AI-powered insights coming soon</p>
            </div>
          )}

          {/* Alerts Tab */}
          {activeTab === 'alerts' && (
            <div className="bg-slate-800/50 backdrop-blur-lg rounded-2xl border border-slate-700/50 p-8 text-center">
              <AlertCircle className="w-16 h-16 text-orange-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Price Alerts</h3>
              <p className="text-slate-400">Set up custom alerts for price movements and market events</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default ProfessionalStockDashboard;