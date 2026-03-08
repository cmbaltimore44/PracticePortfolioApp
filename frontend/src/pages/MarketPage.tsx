import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { TrendingUp, TrendingDown, RefreshCw, Star, Search, Filter, X, BarChart3, Activity, Globe } from 'lucide-react';
import TradeModal from '../components/TradeModal';

interface StockQuote {
  ticker: string;
  price: number;
  change: number;
  percent_change: number;
  is_favorite: boolean;
  volume: string;
  high_24h: number;
  low_24h: number;
  category: string;
}

const MarketPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const categoryParam = searchParams.get('category');
  
  const [stocks, setStocks] = useState<StockQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<{ticker: string, price: number} | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuth();

  const fetchStocks = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const endpoint = categoryParam 
        ? `http://localhost:8000/market/categories/${categoryParam}`
        : 'http://localhost:8000/market/stocks';
        
      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (Array.isArray(data)) {
        setStocks(data);
      } else {
        setError('Failed to load market data.');
      }
    } catch (error) {
      setError('Connection to market terminal lost.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery) return;
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/market/search?symbol=${searchQuery.toUpperCase()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data && data.ticker) {
        if (!stocks.find(s => s.ticker === data.ticker)) {
          setStocks([data, ...stocks]);
        }
      }
      setSearchQuery('');
    } catch (err) {
      console.error(err);
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
        setStocks(stocks.map(s => s.ticker === ticker ? { ...s, is_favorite: !currentStatus } : s));
      }
    } catch (error) {
      console.error(error);
    }
  };

  const clearFilter = () => {
    setSearchParams({});
  };

  useEffect(() => {
    fetchStocks();
    const interval = setInterval(fetchStocks, 60000);
    return () => clearInterval(interval);
  }, [token, categoryParam]);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-12 pb-20">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 bg-rh-surface/20 p-8 rounded-[40px] border border-rh-border backdrop-blur-md">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <Globe size={20} className="text-blue-500 animate-pulse" />
            <h2 className="text-4xl font-black text-white tracking-tighter uppercase">Market Hub</h2>
          </div>
          <div className="flex items-center space-x-3">
            {categoryParam ? (
              <div className="flex items-center bg-blue-500/20 text-blue-400 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-blue-500/30 shadow-[0_0_15px_rgba(0,136,255,0.2)]">
                <Filter size={12} className="mr-2" />
                Sector: {categoryParam}
                <button onClick={clearFilter} className="ml-3 hover:text-white transition-colors"><X size={14} /></button>
              </div>
            ) : (
              <p className="text-rh-gray font-bold text-[10px] tracking-[0.2em] uppercase opacity-60">Global Asset Intelligence Network</p>
            )}
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-6">
          <form onSubmit={handleSearch} className="relative group flex-1 min-w-[320px]">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-rh-gray group-focus-within:text-blue-500 transition-all" size={18} />
            <input 
              type="text"
              placeholder="Search ticker (e.g. NVDA)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-rh-black/50 border border-rh-border rounded-2xl pl-14 pr-6 py-4 text-xs text-white focus:outline-none focus:border-blue-500/50 transition-all font-bold placeholder:opacity-30"
            />
          </form>
          
          <button
            onClick={fetchStocks}
            disabled={loading}
            className="p-4 bg-rh-surface rounded-2xl border border-rh-border text-rh-gray hover:text-white transition-all hover:border-rh-white/20 hover:shadow-lg disabled:opacity-50"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      {/* Favorites Section */}
      {stocks.some(s => s.is_favorite) && !categoryParam && (
        <section className="space-y-8">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-yellow-500/20 rounded-2xl border border-yellow-500/30">
              <Star className="text-yellow-500" size={20} fill="currentColor" />
            </div>
            <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Your Intelligence Watchlist</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {stocks.filter(s => s.is_favorite).map(stock => (
              <StockCard key={`fav-${stock.ticker}`} stock={stock} onTrade={(ticker, price) => { setSelectedStock({ticker, price}); setIsTradeModalOpen(true); }} onToggleFav={toggleFavorite} onNavigate={(t) => navigate(`/stocks/${t}`)} />
            ))}
          </div>
        </section>
      )}

      {/* Main Market List */}
      <section className="space-y-8">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-rh-green/20 rounded-2xl border border-rh-green/30">
            <Activity className="text-rh-green" size={20} />
          </div>
          <h3 className="text-2xl font-black text-white uppercase tracking-tighter">
            {categoryParam ? `Sector Analysis: ${categoryParam}` : 'Real-Time Market Activity'}
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {error ? (
            <div className="col-span-full py-20 rh-card text-center bg-red-500/5 border-red-500/20">
              <p className="text-rh-red font-black uppercase tracking-widest text-xs mb-6">{error}</p>
              <button onClick={fetchStocks} className="px-8 py-3 bg-rh-white/5 rounded-2xl border border-rh-border text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white/10 transition-all">Attempt Reconnection</button>
            </div>
          ) : stocks.length === 0 && loading ? (
            Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="rh-card h-72 animate-pulse bg-rh-surface/40 rounded-[32px]"></div>
            ))
          ) : (
            stocks.map(stock => (
               <StockCard key={stock.ticker} stock={stock} onTrade={(ticker, price) => { setSelectedStock({ticker, price}); setIsTradeModalOpen(true); }} onToggleFav={toggleFavorite} onNavigate={(t) => navigate(`/stocks/${t}`)} />
            ))
          )}
        </div>
      </section>

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

const StockCard: React.FC<{ 
  stock: StockQuote, 
  onTrade: (t: string, p: number) => void, 
  onToggleFav: (t: string, s: boolean, e: React.MouseEvent) => void,
  onNavigate: (t: string) => void
}> = ({ stock, onTrade, onToggleFav, onNavigate }) => {
  const isUp = stock.change >= 0;
  
  const getSectorColor = (cat: string) => {
    const c = (cat || '').toLowerCase();
    if (c === 'technology') return 'from-blue-600/20 via-blue-600/5 to-transparent border-blue-600/30';
    if (c === 'finance') return 'from-yellow-600/20 via-yellow-600/5 to-transparent border-yellow-600/30';
    if (c === 'consumer') return 'from-pink-600/20 via-pink-600/5 to-transparent border-pink-600/30';
    if (c === 'healthcare') return 'from-emerald-600/20 via-emerald-600/5 to-transparent border-emerald-600/30';
    if (c === 'energy') return 'from-orange-600/20 via-orange-600/5 to-transparent border-orange-600/30';
    return 'from-rh-green/10 via-rh-green/5 to-transparent border-rh-border';
  };

  const getAccentColor = (cat: string) => {
     const c = (cat || '').toLowerCase();
    if (c === 'technology') return 'text-blue-400';
    if (c === 'finance') return 'text-yellow-400';
    if (c === 'consumer') return 'text-pink-400';
    if (c === 'healthcare') return 'text-emerald-400';
    if (c === 'energy') return 'text-orange-400';
    return 'text-rh-green';
  };

  return (
    <div 
      onClick={() => onNavigate(stock.ticker)}
      className={`rh-card p-8 flex flex-col justify-between group cursor-pointer hover:shadow-2xl transition-all duration-500 bg-gradient-to-br ${getSectorColor(stock.category)} rounded-[32px] overflow-hidden relative`}
    >
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
      
      <div className="flex justify-between items-start mb-8 relative z-10">
        <div>
          <h4 className="text-2xl font-black text-white group-hover:scale-110 origin-left transition-transform uppercase tracking-tighter">{stock.ticker}</h4>
          <p className={`text-[9px] font-black uppercase tracking-[0.2em] mt-1 ${getAccentColor(stock.category)} opacity-80`}>{stock.category || 'Asset'}</p>
        </div>
        <button 
          onClick={(e) => onToggleFav(stock.ticker, stock.is_favorite, e)}
          className={`p-2.5 rounded-xl transition-all duration-300 ${stock.is_favorite ? 'text-yellow-400 bg-yellow-400/10 shadow-[0_0_10px_rgba(255,215,0,0.2)]' : 'text-rh-gray hover:bg-white/5 border border-transparent hover:border-rh-border'}`}
        >
          <Star size={18} fill={stock.is_favorite ? 'currentColor' : 'none'} />
        </button>
      </div>

      <div className="space-y-8 relative z-10">
        <div className="flex items-end justify-between">
          <span className="text-3xl font-black text-white tracking-tighter drop-shadow-lg font-mono">${stock.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          <div className={`flex items-center space-x-1 font-black text-xs ${isUp ? 'text-rh-green' : 'text-rh-red'} bg-black/40 px-3 py-1.5 rounded-full border ${isUp ? 'border-rh-green/20' : 'border-rh-red/20'}`}>
            {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            <span>{Math.abs(stock.percent_change).toFixed(2)}%</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 pt-8 border-t border-rh-white/5">
          <div className="space-y-1">
            <p className="text-[8px] font-black text-rh-gray uppercase tracking-widest flex items-center opacity-60">
              <BarChart3 size={10} className="mr-1.5" /> Volume
            </p>
            <p className="text-xs font-black text-white uppercase tracking-tighter">{stock.volume || '--'}</p>
          </div>
          <div className="space-y-1 text-right">
             <p className="text-[8px] font-black text-rh-gray uppercase tracking-widest opacity-60">24h Range</p>
             <p className="text-xs font-black text-white uppercase tracking-tighter">
               ${stock.low_24h?.toFixed(0)} - ${stock.high_24h?.toFixed(0)}
             </p>
          </div>
        </div>
      </div>

      <button 
        onClick={(e) => { e.stopPropagation(); onTrade(stock.ticker, stock.price); }}
        className="mt-8 w-full py-4 bg-white/5 border border-rh-border rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-white hover:bg-white hover:text-black hover:border-white transition-all duration-300 shadow-xl"
      >
        Initialize Trade
      </button>
    </div>
  );
};

export default MarketPage;
