import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { TrendingUp, TrendingDown, RefreshCw, Star, Search } from 'lucide-react';
import TradeModal from '../components/TradeModal';

interface StockQuote {
  ticker: string;
  price: number;
  change: number;
  percent_change: number;
  is_favorite: boolean;
  error?: string;
}

const MarketPage: React.FC = () => {
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
      const response = await fetch('http://localhost:8000/market/stocks', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (Array.isArray(data)) {
        setStocks(data);
      } else {
        console.error('Invalid response format:', data);
        setError('Failed to load market data.');
      }
    } catch (error) {
      console.error('Failed to fetch stocks:', error);
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
      // If stock already in list, don't duplicate, just move to front or focus
      // For now, if it's a search, we can just prepend it if not there
      if (!stocks.find(s => s.ticker === data.ticker)) {
        setStocks([data, ...stocks]);
      }
      setSearchQuery('');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openTradeModal = (ticker: string, price: number) => {
    setSelectedStock({ ticker, price });
    setIsTradeModalOpen(true);
  };

  const toggleFavorite = async (ticker: string, currentStatus: boolean) => {
    try {
      const method = currentStatus ? 'DELETE' : 'POST';
      const response = await fetch(`http://localhost:8000/favorites/${ticker}`, {
        method,
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        setStocks(stocks.map(s => 
          s.ticker === ticker ? { ...s, is_favorite: !currentStatus } : s
        ));
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  useEffect(() => {
    fetchStocks();
    const interval = setInterval(fetchStocks, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [token]);

  return (
    <div className="p-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
        <div>
          <h2 className="text-4xl font-bold text-white tracking-tight">Market Terminals</h2>
          <p className="text-gray-400 mt-1 font-medium italic">Global asset intelligence & real-time monitoring</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <form onSubmit={handleSearch} className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-colors" size={18} />
            <input 
              type="text"
              placeholder="Search ticker..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-2xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 w-64 transition-all"
            />
          </form>
          
          <button
            onClick={fetchStocks}
            disabled={loading}
            className="p-3 bg-gray-800 rounded-2xl border border-gray-700 text-gray-400 hover:text-white transition-all disabled:opacity-50 hover:border-gray-500"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>
      
      {stocks.some(s => s.is_favorite) && (
        <section className="mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-yellow-400/10 rounded-xl">
              <Star className="text-yellow-400" size={20} fill="currentColor" />
            </div>
            <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Your Intelligence Watchlist</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {stocks.filter(s => s.is_favorite).map((stock) => (
              <div key={`fav-${stock.ticker}`} className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-3xl border border-yellow-500/20 hover:border-yellow-500/40 transition-all group relative overflow-hidden shadow-xl shadow-yellow-900/5">
                <div className="absolute top-0 right-0 p-4">
                   <button 
                    onClick={() => toggleFavorite(stock.ticker, stock.is_favorite)}
                    className="text-yellow-400 hover:scale-110 transition-transform"
                  >
                    <Star size={18} fill="currentColor" />
                  </button>
                </div>
                
                <div className="mb-6">
                  <h3 className="text-xl font-black text-white group-hover:text-yellow-400 transition-colors uppercase tracking-tight">
                    {stock.ticker}
                  </h3>
                  <div className={`flex items-center space-x-1 font-bold text-xs mt-1 ${stock.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {stock.change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    <span>{Math.abs(stock.percent_change || 0).toFixed(2)}%</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-white font-mono">${stock.price?.toFixed(2) || '0.00'}</span>
                  <button 
                    onClick={() => openTradeModal(stock.ticker, stock.price)}
                    className="px-4 py-2 bg-gray-700/50 hover:bg-yellow-500 text-gray-300 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest border border-gray-600 hover:border-yellow-500 transition-all"
                  >
                    Trade
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-blue-500/10 rounded-xl">
          <TrendingUp className="text-blue-400" size={20} />
        </div>
        <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Market Overview</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {error ? (
          <div className="col-span-full p-12 bg-red-500/10 border border-red-500/20 rounded-3xl text-center">
            <p className="text-red-400 font-bold mb-4">{error}</p>
            <button 
              onClick={fetchStocks}
              className="px-6 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors text-xs font-bold uppercase"
            >
              Retry Connection
            </button>
          </div>
        ) : loading && stocks.length === 0 ? (
          <div className="col-span-full p-12 text-center text-gray-500 font-medium">
            <RefreshCw size={24} className="animate-spin mx-auto mb-4 opacity-20" />
            Synchronizing with global exchanges...
          </div>
        ) : (
          stocks.map((stock) => (
            <div key={stock.ticker} className="bg-gray-800 p-6 rounded-3xl border border-gray-700 hover:border-blue-500/30 transition-all group relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              
              <button 
                onClick={() => toggleFavorite(stock.ticker, stock.is_favorite)}
                className={`absolute top-4 right-4 p-1.5 rounded-lg transition-all z-10 ${
                  stock.is_favorite ? 'text-yellow-400 bg-yellow-400/10' : 'text-gray-600 hover:text-yellow-400 hover:bg-yellow-400/5'
                }`}
              >
                <Star size={16} fill={stock.is_favorite ? 'currentColor' : 'none'} />
              </button>
              
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-black text-white group-hover:text-blue-400 transition-colors uppercase tracking-tight">
                    {stock.ticker}
                  </h3>
                  <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-0.5">Global Equity</p>
                </div>
                <div className={`flex flex-col items-end mr-8 ${stock.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  <div className="flex items-center space-x-1 font-bold">
                    {stock.change >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    <span>{Math.abs(stock.percent_change || 0).toFixed(2)}%</span>
                  </div>
                  <span className="text-[10px] opacity-60 font-medium">{stock.change >= 0 ? '+' : ''}{stock.change?.toFixed(2)}</span>
                </div>
              </div>
              
              <div className="flex items-end mb-6">
                <span className="text-3xl font-bold text-white font-mono">${stock.price?.toFixed(2) || '0.00'}</span>
              </div>
              
              <button 
                onClick={() => openTradeModal(stock.ticker, stock.price)}
                className="w-full py-3 bg-gray-900 border border-gray-700 rounded-2xl text-xs font-black uppercase tracking-widest text-gray-400 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-xl shadow-black/20"
              >
                Execute Trade
              </button>
            </div>
          ))
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
