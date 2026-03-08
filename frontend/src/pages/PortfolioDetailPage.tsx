import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Zap, PieChart, Activity, ChevronRight, Wallet } from 'lucide-react';
import { AreaChart, Area, Tooltip, ResponsiveContainer } from 'recharts';
import TradeModal from '../components/TradeModal';

interface Holding {
  id: number;
  ticker: string;
  quantity: number;
  cost_basis: number;
}

interface Portfolio {
  id: number;
  name: string;
  balance: number;
  holdings: Holding[];
}

const PortfolioDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [selectedHoldingTicker, setSelectedHoldingTicker] = useState<string | null>(null);

  const mockChartData = Array.from({ length: 15 }, (_, i) => ({
    time: i,
    val: 10000 + Math.random() * 500
  }));

  const fetchPortfolio = async () => {
    try {
      const response = await fetch('http://localhost:8000/portfolios', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      const found = data.find((p: Portfolio) => p.id === Number(id));
      setPortfolio(found || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositAmount) return;

    try {
      const response = await fetch(`http://localhost:8000/portfolios/${id}/deposit?amount=${depositAmount}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        setDepositAmount('');
        fetchPortfolio();
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPortfolio();
  }, [id, token]);

  if (loading) return <div className="p-8 text-rh-gray animate-pulse font-bold uppercase tracking-widest text-xs">Accessing Secure Vault...</div>;
  if (!portfolio) return <div className="p-8 text-rh-red font-bold uppercase tracking-widest text-xs">Security Error: Vault terminal unavailable.</div>;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8">
      <button 
        onClick={() => navigate('/portfolios')}
        className="flex items-center space-x-2 text-rh-gray hover:text-white mb-8 transition-colors text-xs font-black uppercase tracking-widest group"
      >
        <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
        <span>Return to Vaults</span>
      </button>

      <header className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-8">
        <div>
          <h2 className="text-5xl font-black text-white tracking-tighter uppercase mb-2">{portfolio.name}</h2>
          <div className="flex items-center space-x-4">
            <span className="px-3 py-1 bg-rh-green/10 text-rh-green rounded-md text-[10px] font-black uppercase tracking-widest border border-rh-green/20">Operational</span>
            <span className="text-rh-gray text-[10px] font-black uppercase tracking-widest">Vault ID: V-{id?.toString().padStart(3, '0')}</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-rh-gray text-[10px] font-black uppercase tracking-widest mb-1">Liquid Balance</p>
          <p className="text-5xl font-black text-white tracking-tighter">${portfolio.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="rh-card p-10 overflow-hidden relative">
            <div className="relative z-10 flex items-center justify-between mb-8">
              <div className="flex items-center space-x-3">
                <Activity className="text-rh-green" size={18} />
                <h3 className="text-lg font-black uppercase tracking-tighter">Performance Matrix</h3>
              </div>
              <div className="flex space-x-2">
                {['1H', '1D', '1W', 'ALL'].map(t => (
                  <button key={t} className="px-3 py-1 text-[8px] font-black bg-rh-black border border-rh-border rounded-md hover:border-rh-green transition-all uppercase tracking-widest text-rh-gray hover:text-white">{t}</button>
                ))}
              </div>
            </div>
            <div className="h-80 -mx-10 -mb-10 opacity-70">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockChartData}>
                  <defs>
                    <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--rh-green)" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="var(--rh-green)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#141414', border: '1px solid #282828', borderRadius: '12px', fontSize: '10px' }}
                    itemStyle={{ color: 'var(--rh-green)', fontWeight: 'bold' }}
                  />
                  <Area type="monotone" dataKey="val" stroke="var(--rh-green)" strokeWidth={3} dot={false} fillOpacity={1} fill="url(#colorVal)" animationDuration={1500} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rh-card p-8">
            <h3 className="text-lg font-black mb-8 flex items-center space-x-2 uppercase tracking-tighter">
              <PieChart className="text-rh-green" size={18} />
              <span>Composition</span>
            </h3>
            {portfolio.holdings.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {portfolio.holdings.map(h => (
                  <div key={h.id} className="bg-rh-black border border-rh-border rounded-2xl p-6 flex justify-between items-center hover:border-rh-green/30 transition-all group cursor-pointer" onClick={() => navigate(`/stocks/${h.ticker}`)}>
                    <div>
                      <h4 className="text-xl font-black group-hover:text-rh-green transition-all tracking-tighter">{h.ticker}</h4>
                      <p className="text-[10px] font-black text-rh-gray uppercase tracking-widest">{h.quantity} Shares</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold font-mono text-white">${(h.quantity * 256).toLocaleString()}</p>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedHoldingTicker(h.ticker);
                          setIsTradeModalOpen(true);
                        }}
                        className="text-[8px] font-black text-rh-green hover:underline uppercase mt-1"
                      >
                        Trade
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 border-2 border-dashed border-rh-border rounded-2xl">
                <p className="text-rh-gray text-xs font-black uppercase tracking-widest">No assets allocated to this vault.</p>
                <button 
                  onClick={() => navigate('/market')}
                  className="mt-6 text-rh-green text-[10px] font-black uppercase tracking-widest hover:underline px-6 py-3 border border-rh-green/20 rounded-xl hover:bg-rh-green/5 transition-all"
                >
                  Acquire Assets
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rh-card p-8 bg-gradient-to-br from-rh-green/20 to-transparent border-rh-green/20">
            <div className="flex items-center space-x-3 mb-8">
              <Zap className="text-rh-green" size={24} />
              <h3 className="text-lg font-black uppercase tracking-tighter">Inject Funds</h3>
            </div>
            <form onSubmit={handleDeposit} className="space-y-4">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-rh-gray font-black text-xs">$</span>
                <input
                  type="number"
                  placeholder="0.00"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full bg-rh-black border border-rh-border rounded-xl pl-8 pr-4 py-4 text-white placeholder-rh-gray/30 focus:outline-none focus:ring-1 focus:ring-rh-green/50 font-mono text-lg font-black"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-rh-green text-rh-black font-black py-4 rounded-xl hover:bg-rh-green/90 transition-all text-xs uppercase tracking-widest shadow-xl shadow-rh-green/20"
              >
                Inject Liquidity
              </button>
            </form>
          </div>

          <div className="rh-card p-8">
            <h3 className="text-lg font-black mb-6 flex items-center space-x-2 uppercase tracking-tighter">
              <Wallet size={18} className="text-rh-gray" />
              <span>Terminal Operations</span>
            </h3>
            <p className="text-[10px] text-rh-gray font-black uppercase tracking-widest mb-6 leading-relaxed">
              Global market acquisition active. All transactions recorded in secure ledger.
            </p>
            <button 
              onClick={() => navigate('/market')}
              className="w-full py-4 bg-rh-white/5 border border-rh-border rounded-xl text-[10px] font-black uppercase tracking-widest text-rh-gray hover:text-white hover:border-rh-green transition-all"
            >
              Execute New Acquisition
            </button>
          </div>
        </div>
      </div>
      
      {selectedHoldingTicker && (
        <TradeModal 
          isOpen={isTradeModalOpen}
          onClose={() => {
            setIsTradeModalOpen(false);
            setSelectedHoldingTicker(null);
          }}
          ticker={selectedHoldingTicker}
          price={256.00} 
          onSuccess={fetchPortfolio}
        />
      )}
    </div>
  );
};

export default PortfolioDetailPage;
