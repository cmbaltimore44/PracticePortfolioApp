import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { Activity, Zap, TrendingUp, ShieldCheck, ArrowUpRight, Newspaper, LayoutDashboard } from 'lucide-react';

interface NewsItem {
  title: string;
  published: string;
  tag: string;
  link: string;
}

interface Portfolio {
  id: number;
  balance: number;
}

const mockData = Array.from({ length: 24 }, (_, i) => ({
  time: `${i}:00`,
  value: 10000 + Math.sin(i / 3) * 500 + i * 50,
}));

const Dashboard: React.FC = () => {
  const { logout, username, token } = useAuth();
  const navigate = useNavigate();
  const [marketStatus, setMarketStatus] = useState<{is_open: boolean, reason: string} | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statusRes, newsRes, portRes] = await Promise.all([
          fetch('http://localhost:8000/market/status'),
          fetch('http://localhost:8000/market/news'),
          fetch('http://localhost:8000/portfolios', {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);
        
        setMarketStatus(await statusRes.json());
        setNews(await newsRes.json());
        setPortfolios(await portRes.json());
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      }
    };
    fetchData();
  }, [token]);

  const totalBuyingPower = portfolios.reduce((acc, p) => acc + p.balance, 0);
  const netWorth = totalBuyingPower + 5780.31; 

  const getTagColor = (tag: string) => {
    const t = tag.toUpperCase();
    if (t.includes('TECH')) return 'text-blue-400 border-blue-400/30 bg-blue-400/10';
    if (t.includes('FED') || t.includes('MACRO')) return 'text-purple-400 border-purple-400/30 bg-purple-400/10';
    if (t.includes('ENERGY')) return 'text-orange-400 border-orange-400/30 bg-orange-400/10';
    return 'text-rh-green border-rh-green/30 bg-rh-green/10';
  };

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto pb-20">
      <header className="flex justify-between items-center bg-rh-surface/30 p-6 rounded-3xl border border-rh-border backdrop-blur-sm">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-rh-green/20 rounded-2xl shadow-[0_0_15px_rgba(0,200,5,0.2)]">
            <LayoutDashboard size={24} className="text-rh-green" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tighter uppercase leading-tight">Terminal Prime</h1>
            <p className="text-rh-gray font-bold text-[10px] tracking-[0.2em] uppercase opacity-60">Operator: {username}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="bg-rh-black hover:bg-rh-red hover:text-white text-rh-gray px-6 py-3 rounded-2xl border border-rh-border transition-all text-[10px] font-black uppercase tracking-widest shadow-lg"
        >
          Logout Session
        </button>
      </header>
      
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Section */}
        <div className="lg:col-span-8 space-y-8">
          {/* Detailed Portfolio Overview */}
          <section className="rh-card p-10 overflow-hidden relative border-t-4 border-t-rh-green bg-gradient-to-br from-rh-surface to-rh-black shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10 mb-8">
              <div className="space-y-1">
                <p className="text-rh-gray text-[10px] font-black uppercase tracking-widest opacity-60">Total Value</p>
                <h2 className="text-4xl font-black text-white tracking-tighter drop-shadow-lg">
                  ${netWorth.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </h2>
              </div>
              <div className="space-y-1">
                <p className="text-rh-gray text-[10px] font-black uppercase tracking-widest opacity-60">Cash Liquidity</p>
                <h2 className="text-2xl font-black text-white tracking-tight drop-shadow-md">
                  ${totalBuyingPower.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </h2>
              </div>
              <div className="space-y-1">
                <p className="text-rh-gray text-[10px] font-black uppercase tracking-widest opacity-60">Day Performance</p>
                <div className="flex items-center space-x-2 text-rh-green drop-shadow-[0_0_5px_rgba(0,200,5,0.3)]">
                  <TrendingUp size={20} />
                  <h2 className="text-2xl font-black tracking-tight">+$1,240.12 (12%)</h2>
                </div>
              </div>
            </div>
            
            <div className="h-64 -mx-10 -mb-10 opacity-70">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--rh-green)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--rh-green)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--rh-black)', border: '1px solid var(--rh-border)', borderRadius: '16px', fontSize: '10px' }}
                    itemStyle={{ color: 'var(--rh-green)', fontWeight: 'black' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="var(--rh-green)" 
                    strokeWidth={5}
                    dot={false}
                    fillOpacity={1}
                    fill="url(#colorValue)"
                    animationDuration={2500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Moved News Section - Horizontal Layout */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black uppercase tracking-tighter flex items-center space-x-3">
                <Newspaper size={20} className="text-rh-green" />
                <span>Global Sentiment Feed</span>
              </h3>
              <div className="flex space-x-1">
                <div className="w-1.5 h-1.5 rounded-full bg-rh-green animate-pulse"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-rh-green opacity-40"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-rh-green opacity-20"></div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {news.slice(0, 4).map((item, i) => (
                <a 
                  key={i} 
                  href={item.link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="rh-card p-6 hover:border-rh-green/50 hover:bg-white/5 transition-all group overflow-hidden"
                >
                  <div className="flex items-center space-x-3 mb-3">
                    <span className={`text-[8px] font-black px-2 py-0.5 border rounded uppercase tracking-widest ${getTagColor(item.tag)}`}>
                      {item.tag}
                    </span>
                    <span className="text-[10px] text-rh-gray font-black uppercase tracking-widest opacity-40">{item.published}</span>
                  </div>
                  <h4 className="text-sm font-bold text-white group-hover:text-rh-green transition-colors leading-tight line-clamp-2">
                    {item.title}
                  </h4>
                </a>
              ))}
            </div>
          </section>
        </div>
        
        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-8">
          <div className="rh-card p-8 bg-gradient-to-br from-rh-surface to-rh-black border-l-4 border-l-blue-500 shadow-xl">
             <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-rh-gray text-[10px] font-black uppercase tracking-widest opacity-60">System Context</p>
                  <h3 className={`text-2xl font-black mt-1 ${marketStatus?.is_open ? 'text-rh-green' : 'text-rh-red'}`}>
                    {marketStatus?.is_open ? 'MARKET ACTIVE' : 'AFTER HOURS'}
                  </h3>
                </div>
                <div className={`p-3 rounded-2xl ${marketStatus?.is_open ? 'bg-rh-green/10 text-rh-green shadow-[0_0_15px_rgba(0,200,5,0.2)]' : 'bg-rh-red/10 text-rh-red shadow-[0_0_15px_rgba(255,80,0,0.2)]'}`}>
                  {marketStatus?.is_open ? <Zap size={24} /> : <ShieldCheck size={24} />}
                </div>
              </div>
              <p className="text-[10px] text-rh-gray font-bold uppercase tracking-[0.2em] bg-white/5 p-3 rounded-xl border border-rh-white/5 text-center">
                {marketStatus?.reason || 'Syncing clock...'}
              </p>
          </div>

          <div className="rh-card p-8">
            <h3 className="text-lg font-black mb-6 uppercase tracking-tighter flex items-center space-x-3">
              <Activity size={20} className="text-rh-green" />
              <span>Smart Lists</span>
            </h3>
            <div className="space-y-3">
              {[
                { label: 'Technology', param: 'technology', count: 8, glow: 'hover:border-blue-500/50 hover:shadow-[0_0_15px_rgba(0,136,255,0.1)]' },
                { label: 'Finance', param: 'finance', count: 4, glow: 'hover:border-yellow-500/50 hover:shadow-[0_0_15px_rgba(255,215,0,0.1)]' },
                { label: 'Consumer', param: 'consumer', count: 4, glow: 'hover:border-pink-500/50 hover:shadow-[0_0_15px_rgba(255,105,180,0.1)]' },
                { label: 'Healthcare', param: 'healthcare', count: 2, glow: 'hover:border-emerald-500/50 hover:shadow-[0_0_15px_rgba(0,255,204,0.1)]' },
                { label: 'Energy', param: 'energy', count: 2, glow: 'hover:border-orange-500/50 hover:shadow-[0_0_15px_rgba(255,165,0,0.1)]' },
              ].map(list => (
                <div 
                  key={list.label} 
                  onClick={() => navigate(`/market?category=${list.param}`)}
                  className={`p-4 bg-rh-black/50 border border-rh-border rounded-2xl flex justify-between items-center cursor-pointer transition-all duration-300 group ${list.glow}`}
                >
                  <span className="text-xs font-black text-rh-gray group-hover:text-white uppercase tracking-widest">{list.label}</span>
                  <div className="flex items-center space-x-3 text-rh-gray group-hover:text-rh-green transition-all">
                    <span className="text-[10px] font-black px-2 py-1 bg-white/5 rounded-md">{list.count} Symbols</span>
                    <ArrowUpRight size={14} className="opacity-0 group-hover:opacity-100 transition-all translate-y-1 group-hover:translate-y-0" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
