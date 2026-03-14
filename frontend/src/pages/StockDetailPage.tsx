import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ArrowLeft, TrendingUp, TrendingDown, Star, Activity, Info, Wallet, Clock, ShieldCheck, Box } from 'lucide-react';
import { AreaChart, Area, Tooltip, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import TradeModal from '../components/TradeModal';

interface StockDetails {
  ticker: string;
  category: string;
  description: string;
  stats: {
    market_cap: string;
    pe_ratio: string;
    dividend_yield: string;
    "52_week_high": string;
    "52_week_low": string;
    volume: string;
  };
}

interface StockQuote {
  ticker: string;
  price: number;
  change: number;
  percent_change: number;
}

const timeframes = ['1D', '5D', '1M', '6M', 'YTD', '1Y', '5Y'];

const StockDetailPage: React.FC = () => {
  const { ticker } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const { showToast } = useToast();
  const [details, setDetails] = useState<StockDetails | null>(null);
  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [timeframe, setTimeframe] = useState('1D');
  const [chartData, setChartData] = useState<any[]>([]);

  const fetchHistory = async (tf: string) => {
    try {
      const res = await fetch(`http://localhost:8000/market/stocks/${ticker}/history?timeframe=${tf}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setChartData(data);
      }
    } catch (err) {
      console.error('History fetch error:', err);
    }
  };

  const fetchAll = async () => {
    try {
      const [detailsRes, quoteRes, favsRes] = await Promise.all([
        fetch(`http://localhost:8000/market/stocks/${ticker}/details`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`http://localhost:8000/market/search?symbol=${ticker}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`http://localhost:8000/favorites`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      const detailsData = await detailsRes.json();
      const quoteData = await quoteRes.json();
      const favsData = await favsRes.json();

      if (quoteData && quoteData.price) {
        setQuote(quoteData);
      } else {
        setQuote({
          ticker: ticker?.toUpperCase() || '',
          price: 0,
          change: 0,
          percent_change: 0
        });
      }
      
      setDetails(detailsData);
      setIsFavorite(Array.isArray(favsData) && favsData.some((f: any) => f.ticker === ticker?.toUpperCase()));
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [ticker]);

  useEffect(() => {
    if (ticker) {
      fetchHistory(timeframe);
    }
  }, [timeframe, ticker]);

  const toggleFavorite = async () => {
    try {
      const method = isFavorite ? 'DELETE' : 'POST';
      const response = await fetch(`http://localhost:8000/favorites/${ticker?.toUpperCase()}`, {
        method,
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        setIsFavorite(!isFavorite);
        showToast(`${ticker?.toUpperCase()} ${isFavorite ? 'Removed from' : 'Added to'} Watchlist`, 'info');
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="p-8 text-rh-gray animate-pulse font-black uppercase tracking-widest text-[10px] min-h-screen flex items-center justify-center">Accessing Exchange Node...</div>;
  if (!quote || quote.price === 0) return (
    <div className="p-20 text-center space-y-6">
      <div className="p-6 bg-red-500/10 rounded-full w-fit mx-auto border border-red-500/20">
        <Box size={40} className="text-rh-red" />
      </div>
      <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Terminal Execution Failure</h2>
      <p className="text-rh-gray font-bold text-xs max-w-sm mx-auto opacity-60">The requested asset security "{ticker}" could not be located in the current market cluster.</p>
      <button onClick={() => navigate('/market')} className="px-8 py-3 bg-rh-white/5 border border-rh-border rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">Emergency Exit</button>
    </div>
  );

  const firstPrice = chartData[0]?.price || 0;
  const lastPrice = chartData[chartData.length - 1]?.price || 0;
  const timeframeIsPositive = lastPrice >= firstPrice;
  const accentColor = timeframeIsPositive ? 'var(--rh-green)' : 'var(--rh-red)';

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-rh-black/80 backdrop-blur-xl border border-rh-white/10 p-4 rounded-2xl shadow-2xl">
          <p className="text-[10px] font-black text-rh-gray uppercase tracking-widest mb-1.5 opacity-60">{payload[0].payload.displayTime}</p>
          <p className="text-xl font-black text-white font-mono tracking-tighter">${payload[0].value.toFixed(2)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-12 pb-24">
      <button 
        onClick={() => navigate('/market')}
        className="flex items-center space-x-2 text-rh-gray hover:text-white transition-all text-[10px] font-black uppercase tracking-widest group"
      >
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
        <span>Return to Market Terminals</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8 space-y-12">
          {/* Hero Section */}
          <section className="bg-gradient-to-br from-rh-surface/40 to-transparent p-10 rounded-[48px] border border-rh-white/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-96 h-96 bg-rh-green/5 blur-[120px] rounded-full group-hover:bg-rh-green/10 transition-colors duration-1000"></div>
            
            <div className="flex justify-between items-start mb-12 relative z-10">
              <div>
                <h1 className="text-6xl font-black tracking-tighter mb-4 uppercase drop-shadow-2xl">{ticker}</h1>
                <div className="flex items-center flex-wrap gap-8">
                  <span className="text-7xl font-black tracking-tighter text-white drop-shadow-xl font-mono">
                    ${quote.price.toFixed(2)}
                  </span>
                  <div className={`flex items-center space-x-3 font-black text-xl px-5 py-2.5 rounded-full border ${quote.change >= 0 ? 'text-rh-green border-rh-green/20 bg-rh-green/5 shadow-[0_0_20px_rgba(0,200,5,0.1)]' : 'text-rh-red border-rh-red/20 bg-rh-red/5 shadow-[0_0_20px_rgba(255,80,0,0.1)]'}`}>
                    {quote.change >= 0 ? <TrendingUp size={28} /> : <TrendingDown size={28} />}
                    <span>{quote.change >= 0 ? '+' : ''}{quote.change.toFixed(2)} ({quote.percent_change.toFixed(2)}%) Today</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={toggleFavorite}
                className={`p-6 rounded-[28px] border transition-all duration-500 shadow-xl ${isFavorite ? 'bg-yellow-400/20 border-yellow-400 text-yellow-400 shadow-yellow-400/10' : 'border-rh-border text-rh-gray hover:text-white hover:border-rh-white/20'}`}
              >
                <Star size={32} fill={isFavorite ? 'currentColor' : 'none'} />
              </button>
            </div>

            <div className="h-[450px] w-full relative group cursor-crosshair">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={accentColor} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={accentColor} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Tooltip 
                    content={<CustomTooltip />}
                    cursor={{ stroke: accentColor, strokeWidth: 1, strokeDasharray: '4 4' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="price" 
                    stroke={accentColor} 
                    strokeWidth={4}
                    fillOpacity={1} 
                    fill="url(#colorVal)" 
                    animationDuration={1000}
                    isAnimationActive={true}
                    connectNulls
                  />
                  <XAxis dataKey="time" hide />
                  <YAxis domain={['auto', 'auto']} hide />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="flex items-center justify-between border-t border-rh-white/5 pt-8 mt-12 relative z-10">
              <div className="flex space-x-3">
                {timeframes.map(tf => (
                  <button 
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${timeframe === tf ? 'bg-white text-black shadow-2xl' : 'text-rh-gray hover:text-white bg-rh-white/5 border border-rh-border'}`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
              <div className="hidden md:flex items-center space-x-3 text-rh-gray opacity-60">
                <Clock size={16} />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">High Fidelity Engine V4</span>
              </div>
            </div>
          </section>

          {/* About Section */}
          <section className="space-y-8 pl-4">
            <h3 className="text-2xl font-black flex items-center space-x-4 uppercase tracking-tighter">
              <Info size={24} className={details?.category === 'Technology' ? 'text-blue-500' : details?.category === 'Finance' ? 'text-yellow-500' : details?.category === 'Consumer' ? 'text-pink-500' : details?.category === 'Healthcare' ? 'text-emerald-500' : details?.category === 'Energy' ? 'text-orange-500' : 'text-rh-green'} />
              <span>Asset Intelligence Profile</span>
            </h3>
            <div className={`p-10 rounded-[40px] border backdrop-blur-sm relative overflow-hidden group transition-all duration-500 ${details?.category === 'Technology' ? 'bg-blue-500/5 border-blue-500/20' : details?.category === 'Finance' ? 'bg-yellow-500/5 border-yellow-500/20' : details?.category === 'Consumer' ? 'bg-pink-500/5 border-pink-500/20' : details?.category === 'Healthcare' ? 'bg-emerald-500/5 border-emerald-500/20' : details?.category === 'Energy' ? 'bg-orange-500/5 border-orange-500/20' : 'bg-rh-surface/30 border-rh-border'}`}>
               <div className={`absolute -bottom-10 -left-10 w-48 h-48 blur-[80px] rounded-full opacity-20 ${details?.category === 'Technology' ? 'bg-blue-500' : details?.category === 'Finance' ? 'bg-yellow-500' : details?.category === 'Consumer' ? 'bg-pink-500' : details?.category === 'Healthcare' ? 'bg-emerald-500' : details?.category === 'Energy' ? 'bg-orange-500' : 'bg-rh-green'}`}></div>
               <p className="text-rh-gray leading-relaxed font-bold text-base tracking-wide relative z-10 opacity-80 group-hover:opacity-100 transition-opacity">
                {details?.description}
              </p>
            </div>
          </section>

          {/* Key Stats */}
          <section className="space-y-10 pl-4">
            <h3 className="text-2xl font-black flex items-center space-x-4 uppercase tracking-tighter">
              <Activity size={24} className="text-rh-green" />
              <span>Operational Metrics Console</span>
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
              {details && Object.entries(details.stats).map(([label, value]) => (
                <div key={label} className="rh-card p-8 border-rh-border/40 bg-rh-black/40 hover:border-rh-green/30 transition-all duration-300 group">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rh-gray mb-3 opacity-60 group-hover:text-rh-green transition-colors">{label.replace(/_/g, ' ')}</p>
                  <p className="text-2xl font-black font-mono text-white tracking-tighter drop-shadow-md">{value}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Sidebar Actions */}
        <div className="lg:col-span-4 space-y-8">
          <div className="rh-card p-10 sticky top-8 border-rh-green/40 bg-gradient-to-br from-rh-surface to-rh-black shadow-[0_20px_80px_rgba(0,200,5,0.1)] rounded-[48px]">
            <div className="mb-12">
              <div className="flex items-center space-x-3 mb-2">
                <ShieldCheck size={20} className="text-rh-green shadow-[0_0_10px_rgba(0,200,5,0.5)]" />
                <h3 className="text-3xl font-black uppercase tracking-tighter">Trade Desk</h3>
              </div>
              <p className="text-rh-gray text-[10px] font-black tracking-[0.3em] uppercase opacity-40">Security Protocol Alpha-9</p>
            </div>
            
            <div className="space-y-8 mb-12">
              <div className="flex justify-between items-center group cursor-help">
                <span className="text-rh-gray text-[10px] font-black uppercase tracking-widest opacity-60">Exchange Status</span>
                <div className="flex items-center space-x-2">
                  <span className="text-rh-green text-[10px] font-black uppercase tracking-widest animate-pulse">Node Live</span>
                  <div className="w-2 h-2 rounded-full bg-rh-green"></div>
                </div>
              </div>
              <div className="flex justify-between items-center text-sm border-t border-rh-white/5 pt-8">
                <span className="text-rh-gray text-[10px] font-black uppercase tracking-widest opacity-60">Brokerage Fee</span>
                <span className="text-white text-[10px] font-black uppercase tracking-widest bg-rh-green/20 text-rh-green px-4 py-1.5 rounded-full border border-rh-green/30 shadow-[0_0_15px_rgba(0,200,5,0.2)]">Zero Execution Cost</span>
              </div>
            </div>

            <button 
              onClick={() => setIsTradeModalOpen(true)}
              className="w-full py-6 bg-rh-green text-rh-black font-black uppercase tracking-[0.3em] text-[11px] rounded-[24px] hover:bg-white hover:text-black transition-all duration-500 shadow-2xl active:scale-[0.96]"
            >
              Order Asset: {ticker}
            </button>
            
            <div className="mt-10 flex items-center justify-center space-x-2 text-rh-gray opacity-20">
              <Box size={14} />
              <span className="text-[9px] font-black uppercase tracking-[0.4em]">Encrypted Terminal</span>
            </div>
          </div>

          <div className="rh-card p-10 border-rh-border/30 rounded-[48px] bg-rh-black/20 backdrop-blur-sm">
            <h3 className="text-xl font-black mb-10 flex items-center space-x-4 uppercase tracking-tighter">
              <Wallet size={24} className="text-rh-green" />
              <span>Active Position</span>
            </h3>
            <div className="bg-rh-black/60 border border-rh-white/5 rounded-[32px] p-10 text-center space-y-4 shadow-inner">
              <p className="text-rh-gray text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Aggregate Shares Owned</p>
              <p className="text-5xl font-black text-white tracking-tighter font-mono drop-shadow-lg">0.00</p>
              <div className="pt-8">
                <button 
                  onClick={() => navigate('/portfolios')} 
                  className="text-[10px] font-black text-rh-green uppercase tracking-[0.2em] hover:text-white border border-rh-green/30 px-6 py-3 rounded-2xl hover:bg-rh-green hover:shadow-[0_0_20px_rgba(0,200,5,0.3)] transition-all duration-500"
                >
                  Manage Portfolio Strategy
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <TradeModal 
        isOpen={isTradeModalOpen}
        onClose={() => setIsTradeModalOpen(false)}
        ticker={ticker || ''}
        price={quote.price}
        onSuccess={fetchAll}
      />
    </div>
  );
};

export default StockDetailPage;
