// frontend/src/components/CandlestickChart.jsx
import React, { useMemo } from 'react';
import Chart from 'react-apexcharts';
import { format, parseISO, isValid } from 'date-fns';

/**
 * Professional Candlestick Chart Component - TradingView Style
 * 
 * @param {Object} props
 * @param {Array} props.data - Array of OHLC data objects
 * @param {string} props.symbol - Stock symbol for title
 * @param {number} props.height - Chart height in pixels (default: 500)
 * @param {boolean} props.loading - Loading state
 * @param {Array} props.selectedIndicators - Array of technical indicators to display
 * @param {Array} props.selectedCrossoverSignals - Array of crossover signals to display as markers
 * @param {Array} props.availableCrossoverSignals - Array of available crossover signal configs
 * @param {Object} props.style - Additional styling
 */
const CandlestickChart = ({ 
  data = [], 
  symbol = '', 
  height = 500, 
  loading = false,
  selectedIndicators = [],
  selectedCrossoverSignals = [],
  availableCrossoverSignals = [],
  style = {} 
}) => {
  
  // Clean subtitle generation
  const subtitle = useMemo(() => {
    if (!data || data.length === 0) return 'OHLC Technical Analysis';
    
    const totalCandles = data.length;
    const firstDate = data[0]?.TIMESTAMP ? new Date(data[0].TIMESTAMP).toLocaleDateString() : '';
    const lastDate = data[data.length - 1]?.TIMESTAMP ? new Date(data[data.length - 1].TIMESTAMP).toLocaleDateString() : '';
    
    if (firstDate && lastDate && firstDate !== lastDate) {
      return `${totalCandles} Trading Sessions • ${firstDate} to ${lastDate}`;
    } else if (firstDate) {
      return `${totalCandles} Trading Sessions • ${firstDate}`;
    } else {
      return `${totalCandles} Trading Sessions • Technical Analysis`;
    }
  }, [data]);

  // Transform data for ApexCharts candlestick format and technical indicators
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return { candlestickData: [], indicatorSeries: [], crossoverMarkers: [] };
    
    // Filter out invalid data points (convert strings to numbers for validation)
    const cleanData = data.filter(item => 
      item.OPEN_PRICE && 
      item.HIGH_PRICE && 
      item.LOW_PRICE && 
      item.CLOSE_PRICE &&
      !isNaN(parseFloat(item.OPEN_PRICE)) &&
      !isNaN(parseFloat(item.HIGH_PRICE)) &&
      !isNaN(parseFloat(item.LOW_PRICE)) &&
      !isNaN(parseFloat(item.CLOSE_PRICE))
    );

    if (cleanData.length === 0) return { candlestickData: [], indicatorSeries: [], crossoverMarkers: [] };

    // Sort by timestamp
    cleanData.sort((a, b) => new Date(a.TIMESTAMP) - new Date(b.TIMESTAMP));

    // Prepare candlestick data
    const candlestickData = cleanData.map(item => {
      // Parse date from TIMESTAMP
      const date = parseISO(item.TIMESTAMP);
      const timestamp = isValid(date) ? date.getTime() : new Date(item.TIMESTAMP).getTime();
      
      // Ensure all OHLC values are proper numbers
      const open = parseFloat(item.OPEN_PRICE);
      const high = parseFloat(item.HIGH_PRICE);
      const low = parseFloat(item.LOW_PRICE);
      const close = parseFloat(item.CLOSE_PRICE);
      
      return {
        x: timestamp,
        y: [open, high, low, close], // ApexCharts expects [open, high, low, close]
        originalData: item // Keep original data for tooltips
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

    // Prepare crossover markers data (only where value = 1)
    const crossoverMarkers = selectedCrossoverSignals
      .filter(signalValue => cleanData.some(d => d[signalValue] === 1))
      .map(signalValue => {
        const signalConfig = availableCrossoverSignals.find(s => s.value === signalValue);
        if (!signalConfig) return null;
        
        const signalData = cleanData
          .filter(item => item[signalValue] === 1)
          .map(item => {
            const date = parseISO(item.TIMESTAMP);
            const timestamp = isValid(date) ? date.getTime() : new Date(item.TIMESTAMP).getTime();
            const price = parseFloat(item.CLOSE_PRICE);
            
            return {
              x: timestamp,
              y: price,
              signalName: signalConfig.label,
              signalColor: signalConfig.color,
              markerType: signalConfig.markerType,
              description: signalConfig.description
            };
          });
        
        return {
          name: signalConfig.label,
          data: signalData,
          config: signalConfig
        };
      })
      .filter(Boolean);

    return { candlestickData, indicatorSeries, crossoverMarkers };
  }, [data, selectedIndicators, selectedCrossoverSignals, availableCrossoverSignals]);

  // Calculate price range for Y-axis
  const yAxisRange = useMemo(() => {
    if (chartData.candlestickData.length === 0) return { min: 0, max: 100 };
    
    const allPrices = chartData.candlestickData.flatMap(item => item.y);
    const minPrice = Math.min(...allPrices);
    const maxPrice = Math.max(...allPrices);
    const padding = (maxPrice - minPrice) * 0.1;
    
    return {
      min: Math.max(0, minPrice - padding),
      max: maxPrice + padding
    };
  }, [chartData.candlestickData]);

  // TradingView-style ApexCharts configuration
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
        enabled: false // Disable for better performance and TradingView feel
      }
    },
    title: {
      text: `${symbol} Candlestick Chart`,
      align: 'left',
      style: {
        fontSize: '18px',
        fontWeight: 'bold',
        color: '#ffffff'
      }
    },
    subtitle: {
      text: subtitle,
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
          upward: '#22c55e',   // Green for bullish candles
          downward: '#ef4444'  // Red for bearish candles
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
      data: chartData.candlestickData
    },
    ...chartData.indicatorSeries,
    ...chartData.crossoverMarkers.map(marker => ({
      name: marker.name,
      type: 'scatter',
      data: marker.data
    }))
  ];

  // Loading state
  if (loading) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-6" style={style}>
        <div className="flex items-center justify-center" style={{ height: height }}>
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading candlestick chart...</p>
          </div>
        </div>
      </div>
    );
  }

  // No data state
  if (!data || data.length === 0 || chartData.candlestickData.length === 0) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-6" style={style}>
        <div className="flex items-center justify-center" style={{ height: height }}>
          <div className="text-center">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-white mb-2">No Candlestick Data Available</h3>
            <p className="text-gray-400 text-lg">No candlestick data available</p>
            <p className="text-gray-500 text-sm mt-2">Select a different symbol or date range</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-6" style={style}>
      {/* Chart Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-white">
            {symbol} Candlestick Analysis
          </h3>
          <div className="text-sm text-slate-400">
            {chartData.candlestickData.length} candles • OHLC Data
          </div>
        </div>
        <p className="text-sm text-slate-400">
          {subtitle}
        </p>
        <div className="flex items-center space-x-4 text-sm mt-2">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
            <span className="text-gray-300">Bullish</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-500 rounded mr-2"></div>
            <span className="text-gray-300">Bearish</span>
          </div>
          {chartData.indicatorSeries.length > 0 && (
            <span className="text-gray-400">{chartData.indicatorSeries.length} indicators</span>
          )}
        </div>
      </div>

      {/* TradingView-style Candlestick Chart */}
      <div className="w-full" style={{ minHeight: height }}>
        <Chart
          options={chartOptions}
          series={series}
          type="candlestick"
          height={height}
          width="100%"
        />
      </div>

      {/* Chart Footer */}
      <div className="mt-4 text-xs text-gray-500 border-t border-gray-700 pt-3">
        <div className="flex justify-between">
          <span>💡 Zoom: Mouse wheel • Pan: Click & drag • Reset: Toolbar</span>
          <span>Data range: {chartData.candlestickData.length > 0 ? 
            `${format(new Date(chartData.candlestickData[0].x), 'MMM dd, yyyy')} - ${format(new Date(chartData.candlestickData[chartData.candlestickData.length - 1].x), 'MMM dd, yyyy')}` 
            : 'No data'
          }</span>
        </div>
        <div className="mt-2 text-center">
          <span className="text-slate-500">Professional candlestick analysis powered by ApexCharts</span>
        </div>
      </div>
    </div>
  );
};

export default CandlestickChart;