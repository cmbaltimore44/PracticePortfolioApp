import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { TrendingUp, TrendingDown, RefreshCw, Star, Search, BarChart3, Activity, Globe, ArrowUpDown, ChevronRight, Zap } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import TradeModal from '../components/TradeModal';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';

interface StockQuote {
  ticker: string;
  name: string;
  price: number;
  change: number;
  percent_change: number;
  is_favorite: boolean;
  volume: string;
  raw_volume: number;
  avg_vol_3m: string;
  market_cap: string;
  raw_market_cap: number;
  pe_ratio: string;
  yield: string;
  high_24h: number;
  low_24h: number;
  category: string;
}

type MarketCollection = 'all' | 'most-active' | 'gainers' | 'losers' | 'trending';

const Sparkline: React.FC<{ data: number[], color: string }> = ({ data, color }) => (
  <div className="h-8 w-24">
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data.map((v, i) => ({ v, i }))}>
        <YAxis hide domain={['dataMin', 'dataMax']} />
        <Line 
          type="monotone" 
          dataKey="v" 
          stroke={color} 
          strokeWidth={1.5} 
          dot={false} 
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  </div>
);

interface StockRowProps {
  stock: StockQuote;
  onNavigate: (ticker: string) => void;
  onToggleFavorite: (ticker: string, currentStatus: boolean, e: React.MouseEvent) => void;
  onTrade: (ticker: string, price: number) => void;
}

const StockRow: React.FC<StockRowProps> = ({ stock, onNavigate, onToggleFavorite, onTrade }) => {
  const isPositive = stock.change >= 0;
  const sparkColor = isPositive ? '#00ff0a' : '#ff3b3b';

  const sparkData = useMemo(() => {
    const yesterdayPrice = stock.price / (1 + stock.percent_change / 100);
    const seed = stock.ticker.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return Array.from({ length: 12 }, (_, i) => {
      const progress = i / 11;
      const trend = yesterdayPrice + (stock.price - yesterdayPrice) * progress;
      const volatility = Math.sin(seed + i) * (stock.price * 0.008);
      return i === 11 ? stock.price : (i === 0 ? yesterdayPrice : trend + volatility);
    });
  }, [stock.ticker, stock.price, stock.percent_change]);

  return (
    <tr
      onClick={() => onNavigate(stock.ticker)}
      className="hover:bg-white/[0.04] transition-all cursor-pointer group"
    >
      <td className="p-6">
        <button
          onClick={(e) => onToggleFavorite(stock.ticker, stock.is_favorite, e)}
          className={`transition-colors ${stock.is_favorite ? 'text-yellow-500' : 'text-rh-gray hover:text-white'}`}
        >
          <Star size={14} fill={stock.is_favorite ? 'currentColor' : 'none'} />
        </button>
      </td>
      <td className="p-6">
        <div className="flex flex-col">
          <span className="text-sm font-black text-white uppercase tracking-widest group-hover:text-rh-green transition-colors">{stock.ticker}</span>
          <span className="text-[8px] font-black text-rh-gray uppercase tracking-widest opacity-40">{stock.name}</span>
        </div>
      </td>
      <td className="p-6">
        <Sparkline data={sparkData} color={sparkColor} />
      </td>
      <td className="p-6 text-right font-mono text-xs font-black text-white">
        ${stock.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </td>
      <td className={`p-6 text-right font-mono text-xs font-black ${isPositive ? 'text-rh-green' : 'text-rh-red'}`}>
        <div className="flex items-center justify-end space-x-1">
          {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          <span>{isPositive ? '+' : ''}{stock.percent_change.toFixed(2)}%</span>
        </div>
      </td>
      <td className="p-6 text-right text-[10px] font-black text-white uppercase opacity-80">{stock.volume}</td>
      <td className="p-6 text-right text-[10px] font-black text-rh-gray uppercase opacity-40">{stock.avg_vol_3m || '--'}</td>
      <td className="p-6 text-right text-[10px] font-black text-white uppercase opacity-80">{stock.market_cap || '--'}</td>
      <td className="p-6 text-right text-[10px] font-black text-rh-gray uppercase opacity-60">{stock.pe_ratio || '--'}</td>
      <td className="p-6 text-right text-[10px] font-black text-blue-400 opacity-60">{stock.yield || '--'}</td>
      <td className="p-6 text-right">
        <button
          onClick={(e) => { e.stopPropagation(); onTrade(stock.ticker, stock.price); }}
          className="p-2.5 bg-rh-surface/40 hover:bg-white hover:text-black rounded-lg transition-all border border-rh-border"
        >
          <ChevronRight size={14} />
        </button>
      </td>
    </tr>
  );
};

const MarketPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const categoryParam = searchParams.get('category');
  
  const [stocks, setStocks] = useState<StockQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCollection, setActiveCollection] = useState<MarketCollection>('most-active');
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<{ticker: string, price: number} | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: keyof StockQuote | 'price' | 'percent_change', direction: 'asc' | 'desc' } | null>({ key: 'ticker', direction: 'asc' });
  
  const { token } = useAuth();
  const { showToast } = useToast();

  const fetchStocks = async () => {
    if (!token) return;
    setLoading(true);
    try {
      let endpoint = `http://localhost:8000/market/stocks`;
      if (activeCollection !== 'all') {
        endpoint = `http://localhost:8000/market/collections/${activeCollection}`;
      } else if (categoryParam) {
        endpoint = `http://localhost:8000/market/categories/${categoryParam}`;
      }
        
      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (Array.isArray(data)) {
        setStocks(data);
      } else {
        showToast('Failed to load market data.', 'error');
      }
    } catch (error) {
      showToast('Connection to market terminal lost.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStocks();
    const interval = setInterval(fetchStocks, 60000);
    return () => clearInterval(interval);
  }, [token, categoryParam, activeCollection]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery) return;
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/market/search?symbol=${searchQuery.toUpperCase()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 404) {
        showToast(`Security '${searchQuery.toUpperCase()}' not identified in active index.`, 'info');
        return;
      }
      const data = await response.json();
      if (data && data.ticker) {
        navigate(`/stocks/${data.ticker}`);
      }
    } catch (err) {
      showToast('Search execution failed. Check nexus connectivity.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (ticker: string, currentStatus: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const method = currentStatus ? 'DELETE' : 'POST';
      const response = await fetch(`http://localhost:8000/favorites/${ticker}`, {
        method,
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        setStocks(prev => prev.map(s => s.ticker === ticker ? { ...s, is_favorite: !currentStatus } : s));
        showToast(currentStatus ? `Removed ${ticker} from watchlist` : `Added ${ticker} to watchlist`, 'success');
      }
    } catch (error) {
        console.error(error);
    }
  };

  const requestSort = (key: any) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedStocks = useMemo(() => {
    let sortableItems = [...stocks];
    if (sortConfig !== null) {
      sortableItems.sort((a: any, b: any) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];
        
        // Handle numeric parsing for raw values if needed
        if (sortConfig.key === 'raw_volume' || sortConfig.key === 'price' || sortConfig.key === 'percent_change' || sortConfig.key === 'raw_market_cap') {
            aVal = parseFloat(aVal) || 0;
            bVal = parseFloat(bVal) || 0;
        }

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [stocks, sortConfig]);

  const collections = [
    { id: 'most-active', name: 'Most Active', icon: Activity },
    { id: 'gainers', name: 'Top Gainers', icon: TrendingUp },
    { id: 'losers', name: 'Top Losers', icon: TrendingDown },
    { id: 'watchlist', name: 'Watchlist', icon: Star },
    { id: 'trending', name: 'Trending', icon: Zap },
    { id: 'all', name: 'All Stocks', icon: Globe },
  ];

  const getSortIcon = (key: string) => {
    if (sortConfig?.key !== key) return <ArrowUpDown size={10} className="opacity-20 ml-1" />;
    return sortConfig.direction === 'asc' ? <TrendingUp size={10} className="ml-1 text-rh-green" /> : <TrendingDown size={10} className="ml-1 text-rh-red" />;
  };

  return (
    <div className="p-4 md:p-8 max-w-full mx-auto space-y-8 pb-24 overflow-x-hidden">
      {/* Header Section */}
      <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 bg-rh-surface/10 p-6 rounded-3xl border border-rh-border backdrop-blur-sm">
        <div className="flex items-center space-x-4">
          <div className="p-4 bg-rh-green/10 rounded-2xl border border-rh-green/20">
            <BarChart3 className="text-rh-green" size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tighter uppercase">Market Terminal</h1>
            <p className="text-rh-gray text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Live Security Index Alpha-Core</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <form onSubmit={handleSearch} className="relative group flex-1 w-full sm:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-rh-gray group-focus-within:text-rh-green transition-colors" size={16} />
            <input 
              type="text"
              placeholder="Inject Ticker..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-rh-black/40 border border-rh-border rounded-xl pl-12 pr-4 py-3 text-xs text-white focus:outline-none focus:border-rh-green/40 transition-all font-mono tracking-widest uppercase"
            />
          </form>
          <button
            onClick={fetchStocks}
            className="p-3 bg-rh-surface/20 rounded-xl border border-rh-border text-rh-gray hover:text-white transition-all"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      {/* Collection Tabs */}
      <div className="flex items-center space-x-1 p-1 bg-rh-surface/10 rounded-2xl border border-rh-border w-fit max-w-full overflow-x-auto no-scrollbar">
        {collections.map((col) => (
          <button
            key={col.id}
            onClick={() => { setActiveCollection(col.id as MarketCollection); setSearchParams({}); }}
            className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
              activeCollection === col.id 
                ? 'bg-rh-green text-rh-black shadow-[0_0_30px_rgba(0,255,10,0.3)] border border-rh-green' 
                : 'text-rh-gray hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <col.icon size={14} />
            <span>{col.name}</span>
          </button>
        ))}
      </div>

      {/* Main High-Density Table */}
      <div className="bg-rh-black/40 border border-rh-border rounded-[32px] overflow-hidden shadow-2xl relative">
        {loading && stocks.length === 0 && (
          <div className="absolute inset-0 bg-rh-black/60 backdrop-blur-[2px] z-50 flex items-center justify-center">
            <div className="flex flex-col items-center space-y-4">
              <div className="w-12 h-12 border-4 border-rh-green/20 border-t-rh-green rounded-full animate-spin"></div>
              <p className="text-[10px] font-black text-rh-green uppercase tracking-widest animate-pulse">Syncing Flux Streams...</p>
            </div>
          </div>
        )}
        {loading && stocks.length > 0 && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-rh-green/20 overflow-hidden z-50">
            <div className="h-full bg-rh-green animate-progress-fast w-[40%]"></div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead>
              <tr className="border-b border-rh-border bg-white/[0.02]">
                <th className="p-6 w-12 font-black text-[9px] text-rh-gray uppercase tracking-widest">Fav</th>
                <th className="p-6 cursor-pointer group hover:text-white" onClick={() => requestSort('ticker')}>
                  <div className="flex items-center font-black text-[9px] text-rh-gray uppercase tracking-widest transition-colors group-hover:text-white">
                    Symbol {getSortIcon('ticker')}
                  </div>
                </th>
                <th className="p-6 font-black text-[9px] text-rh-gray uppercase tracking-widest">Intraday Trend</th>
                <th className="p-6 text-right cursor-pointer group" onClick={() => requestSort('price')}>
                  <div className="flex items-center justify-end font-black text-[9px] text-rh-gray uppercase tracking-widest transition-colors group-hover:text-white">
                    Price {getSortIcon('price')}
                  </div>
                </th>
                <th className="p-6 text-right cursor-pointer group" onClick={() => requestSort('percent_change')}>
                  <div className="flex items-center justify-end font-black text-[9px] text-rh-gray uppercase tracking-widest transition-colors group-hover:text-white">
                    Change % {getSortIcon('percent_change')}
                  </div>
                </th>
                <th className="p-6 text-right cursor-pointer group" onClick={() => requestSort('raw_volume')}>
                  <div className="flex items-center justify-end font-black text-[9px] text-rh-gray uppercase tracking-widest transition-colors group-hover:text-white">
                    Vol {getSortIcon('raw_volume')}
                  </div>
                </th>
                <th className="p-6 text-right font-black text-[9px] text-rh-gray uppercase tracking-widest">Avg Vol (3M)</th>
                <th className="p-6 text-right cursor-pointer group" onClick={() => requestSort('raw_market_cap')}>
                  <div className="flex items-center justify-end font-black text-[9px] text-rh-gray uppercase tracking-widest transition-colors group-hover:text-white">
                    Mkt Cap {getSortIcon('raw_market_cap')}
                  </div>
                </th>
                <th className="p-6 text-right font-black text-[9px] text-rh-gray uppercase tracking-widest">PE Ratio</th>
                <th className="p-6 text-right font-black text-[9px] text-rh-gray uppercase tracking-widest">Yield</th>
                <th className="p-6 text-right font-black text-[9px] text-rh-gray uppercase tracking-widest">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rh-border">
              {sortedStocks.map((stock) => (
                <StockRow
                  key={stock.ticker}
                  stock={stock}
                  onNavigate={(ticker) => navigate(`/stocks/${ticker}`)}
                  onToggleFavorite={toggleFavorite}
                  onTrade={(ticker, price) => { setSelectedStock({ ticker, price }); setIsTradeModalOpen(true); }}
                />
              ))}
            </tbody>
          </table>
        </div>
        
        {!loading && stocks.length === 0 && (
          <div className="p-20 text-center">
            <Globe size={48} className="mx-auto text-rh-gray opacity-20 mb-6" />
            <p className="text-rh-gray text-xs font-black uppercase tracking-widest opacity-40">No securities identified in this cluster.</p>
          </div>
        )}
      </div>

      {selectedStock && (
        <TradeModal 
          isOpen={isTradeModalOpen}
          onClose={() => setIsTradeModalOpen(false)}
          ticker={selectedStock.ticker}
          price={selectedStock.price}
          onSuccess={fetchStocks}
        />
      )}
    </div>
  );
};

export default MarketPage;
