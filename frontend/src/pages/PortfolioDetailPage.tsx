import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, PlusCircle, PieChart, Activity } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
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
  const [error, setError] = useState<string | null>(null);
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [selectedHoldingTicker, setSelectedHoldingTicker] = useState<string | null>(null);

  const mockChartData = [
    { time: 'M', val: 10000 }, { time: 'T', val: 10200 }, { time: 'W', val: 10100 },
    { time: 'T', val: 10500 }, { time: 'F', val: 10800 }, { time: 'S', val: 11000 },
  ];

  const fetchPortfolio = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:8000/portfolios', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (Array.isArray(data)) {
        const found = data.find((p: Portfolio) => p.id === Number(id));
        setPortfolio(found || null);
        if (!found) setError('Portfolio terminal unavailable.');
      } else {
        console.error('Invalid response format:', data);
        setError('Vault connection interrupted.');
      }
    } catch (err) {
      console.error(err);
      setError('Internal terminal error.');
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

  if (loading) return <div className="p-8 text-gray-500 font-medium">Accessing secure nodes...</div>;
  
  if (error || !portfolio) {
    return (
      <div className="p-8">
        <button 
          onClick={() => navigate('/portfolios')}
          className="flex items-center space-x-2 text-gray-400 hover:text-white mb-8 transition-colors text-sm font-semibold"
        >
          <ArrowLeft size={16} />
          <span>Back to Vault</span>
        </button>
        <div className="p-12 bg-red-500/10 border border-red-500/20 rounded-3xl text-center">
          <p className="text-red-400 font-bold mb-4">{error || 'Security Error: Portfolio terminal unavailable.'}</p>
          <button 
            onClick={fetchPortfolio}
            className="px-6 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors text-xs font-bold uppercase"
          >
            Reconnect Terminal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <button 
        onClick={() => navigate('/portfolios')}
        className="flex items-center space-x-2 text-gray-400 hover:text-white mb-8 transition-colors text-sm font-semibold group"
      >
        <ArrowLeft size={16} className="transform group-hover:-translate-x-1 transition-all" />
        <span>Return to Vault</span>
      </button>

      <header className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
        <div>
          <h2 className="text-4xl font-bold text-white mb-2">{portfolio.name}</h2>
          <div className="flex items-center space-x-4">
            <span className="px-3 py-1 bg-blue-500/10 text-blue-400 rounded-full text-xs font-bold uppercase tracking-wider">Active Strategy</span>
            <span className="text-gray-500 text-sm font-mono">ID: {portfolio.id.toString().padStart(6, '0')}</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1">Liquid Balance</p>
          <p className="text-4xl font-black text-emerald-400">${portfolio.balance.toLocaleString()}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-gray-800 p-8 rounded-3xl border border-gray-700">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center space-x-3">
              <Activity className="text-blue-400" size={20} />
              <h3 className="text-lg font-bold">Growth Projection</h3>
            </div>
            <div className="flex space-x-2">
              {['1D', '1W', '1M', 'ALL'].map(t => (
                <button key={t} className="px-3 py-1 text-[10px] font-bold bg-gray-900 border border-gray-700 rounded-lg hover:border-blue-500 transition-all">{t}</button>
              ))}
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis dataKey="time" stroke="#4b5563" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111827', borderRadius: '12px', border: '1px solid #374151', color: '#fff' }}
                />
                <Line type="monotone" dataKey="val" stroke="#10b981" strokeWidth={3} dot={false} animationDuration={2000} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-8 rounded-3xl shadow-xl shadow-blue-900/20">
            <div className="flex items-center space-x-3 mb-6">
              <PlusCircle className="text-white" size={24} />
              <h3 className="text-xl font-bold text-white">Inject Funds</h3>
            </div>
            <form onSubmit={handleDeposit} className="space-y-4">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                <input
                  type="number"
                  placeholder="0.00"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full bg-blue-950/30 border border-blue-400/30 rounded-2xl pl-8 pr-4 py-4 text-white placeholder-blue-300/50 focus:outline-none focus:ring-2 focus:ring-white transition-all font-mono text-lg"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-white text-blue-600 font-black py-4 rounded-2xl hover:bg-blue-50 transition-all transform active:scale-95 shadow-xl"
              >
                Execute Deposit
              </button>
            </form>
          </div>

          <div className="bg-gray-800 p-8 rounded-3xl border border-gray-700">
            <div className="flex items-center space-x-3 mb-6">
              <PieChart className="text-emerald-400" size={24} />
              <h3 className="text-lg font-bold">Asset Allocation</h3>
            </div>
            {portfolio.holdings.length > 0 ? (
              <div className="space-y-6">
                {portfolio.holdings.map(h => (
                  <div key={h.id} className="p-4 bg-gray-900/50 rounded-2xl border border-gray-700/50 group">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-blue-400 font-black tracking-tighter text-lg">{h.ticker}</span>
                      <span className="text-white font-bold">{h.quantity} Shares</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] mb-4">
                      <span className="text-gray-500 uppercase font-black">Avg Cost: ${h.cost_basis.toFixed(2)}</span>
                    </div>
                    <button 
                      onClick={() => {
                        setSelectedHoldingTicker(h.ticker);
                        setIsTradeModalOpen(true);
                      }}
                      className="w-full py-2 bg-gray-800 border border-gray-700 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all opacity-60 group-hover:opacity-100"
                    >
                      Trade {h.ticker}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-gray-500 text-sm font-medium">No assets held yet.</p>
                <button 
                  onClick={() => navigate('/market')}
                  className="mt-4 text-blue-400 text-xs font-black uppercase tracking-widest hover:text-blue-300 transition-colors"
                >
                  Browse Markets
                </button>
              </div>
            )}
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
