import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Plus, Wallet, ChevronRight, TrendingUp, Trash2 } from 'lucide-react';

interface Portfolio {
  id: number;
  name: string;
  balance: number;
}

const PortfoliosPage: React.FC = () => {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [newPortfolioName, setNewPortfolioName] = useState('');
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();

  const fetchPortfolios = async () => {
    try {
      const response = await fetch('http://localhost:8000/portfolios', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setPortfolios(data);
    } catch (err) {
      console.error('Failed to fetch portfolios:', err);
    } finally {
      setLoading(false);
    }
  };

  const deletePortfolio = async (id: number) => {
    if (!confirm('Are you sure you want to delete this portfolio?')) return;
    try {
      const response = await fetch(`http://localhost:8000/portfolios/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        fetchPortfolios();
      }
    } catch (err) {
      console.error('Failed to delete portfolio:', err);
    }
  };

  const createPortfolio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPortfolioName) return;

    try {
      const response = await fetch(`http://localhost:8000/portfolios?name=${encodeURIComponent(newPortfolioName)}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        setNewPortfolioName('');
        fetchPortfolios();
      }
    } catch (err) {
      console.error('Failed to create portfolio:', err);
    }
  };

  useEffect(() => {
    fetchPortfolios();
  }, []);

  return (
    <div className="p-8">
      <header className="mb-10">
        <h2 className="text-3xl font-bold text-white">Your Portfolios</h2>
        <p className="text-gray-400 mt-1">Manage multiple investment accounts and fund allocations</p>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Create New Portfolio Card */}
        <div className="bg-gray-800 p-8 rounded-2xl border border-gray-700 h-fit">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Plus className="text-blue-400" size={20} />
            </div>
            <h3 className="text-xl font-bold text-white">New Portfolio</h3>
          </div>
          <form onSubmit={createPortfolio} className="space-y-4">
            <input
              type="text"
              placeholder="Portfolio Name (e.g. Retirement)"
              value={newPortfolioName}
              onChange={(e) => setNewPortfolioName(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-600/20"
            >
              Initialize Strategy
            </button>
          </form>
        </div>

        {/* Portfolio List */}
        <div className="xl:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          {loading ? (
            <div className="col-span-full pt-10 text-center text-gray-500">Scanning accounts...</div>
          ) : portfolios.length === 0 ? (
            <div className="col-span-full pt-10 text-center text-gray-500">No active portfolios found. Create one to begin.</div>
          ) : (
            portfolios.map((p) => (
              <div key={p.id} className="relative group">
                <Link
                  to={`/portfolios/${p.id}`}
                  className="block bg-gray-800 p-6 rounded-2xl border border-gray-700 hover:border-emerald-500/50 transition-all"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="p-3 bg-emerald-500/10 rounded-xl group-hover:bg-emerald-500/20 transition-colors">
                      <Wallet className="text-emerald-400" size={24} />
                    </div>
                    <ChevronRight className="text-gray-600 group-hover:text-emerald-400 transform group-hover:translate-x-1 transition-all" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">{p.name}</h3>
                    <div className="flex items-baseline space-x-2">
                      <span className="text-2xl font-bold text-white">${p.balance.toLocaleString()}</span>
                      <span className="text-xs font-bold text-emerald-500 uppercase tracking-tighter">Liquid Capital</span>
                    </div>
                  </div>
                  <div className="mt-6 pt-6 border-t border-gray-700 flex justify-between items-center">
                    <span className="text-xs text-gray-500 font-bold uppercase">View Performance</span>
                    <div className="flex items-center text-emerald-400 text-xs font-bold">
                      <TrendingUp size={14} className="mr-1" />
                      +0.00%
                    </div>
                  </div>
                </Link>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    deletePortfolio(p.id);
                  }}
                  className="absolute bottom-6 right-6 p-2 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                  title="Delete Portfolio"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default PortfoliosPage;
