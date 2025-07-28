// frontend/src/components/StockInfoPanel.jsx
import React, { useMemo } from 'react';
import { 
  Building2, 
  Factory, 
  Star, 
  TrendingUp, 
  BarChart3, 
  DollarSign,
  CheckCircle,
  XCircle,
  Award,
  Target,
  Activity
} from 'lucide-react';

/**
 * Stock Information Panel Component
 * Displays basic stock information and ratings
 * 
 * @param {Object} props
 * @param {Array} props.data - Array of stock data objects
 * @param {string} props.selectedSymbol - Currently selected stock symbol
 * @param {boolean} props.loading - Loading state
 */
const StockInfoPanel = ({ 
  data = [], 
  selectedSymbol = '', 
  loading = false 
}) => {
  
  // Extract stock information from the first data point (assuming static info is same across all records)
  const stockInfo = useMemo(() => {
    if (!data || data.length === 0) return null;
    
    const firstRecord = data[0];
    
    return {
      sector: firstRecord.SECTOR || 'N/A',
      industry: firstRecord.INDUSTRY || 'N/A',
      stockRating: firstRecord.STOCK_RATING || 'N/A',
      qualityScore: firstRecord.QUALITY_SCORE || 'N/A',
      growthScore: firstRecord.GROWTH_SCORE || 'N/A',
      mcapCategory: firstRecord.MCAP_CATEGORY || 'N/A',
      nifty50: firstRecord.NIFTY_50 || 'N/A',
      fno: firstRecord.FNO || 'N/A',
      flag: firstRecord.FLAG || 'N/A',
      nifty500: firstRecord.NIFTY_500 || 'N/A',
      next50: firstRecord.NEXT_50 || 'N/A',
      alpha50: firstRecord.ALPHA_50 || 'N/A',
      beta50: firstRecord.BETA_50 || 'N/A'
    };
  }, [data]);

  // Helper function to format boolean/yes-no values
  const formatBoolean = (value) => {
    if (value === null || value === undefined || value === 'N/A') return 'N/A';
    const stringValue = String(value).toLowerCase();
    return ['yes', 'y', '1', 'true', 'included'].includes(stringValue) ? 'Yes' : 'No';
  };

  // Helper function to get color for rating/score
  const getRatingColor = (value, type = 'rating') => {
    if (!value || value === 'N/A') return 'text-gray-400';
    
    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      // For non-numeric ratings
      const stringValue = String(value).toLowerCase();
      if (['buy', 'strong buy', 'a', 'aa', 'aaa'].includes(stringValue)) return 'text-green-400';
      if (['hold', 'neutral', 'b', 'bb'].includes(stringValue)) return 'text-yellow-400';
      if (['sell', 'strong sell', 'c', 'cc', 'd'].includes(stringValue)) return 'text-red-400';
      return 'text-blue-400';
    }
    
    // For numeric scores (assuming 1-10 scale)
    if (numValue >= 7) return 'text-green-400';
    if (numValue >= 4) return 'text-yellow-400';
    return 'text-red-400';
  };

  // Helper function to get icon for field type
  const getFieldIcon = (fieldType) => {
    const iconProps = { className: "w-4 h-4" };
    
    switch (fieldType) {
      case 'sector': return <Building2 {...iconProps} />;
      case 'industry': return <Factory {...iconProps} />;
      case 'rating': return <Star {...iconProps} />;
      case 'quality': return <Award {...iconProps} />;
      case 'growth': return <TrendingUp {...iconProps} />;
      case 'mcap': return <DollarSign {...iconProps} />;
      case 'index': return <BarChart3 {...iconProps} />;
      case 'fno': return <Target {...iconProps} />;
      case 'flag': return <Activity {...iconProps} />;
      default: return <CheckCircle {...iconProps} />;
    }
  };

  // Helper function to get boolean icon
  const getBooleanIcon = (value) => {
    const formattedValue = formatBoolean(value);
    return formattedValue === 'Yes' ? 
      <CheckCircle className="w-4 h-4 text-green-400" /> : 
      formattedValue === 'No' ?
      <XCircle className="w-4 h-4 text-red-400" /> :
      <div className="w-4 h-4 rounded-full bg-gray-500"></div>;
  };

  // Clean symbol name for display
  const getDisplaySymbol = (symbol) => {
    return symbol.replace('.NS', '').replace('.BO', '');
  };

  // Loading state
  if (loading) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-lg rounded-2xl border border-slate-700/50 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-slate-700 rounded w-3/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3">
                <div className="w-4 h-4 bg-slate-700 rounded"></div>
                <div className="h-3 bg-slate-700 rounded w-1/3"></div>
                <div className="h-3 bg-slate-700 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // No data state
  if (!stockInfo) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-lg rounded-2xl border border-slate-700/50 p-6">
        <div className="text-center">
          <Building2 className="w-12 h-12 text-slate-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-white mb-2">No Stock Information</h3>
          <p className="text-slate-400 text-sm">
            Select a stock symbol to view detailed information
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 backdrop-blur-lg rounded-2xl border border-slate-700/50 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-2 rounded-lg">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">
              {getDisplaySymbol(selectedSymbol)} Stock Info
            </h3>
            <p className="text-slate-400 text-sm">{data.length} data points</p>
          </div>
        </div>
      </div>

      {/* Stock Information Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Basic Information */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-slate-300 border-b border-slate-700 pb-2">
            📊 Basic Information
          </h4>
          
          <div className="flex items-center justify-between py-2 border-b border-slate-700/50">
            <div className="flex items-center space-x-2">
              {getFieldIcon('sector')}
              <span className="text-slate-400 text-sm">Sector</span>
            </div>
            <span className="text-white text-sm font-medium">{stockInfo.sector}</span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-slate-700/50">
            <div className="flex items-center space-x-2">
              {getFieldIcon('industry')}
              <span className="text-slate-400 text-sm">Industry</span>
            </div>
            <span className="text-white text-sm font-medium">{stockInfo.industry}</span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-slate-700/50">
            <div className="flex items-center space-x-2">
              {getFieldIcon('mcap')}
              <span className="text-slate-400 text-sm">Market Cap</span>
            </div>
            <span className="text-white text-sm font-medium">{stockInfo.mcapCategory}</span>
          </div>

          <div className="flex items-center justify-between py-2">
            <div className="flex items-center space-x-2">
              {getFieldIcon('flag')}
              <span className="text-slate-400 text-sm">Flag Status</span>
            </div>
            <span className="text-white text-sm font-medium">{stockInfo.flag}</span>
          </div>
        </div>

        {/* Ratings & Scores */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-slate-300 border-b border-slate-700 pb-2">
            ⭐ Ratings & Scores
          </h4>

          <div className="flex items-center justify-between py-2 border-b border-slate-700/50">
            <div className="flex items-center space-x-2">
              {getFieldIcon('rating')}
              <span className="text-slate-400 text-sm">Stock Rating</span>
            </div>
            <span className={`text-sm font-bold ${getRatingColor(stockInfo.stockRating)}`}>
              {stockInfo.stockRating}
            </span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-slate-700/50">
            <div className="flex items-center space-x-2">
              {getFieldIcon('quality')}
              <span className="text-slate-400 text-sm">Quality Score</span>
            </div>
            <span className={`text-sm font-bold ${getRatingColor(stockInfo.qualityScore)}`}>
              {stockInfo.qualityScore}
            </span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-slate-700/50">
            <div className="flex items-center space-x-2">
              {getFieldIcon('growth')}
              <span className="text-slate-400 text-sm">Growth Score</span>
            </div>
            <span className={`text-sm font-bold ${getRatingColor(stockInfo.growthScore)}`}>
              {stockInfo.growthScore}
            </span>
          </div>

          <div className="flex items-center justify-between py-2">
            <div className="flex items-center space-x-2">
              {getFieldIcon('fno')}
              <span className="text-slate-400 text-sm">F&O Available</span>
            </div>
            <div className="flex items-center space-x-2">
              {getBooleanIcon(stockInfo.fno)}
              <span className="text-white text-sm font-medium">{formatBoolean(stockInfo.fno)}</span>
            </div>
          </div>
        </div>

        {/* Index Membership */}
        <div className="lg:col-span-2 space-y-4">
          <h4 className="text-sm font-semibold text-slate-300 border-b border-slate-700 pb-2">
            📈 Index Membership
          </h4>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              { label: 'Nifty 50', value: stockInfo.nifty50 },
              { label: 'Nifty 500', value: stockInfo.nifty500 },
              { label: 'Next 50', value: stockInfo.next50 },
              { label: 'Alpha 50', value: stockInfo.alpha50 },
              { label: 'Beta 50', value: stockInfo.beta50 }
            ].map((index, i) => (
              <div key={i} className="bg-slate-700/30 rounded-lg p-3 text-center">
                <div className="flex justify-center mb-2">
                  {getBooleanIcon(index.value)}
                </div>
                <p className="text-slate-400 text-xs mb-1">{index.label}</p>
                <p className="text-white text-sm font-medium">{formatBoolean(index.value)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockInfoPanel;