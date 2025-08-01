// frontend/src/components/StockPriceChart.jsx
import React, { useMemo } from 'react';
import Chart from 'react-apexcharts';
import { format, parseISO, isValid } from 'date-fns';

/**
 * Professional Stock Price Chart Component with ApexCharts
 * 
 * @param {Object} props
 * @param {Array} props.data - Array of stock data objects with TIMESTAMP and CLOSE_PRICE
 * @param {string} props.selectedSymbol - Stock symbol for title
 * @param {number} props.height - Chart height in pixels (default: 400)
 * @param {boolean} props.loading - Loading state
 * @param {Array} props.selectedIndicators - Array of technical indicators to display
 * @param {Array} props.selectedCrossoverSignals - Array of crossover signals to display as markers
 * @param {Array} props.availableCrossoverSignals - Array of available crossover signal configs
 */
function StockPriceChart({ 
  data = [], 
  selectedSymbol = '', 
  height = 400, 
  loading = false,
  selectedIndicators = [],
  selectedCrossoverSignals = [],
  availableCrossoverSignals = []
}) {
  
  // Helper function to format stock info as subtitle
  const formatStockInfoSubtitle = useMemo(() => {
    if (!data || data.length === 0) return '';
    
    const firstRecord = data[0];
    
    // Debug: Log ALL available fields and their values
    console.log('\n=== 🔍 StockPriceChart - COMPLETE FIELD DEBUG ===');
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
    
    if (fno && ['Yes', 'Y', '1', 'true', 'included', 1].includes(String(fno).toLowerCase())) parts.push('F&O Available');
    if (flag && flag !== 'N/A') parts.push(`Flag: ${flag}`);
    
    const result = parts.join(' • ');
    console.log('🔍 StockPriceChart - Generated subtitle:', result);
    
    // Fallback test subtitle if no data found
    if (result.length === 0) {
      return 'Test Subtitle - Data fields not found';
    }
    
    return result;
  }, [data]);

  // Transform and prepare data for ApexCharts
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return { priceData: [], indicatorSeries: [], crossoverMarkers: [] };
    
    // Filter out invalid data points
    const cleanData = data.filter(d => 
      d.CLOSE_PRICE !== null && 
      !isNaN(d.CLOSE_PRICE) && 
      d.TIMESTAMP
    );

    if (cleanData.length === 0) return { priceData: [], indicatorSeries: [] };

    // Sort by timestamp
    cleanData.sort((a, b) => new Date(a.TIMESTAMP) - new Date(b.TIMESTAMP));

    // Prepare price data for area chart
    const priceData = cleanData.map(item => {
      const date = parseISO(item.TIMESTAMP);
      const timestamp = isValid(date) ? date.getTime() : new Date(item.TIMESTAMP).getTime();
      
      return {
        x: timestamp,
        y: parseFloat(item.CLOSE_PRICE),
        originalData: item // Keep original data for tooltips
      };
    });

    // Prepare technical indicator data - fixed to show all selected indicators
    const indicatorSeries = selectedIndicators.map(indicator => {
      const indicatorData = cleanData.map(item => {
        const date = parseISO(item.TIMESTAMP);
        const timestamp = isValid(date) ? date.getTime() : new Date(item.TIMESTAMP).getTime();
        
        // Convert to float and handle various null/undefined values
        let value = item[indicator];
        if (value === null || value === undefined || value === '' || isNaN(value)) {
          value = null;
        } else {
          value = parseFloat(value);
        }
        
        return {
          x: timestamp,
          y: value
        };
      }).filter(point => point.y !== null && !isNaN(point.y)); // Only filter out truly invalid values
      
      // Only include indicator if it has at least some valid data points
      return indicatorData.length > 0 ? {
        name: indicator.replace(/_/g, ' '),
        data: indicatorData
      } : null;
    }).filter(Boolean); // Remove null entries

    // Prepare crossover markers data (only where value = 1)
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
            
            return {
              x: timestamp,
              y: parseFloat(item.CLOSE_PRICE),
              signalName: signalConfig.label,
              signalColor: signalConfig.color,
              markerType: signalConfig.markerType,
              description: signalConfig.description
            };
          });

        return {
          name: signalConfig.label,
          data: markers,
          config: signalConfig
        };
      })
      .filter(Boolean);

    return { priceData, indicatorSeries, crossoverMarkers };
  }, [data, selectedIndicators, selectedCrossoverSignals, availableCrossoverSignals]);

  // Calculate price range for better y-axis scaling
  const priceRange = useMemo(() => {
    if (chartData.priceData.length === 0) return { min: 0, max: 100 };
    
    const prices = chartData.priceData.map(item => item.y);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const padding = (max - min) * 0.05; // 5% padding
    
    return {
      min: Math.max(0, min - padding),
      max: max + padding
    };
  }, [chartData.priceData]);

  // ApexCharts configuration
  const chartOptions = {
    chart: {
      type: 'area',
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
    dataLabels: {
      enabled: false
    },
    stroke: {
      curve: 'smooth',
      width: [
        1.5, // main price line
        ...Array(chartData.indicatorSeries.length).fill(1.5), // indicators
        ...Array(chartData.crossoverMarkers.length).fill(0) // no stroke for scatter markers
      ]
    },
    markers: {
      size: [
        0, // No markers for main price line
        ...Array(chartData.indicatorSeries.length).fill(0), // No markers for indicators
        ...Array(chartData.crossoverMarkers.length).fill(15) // Larger arrow markers for crossover signals
      ],
      colors: ['#ffffff'],
      strokeColors: [
        '#3b82f6', 
        ...Array(chartData.indicatorSeries.length).fill(0).map((_, i) => 
          ['#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'][i % 6]
        ),
        ...chartData.crossoverMarkers.map(marker => marker.config.color)
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
        'circle', // main price (not used)
        ...Array(chartData.indicatorSeries.length).fill('circle'), // indicators
        ...chartData.crossoverMarkers.map(marker => 
          marker.config.markerType === 'arrow-up' ? 'triangle' : 'invertedTriangle'
        )
      ],
      // Make arrows fully filled with colors
      fillOpacity: [
        1, // main price
        ...Array(chartData.indicatorSeries.length).fill(1), // indicators
        ...Array(chartData.crossoverMarkers.length).fill(1) // fully filled arrows
      ]
    },
    fill: {
      type: ['gradient', ...Array(chartData.indicatorSeries.length).fill('solid')],
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.7,
        opacityTo: 0.1,
        stops: [0, 90, 100]
      }
    },
    colors: [
      '#3b82f6', 
      ...Array(chartData.indicatorSeries.length).fill(0).map((_, i) => 
        ['#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'][i % 6]
      ),
      ...chartData.crossoverMarkers.map(marker => marker.config.color)
    ],
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
    tooltip: {
      theme: 'dark',
      shared: true,
      intersect: false,
      style: {
        fontSize: '12px'
      },
      custom: function({ series, seriesIndex, dataPointIndex, w }) {
        const point = chartData.priceData[dataPointIndex];
        if (!point) return '';
        
        const originalData = point.originalData;
        const date = format(new Date(point.x), 'MMM dd, yyyy');
        const price = point.y;
        
        // Calculate price change if we have previous data
        let changeInfo = '';
        if (dataPointIndex > 0) {
          const prevPrice = chartData.priceData[dataPointIndex - 1].y;
          const change = price - prevPrice;
          const changePercent = ((change / prevPrice) * 100).toFixed(2);
          changeInfo = `
            <div style="color: #94a3b8; margin-top: 8px; padding-top: 8px; border-top: 1px solid #374151;">
              Change: <span style="color: ${change >= 0 ? '#22c55e' : '#ef4444'}; font-weight: 500;">
                ${change >= 0 ? '+' : ''}₹${change.toFixed(2)} (${change >= 0 ? '+' : ''}${changePercent}%)
              </span>
            </div>
          `;
        }

        // Show technical indicators
        let indicatorInfo = '';
        chartData.indicatorSeries.forEach((indicator, idx) => {
          if (seriesIndex === idx + 1 && series[idx + 1] && series[idx + 1][dataPointIndex]) {
            indicatorInfo += `
              <div style="color: #94a3b8;">
                ${indicator.name}: <span style="color: ${w.globals.colors[idx + 1]}; font-weight: 500;">
                  ${series[idx + 1][dataPointIndex].toFixed(2)}
                </span>
              </div>
            `;
          }
        });

        return `
          <div class="apexcharts-tooltip-area" style="padding: 12px; background: #1f2937; border: 1px solid #374151; border-radius: 8px;">
            <div style="color: #60a5fa; font-weight: bold; margin-bottom: 8px;">${date}</div>
            <div style="display: grid; gap: 4px;">
              <div style="color: #94a3b8;">Price: <span style="color: #ffffff; font-weight: 500;">₹${price.toFixed(2)}</span></div>
              ${originalData.OPEN_PRICE ? `<div style="color: #94a3b8;">Open: <span style="color: #22c55e; font-weight: 500;">₹${parseFloat(originalData.OPEN_PRICE).toFixed(2)}</span></div>` : ''}
              ${originalData.HIGH_PRICE ? `<div style="color: #94a3b8;">High: <span style="color: #ef4444; font-weight: 500;">₹${parseFloat(originalData.HIGH_PRICE).toFixed(2)}</span></div>` : ''}
              ${originalData.LOW_PRICE ? `<div style="color: #94a3b8;">Low: <span style="color: #f59e0b; font-weight: 500;">₹${parseFloat(originalData.LOW_PRICE).toFixed(2)}</span></div>` : ''}
              ${point.actualPrice ? `<div style="color: #94a3b8;">Signal Price: <span style="color: #06b6d4; font-weight: 500;">₹${point.actualPrice.toFixed(2)}</span></div>` : ''}
              ${originalData.TOTAL_TRADED_QUANTITY ? `<div style="color: #94a3b8;">Volume: <span style="color: #06b6d4; font-weight: 500;">${parseInt(originalData.TOTAL_TRADED_QUANTITY).toLocaleString()}</span></div>` : ''}
              ${indicatorInfo}
              ${changeInfo}
            </div>
          </div>
        `;
      }
    },
    legend: {
      show: true,
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

  // Prepare series data
  console.log('📊 StockPriceChart - Final series data:', {
    priceData: chartData.priceData?.length || 0,
    indicatorSeries: chartData.indicatorSeries?.length || 0,
    crossoverMarkers: chartData.crossoverMarkers?.length || 0
  });
  
  const series = [
    {
      name: 'Price',
      type: 'area',
      data: chartData.priceData
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
        style={{ height: `${height}px` }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading price chart...</p>
        </div>
      </div>
    );
  }

  // No data state
  if (!data || data.length === 0 || chartData.priceData.length === 0) {
    return (
      <div 
        className="flex items-center justify-center bg-gray-900 rounded-lg border border-gray-700"
        style={{ height: `${height}px` }}
      >
        <div className="text-center">
          <div className="text-gray-500 text-4xl mb-4">📊</div>
          <p className="text-gray-400 text-lg">No price data available</p>
          <p className="text-gray-500 text-sm mt-2">
            {selectedSymbol ? `No valid data found for ${selectedSymbol}` : 'Please select a symbol and date range'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
      {/* Chart Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-white text-lg font-semibold">
            {selectedSymbol ? `${selectedSymbol} Price Chart` : 'Price Chart'}
          </h3>
          {/* Stock Information Subtitle */}
          {formatStockInfoSubtitle && (
            <p className="text-slate-400 text-sm mb-1">
              {formatStockInfoSubtitle}
            </p>
          )}
          <p className="text-gray-400 text-sm">
            {chartData.priceData.length} data points
            {selectedIndicators.length > 0 && ` • ${selectedIndicators.length} indicators`}
          </p>
        </div>
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-500 rounded mr-2"></div>
            <span className="text-gray-300">Price</span>
          </div>
          {chartData.indicatorSeries.length > 0 && (
            <span className="text-gray-400">{chartData.indicatorSeries.length} indicators</span>
          )}
        </div>
      </div>

      {/* ApexCharts Area Chart */}
      <Chart
        options={chartOptions}
        series={series}
        type="area"
        height={height}
      />

      {/* Chart Footer */}
      <div className="mt-4 text-xs text-gray-500 border-t border-gray-700 pt-3">
        <div className="flex justify-between">
          <span>💡 Zoom: Mouse wheel • Pan: Click & drag • Reset: Toolbar</span>
          <span>Data range: {chartData.priceData.length > 0 ? 
            `${format(new Date(chartData.priceData[0].x), 'MMM dd, yyyy')} - ${format(new Date(chartData.priceData[chartData.priceData.length - 1].x), 'MMM dd, yyyy')}` 
            : 'No data'
          }</span>
        </div>
      </div>
    </div>
  );
}

export default StockPriceChart;