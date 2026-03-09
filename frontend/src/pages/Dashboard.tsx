import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { Activity, Zap, TrendingUp, ShieldCheck, ArrowUpRight, LayoutDashboard, Wallet, ChevronDown, Briefcase } from 'lucide-react';

interface PortfolioSummary {
  id: number;
  name: string;
  balance: number;
}

interface PortfolioData {
  portfolio_id: number;
  name: string;
  balance: number;
  holdings_value: number;
  net_worth: number;
  composition: any[];
  history: any[];
}



const Dashboard: React.FC = () => {
  const { logout, username, token } = useAuth();
  const navigate = useNavigate();
  const [portfolios, setPortfolios] = useState<PortfolioSummary[]>([]);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<number | null>(null);
  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null);
  const [marketStatus, setMarketStatus] = useState<{is_open: boolean, reason: string} | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInitial = async () => {
      try {
        const [portRes, statusRes] = await Promise.all([
          fetch('http://localhost:8000/portfolios', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('http://localhost:8000/market/status')
        ]);
        
        const ports = await portRes.json();
        setPortfolios(ports);
        if (ports.length > 0) setSelectedPortfolioId(ports[0].id);
        setMarketStatus(await statusRes.json());
      } catch (err) {
        console.error('Initial fetch failed:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchInitial();
  }, [token]);

  useEffect(() => {
    if (selectedPortfolioId) {
      const fetchPortData = async () => {
        try {
          const res = await fetch(`http://localhost:8000/market/portfolio-data/${selectedPortfolioId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setPortfolioData(await res.json());
        } catch (err) {
          console.error('Portfolio data fetch failed:', err);
        }
      };
      fetchPortData();
    }
  }, [selectedPortfolioId, token]);



  if (loading) return <div className="p-8 text-rh-gray animate-pulse font-black uppercase tracking-widest text-[10px]">Syncing Terminal Core...</div>;

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center bg-rh-surface/30 p-8 rounded-[40px] border border-rh-border backdrop-blur-md gap-6">
        <div className="flex items-center space-x-5">
          <div className="p-4 bg-rh-green/20 rounded-2xl shadow-[0_0_20px_rgba(0,200,5,0.2)] border border-rh-green/30">
            <LayoutDashboard size={28} className="text-rh-green" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase leading-none">Terminal Prime</h1>
            <div className="flex items-center space-x-2 mt-1">
              <span className="text-rh-gray font-bold text-[10px] tracking-[0.2em] uppercase opacity-60">Operator: {username}</span>
              <div className="w-1 h-1 rounded-full bg-rh-gray opacity-30"></div>
              <span className="text-rh-green font-bold text-[10px] tracking-[0.2em] uppercase">Auth Level 4</span>
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          {portfolios.length > 0 && (
            <div className="relative group w-full md:w-auto">
              <select 
                value={selectedPortfolioId || ''}
                onChange={(e) => setSelectedPortfolioId(Number(e.target.value))}
                className="appearance-none bg-rh-black/50 border border-rh-border rounded-2xl px-6 py-4 text-xs font-black uppercase tracking-widest text-white focus:outline-none focus:border-rh-green transition-all cursor-pointer pr-12 w-full md:w-64"
              >
                {portfolios.map(p => (
                  <option key={p.id} value={p.id}>Vault: {p.name}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-5 top-1/2 -translate-y-1/2 text-rh-gray pointer-events-none" />
            </div>
          )}
          <button
            onClick={logout}
            className="bg-rh-black hover:bg-rh-red hover:text-white text-rh-gray px-6 py-4 rounded-2xl border border-rh-border transition-all text-[10px] font-black uppercase tracking-widest shadow-lg flex-1 md:flex-none"
          >
            Logout session
          </button>
        </div>
      </header>
      
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          {/* Portfolio Alpha Display */}
          <section className="rh-card p-10 overflow-hidden relative border border-rh-border bg-gradient-to-br from-rh-surface to-rh-black shadow-2xl rounded-[48px]">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Activity size={120} />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-8 md:gap-12 relative z-10 mb-12">
              <div className="space-y-2 col-span-1 sm:col-span-12 md:col-span-5">
                <div className="flex items-center space-x-2 text-rh-gray opacity-60">
                  <Wallet size={12} />
                  <p className="text-[10px] font-black uppercase tracking-widest">Aggregate Liquid Value</p>
                </div>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tighter drop-shadow-2xl font-mono whitespace-nowrap">
                  ${portfolioData?.net_worth.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </h2>
              </div>
              <div className="space-y-2 col-span-1 sm:col-span-6 md:col-span-4">
                <p className="text-rh-gray text-[10px] font-black uppercase tracking-widest opacity-60">Available Capital</p>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight font-mono opacity-80 whitespace-nowrap">
                  ${portfolioData?.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </h2>
              </div>
              <div className="space-y-2 col-span-1 sm:col-span-6 md:col-span-3">
                <p className="text-rh-gray text-[10px] font-black uppercase tracking-widest opacity-60">Session Gain</p>
                <div className="flex items-center space-x-2 text-rh-green drop-shadow-[0_0_10px_rgba(0,200,5,0.3)]">
                  <TrendingUp size={24} />
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight font-mono whitespace-nowrap">+12.4%</h2>
                </div>
              </div>
            </div>
            
            <div className="h-72 -mx-10 -mb-10 opacity-80 cursor-crosshair">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={portfolioData?.history || []}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--rh-green)" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="var(--rh-green)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(20px)', border: '1px solid var(--rh-border)', borderRadius: '24px', padding: '16px' }}
                    itemStyle={{ color: 'var(--rh-green)', fontWeight: 'black', fontFamily: 'monospace' }}
                    labelStyle={{ display: 'none' }}
                    cursor={{ stroke: 'var(--rh-green)', strokeWidth: 1, strokeDasharray: '5 5' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="var(--rh-green)" 
                    strokeWidth={6}
                    dot={false}
                    fillOpacity={1}
                    fill="url(#colorValue)"
                    animationDuration={2000}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>


        </div>
        
        <div className="lg:col-span-4 space-y-8">
          <div className="rh-card p-8 bg-gradient-to-br from-rh-surface to-rh-black border-l-4 border-l-blue-500 shadow-2xl rounded-[32px]">
             <div className="flex justify-between items-start mb-8">
                <div>
                  <p className="text-rh-gray text-[10px] font-black uppercase tracking-widest opacity-60">System Context</p>
                  <h3 className={`text-3xl font-black mt-2 tracking-tighter ${marketStatus?.is_open ? 'text-rh-green' : 'text-rh-red'}`}>
                    {marketStatus?.is_open ? 'MARKET ACTIVE' : 'AFTER HOURS'}
                  </h3>
                </div>
                <div className={`p-4 rounded-2xl ${marketStatus?.is_open ? 'bg-rh-green/10 text-rh-green shadow-[0_0_20px_rgba(0,200,5,0.2)]' : 'bg-rh-red/10 text-rh-red shadow-[0_0_20px_rgba(255,80,0,0.2)]'}`}>
                  {marketStatus?.is_open ? <Zap size={28} /> : <ShieldCheck size={28} />}
                </div>
              </div>
              <p className="text-[11px] text-rh-gray font-bold uppercase tracking-[0.2em] bg-white/5 p-4 rounded-2xl border border-rh-white/5 text-center shadow-inner">
                {marketStatus?.reason || 'Syncing clock...'}
              </p>
          </div>

          <div className="rh-card p-10 rounded-[40px]">
            <h3 className="text-xl font-black mb-10 uppercase tracking-tighter flex items-center space-x-4">
              <Activity size={24} className="text-rh-green" />
              <span>Asset Allocation</span>
            </h3>
            <div className="space-y-4">
              {portfolioData?.composition.length === 0 ? (
                <div className="text-center py-12 space-y-4">
                  <div className="w-16 h-16 bg-white/5 rounded-full mx-auto flex items-center justify-center border border-rh-border">
                    <Briefcase size={24} className="text-rh-gray opacity-40" />
                  </div>
                  <p className="text-rh-gray text-[10px] font-black uppercase tracking-widest opacity-60">Liquidity is 100% Cash</p>
                </div>
              ) : (
                portfolioData?.composition.map(asset => (
                  <div 
                    key={asset.ticker}
                    onClick={() => navigate(`/stocks/${asset.ticker}`)}
                    className="p-5 bg-rh-black/50 border border-rh-border rounded-2xl flex justify-between items-center cursor-pointer transition-all duration-300 hover:border-rh-green/30 group"
                  >
                    <div>
                      <span className="text-sm font-black text-white uppercase tracking-tighter group-hover:text-rh-green transition-colors">{asset.ticker}</span>
                      <p className="text-[9px] text-rh-gray font-black uppercase tracking-widest opacity-60">{asset.shares.toFixed(2)} Shares</p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-black text-white font-mono">${asset.value.toLocaleString()}</span>
                      <ArrowUpRight size={14} className="text-rh-gray opacity-0 group-hover:opacity-100 transition-all inline ml-2" />
                    </div>
                  </div>
                ))
              )}
            </div>
            <button
               onClick={() => navigate('/market')}
               className="w-full mt-10 py-5 bg-white/5 border border-rh-border rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-rh-gray hover:text-white hover:bg-white/10 transition-all font-black"
            >
              Explore Alpha
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
