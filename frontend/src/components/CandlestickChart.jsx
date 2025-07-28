// frontend/src/components/CandlestickChart.jsx
import React, { useMemo } from 'react';
import Chart from 'react-apexcharts';
import { format, parseISO, isValid } from 'date-fns';

/**
 * Professional Candlestick Chart Component
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
  
  // Helper function to format stock info as subtitle
  const formatStockInfoSubtitle = useMemo(() => {
    if (!data || data.length === 0) return '';
    
    const firstRecord = data[0];
    
    // Debug: Log ALL available fields and their values
    console.log('\n=== 🔍 CandlestickChart - COMPLETE FIELD DEBUG ===');
    console.log('📋 All available fields:', Object.keys(firstRecord));
    console.log('\n📊 Complete first record data:');
    Object.keys(firstRecord).forEach(key => {
      console.log(`  ${key}: ${firstRecord[key]} (${typeof firstRecord[key]})`);
    });
    
    // Look for stock info related fields specifically
    const stockInfoFields = Object.keys(firstRecord).filter(key => 
      key.toLowerCase().includes('sector') ||
      key.toLowerCase().includes('industry') ||
      key.toLowerCase().includes('rating') ||
      key.toLowerCase().includes('quality') ||
      key.toLowerCase().includes('growth') ||
      key.toLowerCase().includes('mcap') ||
      key.toLowerCase().includes('cap') ||
      key.toLowerCase().includes('nifty') ||
      key.toLowerCase().includes('next') ||
      key.toLowerCase().includes('alpha') ||
      key.toLowerCase().includes('beta') ||
      key.toLowerCase().includes('fno') ||
      key.toLowerCase().includes('f&o') ||
      key.toLowerCase().includes('flag')
    );
    
    console.log('\n🎯 Potential stock info fields found:');
    stockInfoFields.forEach(field => {
      console.log(`  ${field}: ${firstRecord[field]} (${typeof firstRecord[field]})`);
    });
    console.log('=== END COMPLETE FIELD DEBUG ===\n');
    
    const parts = [];
    
    // Dynamic field detection - find fields by pattern matching
    const findField = (patterns) => {
      for (const pattern of patterns) {
        const field = Object.keys(firstRecord).find(key => 
          key.toLowerCase().includes(pattern.toLowerCase())
        );
        if (field && firstRecord[field] && firstRecord[field] !== 'N/A') {
          return firstRecord[field];
        }
      }
      return null;
    };
    
    // Look for each type of field dynamically
    const sector = findField(['SECTOR', 'sector']);
    const industry = findField(['INDUSTRY', 'industry']);
    const mcap = findField(['MCAP_CATEGORY', 'mcap_category', 'MARKET_CAP', 'mcap', 'cap_category']);
    const rating = findField(['STOCK_RATING', 'stock_rating', 'RATING', 'rating']);
    const quality = findField(['QUALITY_SCORE', 'quality_score', 'QUALITY', 'quality']);
    const growth = findField(['GROWTH_SCORE', 'growth_score', 'GROWTH', 'growth']);
    const nifty50 = findField(['NIFTY_50', 'nifty_50', 'NIFTY50', 'nifty50']);
    const nifty500 = findField(['NIFTY_500', 'nifty_500', 'NIFTY500', 'nifty500']);
    const next50 = findField(['NEXT_50', 'next_50', 'NEXT50', 'next50']);
    const alpha50 = findField(['ALPHA_50', 'alpha_50', 'ALPHA50', 'alpha50']);
    const beta50 = findField(['BETA_50', 'beta_50', 'BETA50', 'beta50']);
    const fno = findField(['FNO', 'fno', 'F_AND_O', 'f_and_o']);
    const flag = findField(['FLAG', 'flag']);
    
    // Specific FNO debugging
    console.log('\n🔍 FNO Field Debug:');
    const fnoFields = Object.keys(firstRecord).filter(key => 
      key.toLowerCase().includes('fno') || 
      key.toLowerCase().includes('f_and_o') ||
      key.toLowerCase().includes('f&o')
    );
    console.log(`  FNO-related fields found: ${fnoFields}`);
    fnoFields.forEach(field => {
      console.log(`    ${field}: ${firstRecord[field]} (${typeof firstRecord[field]})`);
    });
    
    // Check specific FNO field if it exists
    if (firstRecord.FNO !== undefined) {
      console.log(`  Direct FNO field: ${firstRecord.FNO}`);
      console.log(`  FNO field type: ${typeof firstRecord.FNO}`);
      console.log(`  Is FNO truthy: ${!!firstRecord.FNO}`);
      console.log(`  FNO string value: "${String(firstRecord.FNO)}"`);
      console.log(`  FNO lowercase: "${String(firstRecord.FNO).toLowerCase()}"`);
      const checkValues = ['yes', 'y', '1', 'true', 'included', 1];
      console.log(`  FNO matches any check value: ${checkValues.includes(String(firstRecord.FNO).toLowerCase())}`);
    } else {
      console.log('  FNO field does not exist');
    }
    
    // Debug: Show what we found
    console.log('\n🔎 Found field values:');
    console.log(`  sector: ${sector}`);
    console.log(`  industry: ${industry}`);
    console.log(`  mcap: ${mcap}`);
    console.log(`  rating: ${rating}`);
    console.log(`  quality: ${quality}`);
    console.log(`  growth: ${growth}`);
    console.log(`  nifty50: ${nifty50}`);
    console.log(`  nifty500: ${nifty500}`);
    console.log(`  next50: ${next50}`);
    console.log(`  alpha50: ${alpha50}`);
    console.log(`  beta50: ${beta50}`);
    console.log(`  fno: ${fno}`);
    console.log(`  flag: ${flag}`);
    console.log('');
    
    // Add key information in a compact format
    if (sector && sector !== 'N/A') parts.push(`${sector}`);
    if (industry && industry !== 'N/A') parts.push(`${industry}`);
    if (mcap && mcap !== 'N/A') parts.push(`${mcap} Cap`);
    if (rating && rating !== 'N/A') parts.push(`Rating: ${rating}`);
    if (quality && quality !== 'N/A') parts.push(`Quality: ${quality}`);
    if (growth && growth !== 'N/A') parts.push(`Growth: ${growth}`);
    
    // Add index memberships
    const indexes = [];
    if (nifty50 && ['Yes', 'Y', '1', 'true', 'included', 1].includes(String(nifty50).toLowerCase())) indexes.push('Nifty 50');
    if (nifty500 && ['Yes', 'Y', '1', 'true', 'included', 1].includes(String(nifty500).toLowerCase())) indexes.push('Nifty 500');
    if (next50 && ['Yes', 'Y', '1', 'true', 'included', 1].includes(String(next50).toLowerCase())) indexes.push('Next 50');
    if (alpha50 && ['Yes', 'Y', '1', 'true', 'included', 1].includes(String(alpha50).toLowerCase())) indexes.push('Alpha 50');
    if (beta50 && ['Yes', 'Y', '1', 'true', 'included', 1].includes(String(beta50).toLowerCase())) indexes.push('Beta 50');
    if (indexes.length > 0) parts.push(`Indexes: ${indexes.join(', ')}`);
    
    // Enhanced FNO detection
    console.log(`\n🔍 FNO Processing:`);
    console.log(`  fno value: ${fno}`);
    console.log(`  fno type: ${typeof fno}`);
    if (fno) {
      const fnoString = String(fno).toLowerCase();
      console.log(`  fno string: "${fnoString}"`);
      const validValues = ['yes', 'y', '1', 'true', 'included', '1'];
      const isValid = validValues.includes(fnoString) || fno === 1;
      console.log(`  valid values: ${validValues}`);
      console.log(`  is valid: ${isValid}`);
      if (isValid) {
        parts.push('F&O Available');
        console.log(`  ✅ Added F&O Available to parts`);
      } else {
        console.log(`  ❌ FNO value "${fnoString}" not recognized as valid`);
      }
    } else {
      console.log(`  ❌ No FNO value found`);
    }
    if (flag && flag !== 'N/A') parts.push(`Flag: ${flag}`);
    
    const result = parts.join(' • ');
    console.log('🔍 CandlestickChart - Generated subtitle:', result);
    
    // Fallback test subtitle if no data found
    if (result.length === 0) {
      return 'Test Subtitle - Data fields not found';
    }
    
    return result;
  }, [data]);

  // Transform data for ApexCharts candlestick format and technical indicators
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return { candlestickData: [], indicatorSeries: [], crossoverMarkers: [] };
    
    // Filter out invalid data points
    const cleanData = data.filter(item => 
      item.OPEN_PRICE && 
      item.HIGH_PRICE && 
      item.LOW_PRICE && 
      item.CLOSE_PRICE &&
      !isNaN(item.OPEN_PRICE) &&
      !isNaN(item.HIGH_PRICE) &&
      !isNaN(item.LOW_PRICE) &&
      !isNaN(item.CLOSE_PRICE)
    );

    if (cleanData.length === 0) return { candlestickData: [], indicatorSeries: [] };

    // Sort by timestamp
    cleanData.sort((a, b) => new Date(a.TIMESTAMP) - new Date(b.TIMESTAMP));

    // Prepare candlestick data
    const candlestickData = cleanData.map(item => {
      // Parse date from TIMESTAMP
      const date = parseISO(item.TIMESTAMP);
      const timestamp = isValid(date) ? date.getTime() : new Date(item.TIMESTAMP).getTime();
      
      return {
        x: timestamp,
        y: [
          parseFloat(item.OPEN_PRICE),
          parseFloat(item.HIGH_PRICE), 
          parseFloat(item.LOW_PRICE),
          parseFloat(item.CLOSE_PRICE)
        ],
        originalData: item // Keep original data for tooltips
      };
    });

    // Prepare technical indicator data
    const indicatorSeries = selectedIndicators
      .filter(indicator => cleanData.some(d => d[indicator] !== null && d[indicator] !== undefined))
      .map(indicator => ({
        name: indicator.replace(/_/g, ' '),
        data: cleanData.map(item => {
          const date = parseISO(item.TIMESTAMP);
          const timestamp = isValid(date) ? date.getTime() : new Date(item.TIMESTAMP).getTime();
          
          return {
            x: timestamp,
            y: parseFloat(item[indicator]) || null
          };
        }).filter(point => point.y !== null)
      }));

    // Prepare crossover markers data (only where value = 1) - positioned below candles
    const crossoverMarkers = selectedCrossoverSignals
      .filter(signalValue => cleanData.some(d => d[signalValue] === 1))
      .map(signalValue => {
        const signalConfig = availableCrossoverSignals.find(s => s.value === signalValue);
        if (!signalConfig) return null;

        const markers = cleanData
          .filter(item => item[signalValue] === 1)
          .map(item => {
            const date = parseISO(item.TIMESTAMP);
            const timestamp = isValid(date) ? date.getTime() : new Date(item.TIMESTAMP).getTime();
            
            // Position arrows above for bull signals, below for bear signals
            const lowPrice = parseFloat(item.LOW_PRICE);
            const highPrice = parseFloat(item.HIGH_PRICE);
            const isBullSignal = signalConfig.markerType === 'arrow-up';
            const markerY = isBullSignal ? highPrice * 1.02 : lowPrice * 0.98; // 2% above high for bull, 2% below low for bear
            
            return {
              x: timestamp,
              y: markerY,
              signalName: signalConfig.label,
              signalColor: signalConfig.color,
              markerType: signalConfig.markerType,
              description: signalConfig.description,
              actualPrice: {
                open: parseFloat(item.OPEN_PRICE),
                high: parseFloat(item.HIGH_PRICE),
                low: lowPrice,
                close: parseFloat(item.CLOSE_PRICE)
              }
            };
          });

        return {
          name: signalConfig.label,
          data: markers,
          config: signalConfig
        };
      })
      .filter(Boolean);

    return { candlestickData, indicatorSeries, crossoverMarkers };
  }, [data, selectedIndicators, selectedCrossoverSignals, availableCrossoverSignals]);

  // Calculate price range for better y-axis scaling
  const priceRange = useMemo(() => {
    if (chartData.candlestickData.length === 0) return { min: 0, max: 100 };
    
    const allPrices = chartData.candlestickData.flatMap(item => item.y);
    const min = Math.min(...allPrices);
    const max = Math.max(...allPrices);
    const padding = (max - min) * 0.05; // 5% padding
    
    return {
      min: Math.max(0, min - padding),
      max: max + padding
    };
  }, [chartData.candlestickData]);

  // ApexCharts configuration
  const chartOptions = {
    chart: {
      type: 'candlestick',
      height: height,
      background: 'transparent',
      foreColor: '#ffffff',
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
        enabled: true,
        easing: 'easeinout',
        speed: 800
      }
    },
    // Remove built-in title to avoid duplication
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
      min: priceRange.min,
      max: priceRange.max
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
    colors: [
      '#22c55e', '#ef4444', // Candlestick colors (green/red)
      ...Array(chartData.indicatorSeries.length).fill(0).map((_, i) => 
        ['#3b82f6', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899'][i % 5]
      ),
      ...chartData.crossoverMarkers.map(marker => marker.config.color)
    ],
    stroke: {
      width: [
        0, // No stroke for candlesticks
        ...Array(chartData.indicatorSeries.length).fill(2),
        ...Array(chartData.crossoverMarkers.length).fill(0) // No stroke for scatter markers
      ]
    },
    markers: {
      size: [
        0, // No markers for candlesticks
        ...Array(chartData.indicatorSeries.length).fill(0), // No markers for lines
        ...Array(chartData.crossoverMarkers.length).fill(15) // Larger arrow markers for crossover signals
      ],
      colors: [
        '#ffffff', // candlestick (not used)
        ...Array(chartData.indicatorSeries.length).fill('#ffffff'), // indicators
        ...chartData.crossoverMarkers.map(marker => marker.config.color) // filled arrow colors
      ],
      strokeColors: [
        '#22c55e',
        ...Array(chartData.indicatorSeries.length).fill(0).map((_, i) => 
          ['#3b82f6', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899'][i % 5]
        ),
        ...chartData.crossoverMarkers.map(marker => marker.config.color) // arrow border colors
      ],
      strokeWidth: [
        0,
        ...Array(chartData.indicatorSeries.length).fill(2),
        ...Array(chartData.crossoverMarkers.length).fill(2) // Stroke for crossover arrow markers
      ],
      hover: {
        size: [
          0,
          ...Array(chartData.indicatorSeries.length).fill(0),
          ...Array(chartData.crossoverMarkers.length).fill(20) // Larger hover for crossover arrow markers
        ],
        sizeOffset: 3
      },
      // Custom filled arrow shapes for crossover signals
      shape: [
        'circle', // candlestick (not used)
        ...Array(chartData.indicatorSeries.length).fill('circle'), // indicators
        ...chartData.crossoverMarkers.map(marker => 
          marker.config.markerType === 'arrow-up' ? 'triangle' : 'invertedTriangle'
        )
      ],
      // Make arrows fully filled with colors
      fillOpacity: [
        1, // candlestick
        ...Array(chartData.indicatorSeries.length).fill(1), // indicators
        ...Array(chartData.crossoverMarkers.length).fill(1) // fully filled arrows
      ]
    },
    tooltip: {
      theme: 'dark',
      shared: true,
      intersect: false,
      style: {
        fontSize: '12px'
      },
      custom: function({ series, seriesIndex, dataPointIndex, w }) {
        // Handle candlestick data
        if (seriesIndex === 0) {
          const data = chartData.candlestickData[dataPointIndex];
          if (!data) return '';
          
          const [open, high, low, close] = data.y;
          const change = close - open;
          const changePercent = ((change / open) * 100).toFixed(2);
          const date = format(new Date(data.x), 'MMM dd, yyyy');
          
          // Show technical indicators at this point
          let indicatorInfo = '';
          chartData.indicatorSeries.forEach((indicator, idx) => {
            const indicatorPoint = indicator.data.find(point => 
              Math.abs(point.x - data.x) < 86400000 // Within same day
            );
            if (indicatorPoint) {
              indicatorInfo += `
                <div style="color: #94a3b8;">
                  ${indicator.name}: <span style="color: ${w.globals.colors[idx + 1]}; font-weight: 500;">
                    ₹${indicatorPoint.y.toFixed(2)}
                  </span>
                </div>
              `;
            }
          });
          
          return `
            <div class="apexcharts-tooltip-candlestick" style="padding: 12px; background: #1f2937; border: 1px solid #374151; border-radius: 8px;">
              <div style="color: #60a5fa; font-weight: bold; margin-bottom: 8px;">${date}</div>
              <div style="display: grid; gap: 4px;">
                <div style="color: #94a3b8;">Open: <span style="color: #ffffff; font-weight: 500;">₹${open.toFixed(2)}</span></div>
                <div style="color: #94a3b8;">High: <span style="color: #22c55e; font-weight: 500;">₹${high.toFixed(2)}</span></div>
                <div style="color: #94a3b8;">Low: <span style="color: #ef4444; font-weight: 500;">₹${low.toFixed(2)}</span></div>
                <div style="color: #94a3b8;">Close: <span style="color: #ffffff; font-weight: 500;">₹${close.toFixed(2)}</span></div>
                ${indicatorInfo}
                <div style="color: #94a3b8; margin-top: 8px; padding-top: 8px; border-top: 1px solid #374151;">
                  <div style="color: #06b6d4; font-weight: bold; margin-bottom: 4px;">Crossover Signals:</div>
                  ${chartData.crossoverMarkers.length > 0 ? chartData.crossoverMarkers.map(markerSeries => {
                    const signalAtThisPoint = markerSeries.data.find(point => Math.abs(point.x - data.x) < 86400000);
                    return signalAtThisPoint ? `
                      <div style="color: #94a3b8; font-size: 11px;">
                        <span style="color: ${markerSeries.config.color}; font-weight: 500;">
                          ${markerSeries.config.markerType === 'arrow-up' ? '▲' : '▼'} ${markerSeries.name}
                        </span>
                      </div>
                    ` : '';
                  }).join('') : '<div style="color: #94a3b8; font-size: 11px;">No signals at this point</div>'}
                </div>
                <div style="color: #94a3b8; margin-top: 4px; padding-top: 4px; border-top: 1px solid #374151;">
                  Change: <span style="color: ${change >= 0 ? '#22c55e' : '#ef4444'}; font-weight: 500;">
                    ${change >= 0 ? '+' : ''}₹${change.toFixed(2)} (${change >= 0 ? '+' : ''}${changePercent}%)
                  </span>
                </div>
              </div>
            </div>
          `;
        }
        return '';
      }
    },
    legend: {
      show: chartData.indicatorSeries.length > 0,
      position: 'top',
      labels: {
        colors: '#94a3b8'
      }
    },
    // Add vertical text labels for crossover signals
    annotations: {
      points: chartData.crossoverMarkers.flatMap(markerSeries => 
        markerSeries.data.map(point => ({
          x: point.x,
          y: point.y,
          marker: {
            size: 0 // Hide the annotation marker since we have custom arrows
          },
          label: {
            text: markerSeries.config.label.split(' ')[0], // First part of label (e.g., "Bull", "Bear")
            borderColor: markerSeries.config.color,
            borderWidth: 1,
            borderRadius: 3,
            background: markerSeries.config.color,
            color: '#ffffff',
            fontSize: '10px',
            fontWeight: 'bold',
            padding: {
              left: 4,
              right: 4,
              top: 2,
              bottom: 2
            },
            orientation: 'vertical', // Vertical text
            offsetY: markerSeries.config.markerType === 'arrow-up' ? -25 : 25, // Position above/below arrow
            offsetX: 0,
            style: {
              background: markerSeries.config.color,
              color: '#ffffff',
              fontSize: '10px',
              fontWeight: 'bold'
            }
          }
        }))
      )
    }
  };

  const series = [
    {
      name: 'Candlestick',
      type: 'candlestick',
      data: chartData.candlestickData
    },
    ...chartData.indicatorSeries.map(indicator => ({
      name: indicator.name,
      type: 'line',
      data: indicator.data
    })),
    ...chartData.crossoverMarkers.map(marker => ({
      name: marker.name,
      type: 'scatter',
      data: marker.data
    }))
  ];

  // Loading state
  if (loading) {
    return (
      <div 
        className="flex items-center justify-center bg-gray-900 rounded-lg"
        style={{ height: `${height}px`, ...style }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading candlestick chart...</p>
        </div>
      </div>
    );
  }

  // No data state
  if (!data || data.length === 0 || chartData.candlestickData.length === 0) {
    return (
      <div 
        className="flex items-center justify-center bg-gray-900 rounded-lg border border-gray-700"
        style={{ height: `${height}px`, ...style }}
      >
        <div className="text-center">
          <div className="text-gray-500 text-4xl mb-4">📈</div>
          <p className="text-gray-400 text-lg">No candlestick data available</p>
          <p className="text-gray-500 text-sm mt-2">
            Please select a symbol and date range with valid OHLC data
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="bg-gray-900 rounded-lg p-4 border border-gray-700"
      style={{ ...style }}
    >
      {/* Chart Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-white text-lg font-semibold">
            {symbol ? `${symbol} Candlestick Chart` : 'Candlestick Chart'}
          </h3>
          {/* Stock Information Subtitle */}
          {formatStockInfoSubtitle && (
            <p className="text-slate-400 text-sm mb-1">
              {formatStockInfoSubtitle}
            </p>
          )}
          <p className="text-gray-400 text-sm">
            {chartData.candlestickData.length} candles • OHLC Data
            {selectedIndicators.length > 0 && ` • ${selectedIndicators.length} indicators`}
          </p>
        </div>
        <div className="flex items-center space-x-4 text-sm">
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

      {/* ApexCharts Candlestick Chart */}
      <Chart
        options={chartOptions}
        series={series}
        type="candlestick"
        height={height}
      />

      {/* Chart Footer */}
      <div className="mt-4 text-xs text-gray-500 border-t border-gray-700 pt-3">
        <div className="flex justify-between">
          <span>💡 Zoom: Mouse wheel • Pan: Click & drag • Reset: Toolbar</span>
          <span>Data range: {chartData.candlestickData.length > 0 ? 
            `${format(new Date(chartData.candlestickData[0].x), 'MMM dd, yyyy')} - ${format(new Date(chartData.candlestickData[chartData.candlestickData.length - 1].x), 'MMM dd, yyyy')}` 
            : 'No data'
          }</span>
        </div>
      </div>
    </div>
  );
};

export default CandlestickChart;