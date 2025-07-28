// frontend/src/components/MultiFieldChart.jsx
import React, { useMemo } from 'react';
import Chart from 'react-apexcharts';
import { format, parseISO, isValid } from 'date-fns';

/**
 * Multi-Field Chart Component - Individual charts for specific data fields
 * 
 * @param {Object} props
 * @param {Array} props.data - Array of stock data objects
 * @param {string} props.selectedSymbol - Stock symbol for title
 * @param {boolean} props.loading - Loading state
 */
const MultiFieldChart = ({ 
  data = [], 
  selectedSymbol = '', 
  loading = false
}) => {
  
  // Helper function to format stock info as subtitle
  const formatStockInfoSubtitle = useMemo(() => {
    if (!data || data.length === 0) return '';
    
    const firstRecord = data[0];
    
    // Debug: Log available fields
    console.log('🔍 MultiFieldChart - Available fields:', Object.keys(firstRecord));
    console.log('🔍 MultiFieldChart - Sample data:', {
      SECTOR: firstRecord.SECTOR,
      INDUSTRY: firstRecord.INDUSTRY,
      MCAP_CATEGORY: firstRecord.MCAP_CATEGORY,
      STOCK_RATING: firstRecord.STOCK_RATING,
      QUALITY_SCORE: firstRecord.QUALITY_SCORE,
      GROWTH_SCORE: firstRecord.GROWTH_SCORE,
      NIFTY_50: firstRecord.NIFTY_50,
      NIFTY_500: firstRecord.NIFTY_500,
      FNO: firstRecord.FNO
    });
    
    const parts = [];
    
    // Check all possible field variations and add them if they exist
    const sector = firstRecord.SECTOR || firstRecord.Sector || firstRecord.sector;
    const industry = firstRecord.INDUSTRY || firstRecord.Industry || firstRecord.industry;
    const mcap = firstRecord.MCAP_CATEGORY || firstRecord.McapCategory || firstRecord.mcap_category;
    const rating = firstRecord.STOCK_RATING || firstRecord.StockRating || firstRecord.stock_rating;
    const quality = firstRecord.QUALITY_SCORE || firstRecord.QualityScore || firstRecord.quality_score;
    const growth = firstRecord.GROWTH_SCORE || firstRecord.GrowthScore || firstRecord.growth_score;
    const nifty50 = firstRecord.NIFTY_50 || firstRecord.Nifty50 || firstRecord.nifty_50;
    const nifty500 = firstRecord.NIFTY_500 || firstRecord.Nifty500 || firstRecord.nifty_500;
    const next50 = firstRecord.NEXT_50 || firstRecord.Next50 || firstRecord.next_50;
    const fno = firstRecord.FNO || firstRecord.Fno || firstRecord.fno;
    
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
    if (indexes.length > 0) parts.push(`Indexes: ${indexes.join(', ')}`);
    
    if (fno && ['Yes', 'Y', '1', 'true', 'included', 1].includes(String(fno).toLowerCase())) parts.push('F&O Available');
    
    const result = parts.join(' • ');
    console.log('🔍 MultiFieldChart - Generated subtitle:', result);
    
    return result;
  }, [data]);

  // Debug: Log everything about the incoming data
  console.log('=== MultiFieldChart Debug ===');
  console.log('Data received:', data);
  console.log('Data length:', data?.length || 0);
  console.log('Loading state:', loading);
  console.log('Selected symbol:', selectedSymbol);
  
  if (data && data.length > 0) {
    console.log('First data item:', data[0]);
    console.log('All keys in first item:', Object.keys(data[0]));
  }
  
  // Auto-detect available MA_45 fields in the data
  const detectedFields = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    const allFields = Object.keys(data[0]);
    const ma45Fields = allFields.filter(field => field.includes('MA_45'));
    
    console.log('🔍 All fields in data:', allFields);
    console.log('🔍 Detected MA_45 fields:', ma45Fields);
    
    return ma45Fields;
  }, [data]);

  // Define the specific fields to chart - with fallback to detected fields
  const chartFields = useMemo(() => {
    const defaultFields = [
      {
        key: 'VOLUME_MA_45',
        title: 'Volume MA 45',
        color: '#3b82f6',
        unit: '',
        description: '45-day Moving Average of Volume'
      },
      {
        key: 'TURNOVER_LACS_MA_45',
        title: 'Turnover MA 45',
        color: '#22c55e',
        unit: '₹ Lacs',
        description: '45-day Moving Average of Turnover (in Lacs)'
      },
      {
        key: 'NO_OF_TRADES_MA_45',
        title: 'Trades MA 45',
        color: '#f59e0b',
        unit: '',
        description: '45-day Moving Average of Number of Trades'
      },
      {
        key: 'DELIV_QTY_MA_45',
        title: 'Delivery Qty MA 45',
        color: '#ef4444',
        unit: '',
        description: '45-day Moving Average of Delivery Quantity'
      },
      {
        key: 'DELIV_PER_MA_45',
        title: 'Delivery % MA 45',
        color: '#8b5cf6',
        unit: '%',
        description: '45-day Moving Average of Delivery Percentage'
      }
    ];

    // If none of the default fields exist, create fields from detected MA_45 fields
    if (data && data.length > 0) {
      const hasDefaultFields = defaultFields.some(field => data[0].hasOwnProperty(field.key));
      
      if (!hasDefaultFields && detectedFields.length > 0) {
        console.log('🔄 Using auto-detected MA_45 fields instead of defaults');
        return detectedFields.map((field, index) => ({
          key: field,
          title: field.replace(/_/g, ' ').replace('MA 45', 'MA 45'),
          color: ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'][index % 7],
          unit: field.includes('PER') ? '%' : field.includes('LACS') ? '₹ Lacs' : '',
          description: `45-day Moving Average of ${field.replace('_MA_45', '').replace(/_/g, ' ')}`
        }));
      }
    }

    return defaultFields;
  }, [data, detectedFields]);

  // Debug: Check ALL available fields in the first data item
  const availableFields = useMemo(() => {
    if (!data || data.length === 0) return [];
    const allFields = Object.keys(data[0]);
    console.log('ALL fields in data:', allFields);
    return allFields.filter(key => 
      key.includes('MA_45') || key.includes('VOLUME') || key.includes('TURNOVER') || key.includes('DELIV') || key.includes('TRADES')
    );
  }, [data]);

  // Transform and prepare data for each field
  const chartDataByField = useMemo(() => {
    if (!data || data.length === 0) return {};
    
    console.log('Available MA_45 and related fields in data:', availableFields);
    console.log('First data item sample:', data[0]);
    
    const result = {};
    
    chartFields.forEach(field => {
      // Filter out invalid data points for this field - handle NaN values properly
      const cleanData = data.filter(d => {
        const value = d[field.key];
        const isValid = value !== null && 
                       value !== undefined && 
                       value !== 'NaN' &&
                       !isNaN(value) && 
                       isFinite(value) &&
                       d.TIMESTAMP;
        return isValid;
      });

      console.log(`Field ${field.key}: Found ${cleanData.length} valid data points out of ${data.length} total`);
      
      // Show sample of invalid data for debugging
      const invalidSamples = data.filter(d => {
        const value = d[field.key];
        return value === null || value === undefined || value === 'NaN' || isNaN(value) || !isFinite(value);
      }).slice(0, 3);
      
      if (invalidSamples.length > 0) {
        console.log(`Invalid data samples for ${field.key}:`, invalidSamples.map(d => ({ 
          [field.key]: d[field.key], 
          TIMESTAMP: d.TIMESTAMP,
          type: typeof d[field.key]
        })));
      }
      
      if (cleanData.length === 0) {
        console.log(`No valid data for field ${field.key}. All data appears to be invalid.`);
        result[field.key] = [];
        return;
      }

      // Sort by timestamp
      cleanData.sort((a, b) => new Date(a.TIMESTAMP) - new Date(b.TIMESTAMP));

      // Prepare chart data
      result[field.key] = cleanData.map(item => {
        const date = parseISO(item.TIMESTAMP);
        const timestamp = isValid(date) ? date.getTime() : new Date(item.TIMESTAMP).getTime();
        
        return {
          x: timestamp,
          y: parseFloat(item[field.key]),
          originalData: item // Keep original data for tooltips
        };
      });
    });
    
    return result;
  }, [data]);

  // Create chart options for a specific field
  const createChartOptions = (field) => {
    const fieldData = chartDataByField[field.key] || [];
    
    // Calculate range for better y-axis scaling
    const values = fieldData.map(item => item.y);
    const min = values.length > 0 ? Math.min(...values) : 0;
    const max = values.length > 0 ? Math.max(...values) : 100;
    const padding = (max - min) * 0.05; // 5% padding
    
    return {
      chart: {
        type: 'area',
        height: 300,
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
      title: {
        text: field.title,
        align: 'left',
        style: {
          fontSize: '16px',
          fontWeight: 'bold',
          color: '#ffffff'
        }
      },
      subtitle: {
        text: field.description,
        align: 'left',
        style: {
          fontSize: '12px',
          color: '#94a3b8'
        }
      },
      dataLabels: {
        enabled: false
      },
      stroke: {
        curve: 'smooth',
        width: 1.5
      },
      markers: {
        size: 0,
        hover: {
          size: 0
        }
      },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.7,
          opacityTo: 0.1,
          stops: [0, 90, 100]
        }
      },
      colors: [field.color],
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
            if (field.unit === '%') {
              return `${val.toFixed(2)}%`;
            } else if (field.unit === '₹ Lacs') {
              return `₹${val.toFixed(2)}L`;
            } else {
              return val.toLocaleString();
            }
          }
        },
        min: Math.max(0, min - padding),
        max: max + padding
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
          const point = fieldData[dataPointIndex];
          if (!point) return '';
          
          const originalData = point.originalData;
          const date = format(new Date(point.x), 'MMM dd, yyyy');
          const value = point.y;
          
          // Calculate change if we have previous data
          let changeInfo = '';
          if (dataPointIndex > 0) {
            const prevValue = fieldData[dataPointIndex - 1].y;
            const change = value - prevValue;
            const changePercent = ((change / prevValue) * 100).toFixed(2);
            changeInfo = `
              <div style="color: #94a3b8; margin-top: 8px; padding-top: 8px; border-top: 1px solid #374151;">
                Change: <span style="color: ${change >= 0 ? '#22c55e' : '#ef4444'}; font-weight: 500;">
                  ${change >= 0 ? '+' : ''}${change.toFixed(2)} (${change >= 0 ? '+' : ''}${changePercent}%)
                </span>
              </div>
            `;
          }

          return `
            <div class="apexcharts-tooltip-area" style="padding: 12px; background: #1f2937; border: 1px solid #374151; border-radius: 8px;">
              <div style="color: #60a5fa; font-weight: bold; margin-bottom: 8px;">${date}</div>
              <div style="display: grid; gap: 4px;">
                <div style="color: #94a3b8;">${field.title}: <span style="color: #ffffff; font-weight: 500;">
                  ${field.unit === '%' ? `${value.toFixed(2)}%` : 
                    field.unit === '₹ Lacs' ? `₹${value.toFixed(2)}L` : 
                    value.toLocaleString()}
                </span></div>
                ${changeInfo}
              </div>
            </div>
          `;
        }
      },
      legend: {
        show: false
      }
    };
  };

  // Always show debug info first - with more detailed debugging
  if (!data || data.length === 0) {
    console.error('MultiFieldChart: No data received!', { data, loading, selectedSymbol });
    return (
      <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
        <div className="text-center p-8">
          <h3 className="text-red-400 text-xl font-semibold mb-4">⚠️ No Data Received by MultiFieldChart</h3>
          <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 text-left">
            <p className="text-red-300 text-sm mb-2">Debug Information:</p>
            <ul className="text-gray-300 text-xs space-y-1">
              <li>• Data prop: {data ? `Array with ${data.length} items` : 'null/undefined'}</li>
              <li>• Data type: {typeof data}</li>
              <li>• Loading state: {loading ? 'true' : 'false'}</li>
              <li>• Selected symbol: {selectedSymbol || 'none'}</li>
              <li>• Component render time: {new Date().toLocaleTimeString()}</li>
            </ul>
          </div>
          <div className="mt-4 bg-yellow-900/20 border border-yellow-500 rounded-lg p-3">
            <p className="text-yellow-300 text-sm mb-1">Possible Issues:</p>
            <ul className="text-yellow-200 text-xs space-y-1">
              <li>• Data not loaded in dashboard (check Overview tab)</li>
              <li>• Wrong tab selected or component not mounted</li>
              <li>• Data prop not passed correctly from ProfessionalStockDashboard</li>
              <li>• Backend API not returning data</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
        <div className="flex items-center justify-center" style={{ height: '400px' }}>
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading field charts...</p>
            <p className="text-gray-500 text-sm mt-2">Data points: {data?.length || 0}</p>
          </div>
        </div>
      </div>
    );
  }

  // No data state
  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
        <div className="flex items-center justify-center" style={{ height: '400px' }}>
          <div className="text-center">
            <div className="text-gray-500 text-4xl mb-4">📊</div>
            <p className="text-gray-400 text-lg">No field data available</p>
            <p className="text-gray-500 text-sm mt-2">
              {selectedSymbol ? `No data found for ${selectedSymbol}` : 'Please select a symbol and date range'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-white text-xl font-semibold">
            {selectedSymbol ? `${selectedSymbol} Field Analysis` : 'Field Analysis'}
          </h3>
          {formatStockInfoSubtitle && (
            <p className="text-slate-400 text-sm mb-1">
              {formatStockInfoSubtitle}
            </p>
          )}
          <p className="text-gray-400 text-sm">
            Moving Average (45-day) indicators with interactive analysis
          </p>
          {/* Debug info */}
          <div className="mt-2 p-3 bg-gray-800 rounded border border-gray-600">
            <p className="text-yellow-400 text-xs font-semibold mb-1">DEBUG INFO:</p>
            <p className="text-gray-400 text-xs">
              Total data points: {data.length}
            </p>
            <p className="text-gray-400 text-xs">
              Detected MA_45 fields: {detectedFields.length > 0 ? detectedFields.join(', ') : 'None found'}
            </p>
            <p className="text-gray-400 text-xs">
              Using {chartFields.length} chart fields
            </p>
            {data.length > 0 && (
              <details className="mt-2">
                <summary className="text-blue-400 text-xs cursor-pointer">View all available fields ({Object.keys(data[0]).length} total)</summary>
                <div className="mt-1 text-gray-500 text-xs max-h-20 overflow-y-auto">
                  {Object.keys(data[0]).join(', ')}
                </div>
              </details>
            )}
            {data.length > 0 && (
              <details className="mt-2">
                <summary className="text-green-400 text-xs cursor-pointer">Chart fields & sample values</summary>
                <div className="mt-1 text-gray-500 text-xs">
                  {chartFields.map(field => (
                    <div key={field.key} className={data[0][field.key] !== undefined ? 'text-green-300' : 'text-red-300'}>
                      {field.key}: {data[0][field.key] !== undefined ? data[0][field.key] : '❌ NOT FOUND'}
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-500 rounded mr-2"></div>
            <span className="text-gray-300">Individual Fields</span>
          </div>
          <span className="text-gray-400">{chartFields.length} charts</span>
        </div>
      </div>

      {/* Charts Stacked Vertically */}
      <div className="space-y-6">
        {chartFields.map(field => {
          const fieldData = chartDataByField[field.key] || [];
          const hasData = fieldData.length > 0;
          const totalDataPoints = data.length;
          const validDataPoints = fieldData.length;
          const dataCompleteness = totalDataPoints > 0 ? (validDataPoints / totalDataPoints * 100).toFixed(1) : 0;
          
          return (
            <div key={field.key} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              {/* Data Quality Indicator */}
              <div className="mb-3 flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <div 
                    className={`w-3 h-3 rounded-full ${
                      validDataPoints === 0 ? 'bg-red-500' : 
                      validDataPoints < totalDataPoints ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                  ></div>
                  <span className="text-gray-300 text-sm font-medium">{field.title}</span>
                </div>
                <div className="text-xs text-gray-400">
                  {validDataPoints}/{totalDataPoints} points ({dataCompleteness}%)
                </div>
              </div>
              
              {hasData ? (
                <Chart
                  options={createChartOptions(field)}
                  series={[{
                    name: field.title,
                    type: 'area',
                    data: fieldData
                  }]}
                  type="area"
                  height={350}
                />
              ) : (
                <div className="flex items-center justify-center" style={{ height: '350px' }}>
                  <div className="text-center">
                    <div className="text-red-500 text-3xl mb-2">⚠️</div>
                    <p className="text-red-400 text-lg font-semibold">{field.title}</p>
                    <p className="text-red-300 text-sm mt-2">No valid data available</p>
                    <p className="text-gray-500 text-xs mt-1">Field: {field.key}</p>
                    <p className="text-gray-500 text-xs mt-1">
                      Check for NaN/null values in source data
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-6 text-xs text-gray-500 border-t border-gray-700 pt-3">
        <div className="flex justify-between">
          <span>💡 Each chart: Zoom with mouse wheel • Pan with click & drag • Reset with toolbar</span>
          <span>Synchronized date range across all charts</span>
        </div>
      </div>
    </div>
  );
};

export default MultiFieldChart;