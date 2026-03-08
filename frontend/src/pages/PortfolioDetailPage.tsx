import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, PlusCircle, PieChart, Activity } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import TradeModal from '../components/TradeModal';

interface Portfolio {
  id: number;
  name: string;
  balance: number;
  ticker?: string | null;
  quantity: number;
  cost_basis: number;
}

const PortfolioDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);

  const mockChartData = [
    { time: 'M', val: 10000 }, { time: 'T', val: 10200 }, { time: 'W', val: 10100 },
    { time: 'T', val: 10500 }, { time: 'F', val: 10800 }, { time: 'S', val: 11000 },
  ];

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
  }, [id]);

  if (loading) return <div className="p-8 text-gray-500">Accessing secure nodes...</div>;
  if (!portfolio) return <div className="p-8 text-red-500">Security Error: Portfolio terminal unavailable.</div>;

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
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1">Total Account Value</p>
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
            {portfolio.ticker ? (
              <div className="space-y-6">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">{portfolio.ticker} Holdings</span>
                  <span className="font-bold">{portfolio.quantity} Shares</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Avg Cost</span>
                  <span className="text-white font-mono">${portfolio.cost_basis.toFixed(2)}</span>
                </div>
                <button 
                  onClick={() => setIsTradeModalOpen(true)}
                  className="w-full py-4 bg-gray-900 border border-gray-700 rounded-2xl text-xs font-black uppercase tracking-widest text-gray-400 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all"
                >
                  Quick Trade {portfolio.ticker}
                </button>
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
      
      {portfolio.ticker && (
        <TradeModal 
          isOpen={isTradeModalOpen}
          onClose={() => setIsTradeModalOpen(false)}
          ticker={portfolio.ticker}
          price={256.00} 
          onSuccess={fetchPortfolio}
        />
      )}
    </div>
  );
};

export default PortfolioDetailPage;
