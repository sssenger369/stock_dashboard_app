// src/App.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import ProfessionalStockDashboard from './components/ProfessionalStockDashboard';
import TestComponent from './components/TestComponent';

function App() {
  const [symbols, setSymbols] = useState([]);
  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [stockData, setStockData] = useState([]);
  const [startDate, setStartDate] = useState(null); // Don't set default, wait for data
  const [endDate, setEndDate] = useState(null); // Don't set default, wait for data
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState(null);
  const [symbolsLoading, setSymbolsLoading] = useState(true);
  const [selectedIndicators, setSelectedIndicators] = useState([]);
  const [dataDateRange, setDataDateRange] = useState({ min: null, max: null });
  const [fullDatasetRange, setFullDatasetRange] = useState({ min: null, max: null }); // Fixed dataset boundaries

  // FastAPI backend URL - uses environment variable for production
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
  
  // Add data cache and loading state management
  const dataCache = useRef(new Map());
  const loadingRef = useRef(false);
  const lastRequestRef = useRef('');

  // Load available symbols from FastAPI backend
  const loadSymbols = async () => {
    setSymbolsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/symbols`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch symbols: ${response.status}`);
      }
      
      const symbolsData = await response.json();
      console.log('Loaded symbols:', symbolsData);
      
      setSymbols(symbolsData);
      
      // Set first symbol as default if none selected
      if (symbolsData.length > 0 && !selectedSymbol) {
        setSelectedSymbol(symbolsData[0]);
      }
      
    } catch (error) {
      console.error('Error loading symbols:', error);
      setDataError(`Failed to load symbols: ${error.message}`);
      
      // Fallback to some common Indian symbols if API fails
      const fallbackSymbols = ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'HINDUNILVR'];
      setSymbols(fallbackSymbols);
      setSelectedSymbol(fallbackSymbols[0]);
    } finally {
      setSymbolsLoading(false);
    }
  };

  // Fetch stock data from FastAPI backend
  const fetchStockData = useCallback(async (symbol, start, end, loadAll = false) => {
    if (!symbol) return;
    
    setDataLoading(true);
    setDataError(null);
    
    try {
      let apiUrl = `${API_BASE_URL}/stock_data/${symbol}?frequency=Daily`;
      
      if (!loadAll) {
        // Format dates for API (YYYY-MM-DD)
        const startDateStr = start.toISOString().split('T')[0];
        const endDateStr = end.toISOString().split('T')[0];
        apiUrl += `&start_date=${startDateStr}&end_date=${endDateStr}`;
        console.log(`Fetching data for ${symbol} from ${startDateStr} to ${endDateStr}`);
      } else {
        console.log(`Fetching ALL data for ${symbol}`);
      }
      
      // Call your FastAPI endpoint
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`No data found for ${symbol}${loadAll ? '' : ' in the selected date range'}`);
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`Received ${data.length} records for ${symbol}`);
      
      // Debug: Log available fields in first record
      if (data.length > 0) {
        console.log('🔍 Backend fields available:', Object.keys(data[0]));
        console.log('🔍 Stock info fields in backend:', {
          SECTOR: data[0].SECTOR,
          INDUSTRY: data[0].INDUSTRY,
          MCAP_CATEGORY: data[0].MCAP_CATEGORY,
          STOCK_RATING: data[0].STOCK_RATING,
          QUALITY_SCORE: data[0].QUALITY_SCORE,
          GROWTH_SCORE: data[0].GROWTH_SCORE,
          NIFTY_50: data[0].NIFTY_50,
          NIFTY_500: data[0].NIFTY_500,
          NEXT_50: data[0].NEXT_50,
          ALPHA_50: data[0].ALPHA_50,
          BETA_50: data[0].BETA_50,
          FNO: data[0].FNO,
          FLAG: data[0].FLAG
        });
      }
      
      // Transform FastAPI data to match dashboard format
      const transformedData = data.map(record => {
        const baseData = {
          TIMESTAMP: record.TIMESTAMP.split('T')[0], // Convert ISO datetime to date string
          CLOSE_PRICE: record.CLOSE_PRICE?.toString() || '0',
          // Add OHLC data for candlestick charts
          OPEN_PRICE: record.OPEN_PRICE?.toString() || record.CLOSE_PRICE?.toString() || '0',
          HIGH_PRICE: record.HIGH_PRICE?.toString() || record.CLOSE_PRICE?.toString() || '0',
          LOW_PRICE: record.LOW_PRICE?.toString() || record.CLOSE_PRICE?.toString() || '0'
        };
        
        
        // Add all available fields from the backend response except basic OHLC and duplicate fields
        const excludedFields = [
          'TIMESTAMP', 'SYMBOL', 'SERIES', 'OPEN_PRICE', 'HIGH_PRICE', 'LOW_PRICE', 'CLOSE_PRICE',
          'LAST_PRICE', 'AVG_PRICE', 'VOLUME', 'TURNOVER_LACS', 'NO_OF_TRADES', 'DELIV_QTY', 'DELIV_PER',
          'TRADE_DATE', 'SECURITY', 'PREV_CLOSE_X', 'PREV_CLOSE_Y'
          // Removed SECTOR, INDUSTRY to allow stock info fields
        ];
        
        // Dynamically include all other fields from the backend response
        Object.keys(record).forEach(field => {
          if (!excludedFields.includes(field) && record[field] !== undefined && record[field] !== null) {
            // Convert to number if it's a numeric field, otherwise keep as string
            const value = record[field];
            if (typeof value === 'number' || (typeof value === 'string' && !isNaN(parseFloat(value)))) {
              baseData[field] = parseFloat(value) || null;
            } else {
              baseData[field] = value;
            }
          }
        });
        
        return baseData;
      });
      
      setStockData(transformedData);
      console.log(`✅ Successfully loaded ${transformedData.length} data points for ${symbol}`);
      
      // Debug: Log transformed data fields
      if (transformedData.length > 0) {
        console.log('🔍 Transformed data fields:', Object.keys(transformedData[0]));
        console.log('🔍 Stock info in transformed data:', {
          SECTOR: transformedData[0].SECTOR,
          INDUSTRY: transformedData[0].INDUSTRY,
          MCAP_CATEGORY: transformedData[0].MCAP_CATEGORY,
          STOCK_RATING: transformedData[0].STOCK_RATING,
          QUALITY_SCORE: transformedData[0].QUALITY_SCORE,
          GROWTH_SCORE: transformedData[0].GROWTH_SCORE,
          NIFTY_50: transformedData[0].NIFTY_50,
          NIFTY_500: transformedData[0].NIFTY_500,
          FNO: transformedData[0].FNO
        });
      }
      
      // Calculate date range of the loaded data
      if (transformedData.length > 0) {
        const dates = transformedData.map(d => new Date(d.TIMESTAMP)).sort((a, b) => a - b);
        const minDate = dates[0];
        const maxDate = dates[dates.length - 1];
        
        console.log('📅 Current data date range:', {
          min: minDate.toISOString().split('T')[0],
          max: maxDate.toISOString().split('T')[0],
          totalDays: transformedData.length
        });
        
        // ONLY update dataDateRange and fullDatasetRange if this is a full data load (loadAll=true)
        // This ensures slider boundaries remain fixed to the full data range
        if (loadAll) {
          setDataDateRange({ min: minDate, max: maxDate });
          setFullDatasetRange({ min: minDate, max: maxDate }); // Set FIXED dataset boundaries
          console.log(`📊 Updated FULL dataset range bounds: ${minDate.toISOString().split('T')[0]} to ${maxDate.toISOString().split('T')[0]}`);
          
          // Set dates to FULL RANGE when new symbol is loaded
          setStartDate(minDate);
          setEndDate(maxDate);
        } else {
          console.log(`🔒 PRESERVING fixed slider bounds (fullDatasetRange unchanged), filtered data range: ${minDate.toISOString().split('T')[0]} to ${maxDate.toISOString().split('T')[0]}`);
          // For filtered data, we still update dataDateRange to show what data is currently loaded
          setDataDateRange({ min: minDate, max: maxDate });
        }
        
        console.log('⏱️ Days in current data:', Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)));
      } else {
        setDataDateRange({ min: null, max: null });
      }
      
    } catch (error) {
      console.error('API Error:', error);
      setDataError(error.message);
      setStockData([]);
    } finally {
      setDataLoading(false);
    }
  }, []);

  // Load symbols on component mount
  useEffect(() => {
    loadSymbols();
  }, []);

  // Load stock data when symbol changes (initially load all data)
  useEffect(() => {
    if (selectedSymbol && !symbolsLoading) {
      // For initial load or symbol change, load all data first
      if (!startDate || !endDate) {
        console.log('🚀 Loading all data for symbol:', selectedSymbol);
        fetchStockData(selectedSymbol, null, null, true); // Load all data
      } else {
        // For date range changes, use debounced API calls
        const timeoutId = setTimeout(() => {
          fetchStockData(selectedSymbol, startDate, endDate, false);
        }, 1000); // Longer debounce to prevent rapid calls
        
        return () => clearTimeout(timeoutId);
      }
    }
  }, [selectedSymbol, symbolsLoading]); // REMOVED startDate and endDate from dependencies!

  // Separate useEffect for date range changes (only after initial data is loaded)
  useEffect(() => {
    if (selectedSymbol && startDate && endDate && dataDateRange.min && dataDateRange.max && !symbolsLoading) {
      // Only trigger if dates are significantly different from data range
      const isDefaultRange = Math.abs(startDate.getTime() - dataDateRange.min.getTime()) < 86400000 && 
                             Math.abs(endDate.getTime() - dataDateRange.max.getTime()) < 86400000;
      
      if (!isDefaultRange) {
        console.log('📅 Date range changed, fetching filtered data');
        const timeoutId = setTimeout(() => {
          fetchStockData(selectedSymbol, startDate, endDate, false);
        }, 1500); // Even longer debounce for date changes
        
        return () => clearTimeout(timeoutId);
      }
    }
  }, [startDate, endDate]); // Only depend on dates, not symbol

  // Handle symbol change
  const handleSymbolChange = useCallback((newSymbol) => {
    console.log('Symbol changed to:', newSymbol);
    setSelectedSymbol(newSymbol);
    // Reset date range when symbol changes to trigger fresh data load
    setStartDate(null);
    setEndDate(null);
    setDataDateRange({ min: null, max: null });
    setFullDatasetRange({ min: null, max: null }); // Reset fixed boundaries
  }, []);

  // Handle loading all data for selected symbol
  const handleLoadAllData = useCallback(() => {
    console.log('All button clicked! Loading all data for:', selectedSymbol);
    if (selectedSymbol) {
      fetchStockData(selectedSymbol, null, null, true); // Pass true for loadAll
    } else {
      console.log('No symbol selected');
    }
  }, [selectedSymbol, fetchStockData]);

  // Handle indicator selection
  const handleIndicatorChange = useCallback((indicators) => {
    console.log('Selected indicators:', indicators);
    setSelectedIndicators(indicators);
  }, []);

  // Show loading state while symbols are loading
  if (symbolsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-white mb-2">Loading Stock Symbols</h2>
          <p className="text-slate-400">Connecting to FastAPI backend...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <ProfessionalStockDashboard
        symbols={symbols}
        selectedSymbol={selectedSymbol}
        onSymbolChange={handleSymbolChange}
        stockData={stockData}
        dataLoading={dataLoading}
        dataError={dataError}
        startDate={startDate}
        endDate={endDate}
        setStartDate={setStartDate}
        setEndDate={setEndDate}
        fullDatasetRange={fullDatasetRange}
        onLoadAllData={handleLoadAllData}
        selectedIndicators={selectedIndicators}
        onIndicatorChange={handleIndicatorChange}
      />
    </div>
  );
}

export default App;