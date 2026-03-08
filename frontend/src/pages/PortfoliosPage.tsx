import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Plus, Trash2, Wallet, ChevronRight } from 'lucide-react';

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

const PortfoliosPage: React.FC = () => {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const { token } = useAuth();
  const navigate = useNavigate();

  const fetchPortfolios = async () => {
    try {
      const response = await fetch('http://localhost:8000/portfolios', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setPortfolios(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const createPortfolio = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`http://localhost:8000/portfolios?name=${encodeURIComponent(newName)}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        setNewName('');
        setShowCreate(false);
        fetchPortfolios();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deletePortfolio = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Terminate this portfolio terminal? All data will be purged.')) return;
    try {
      const response = await fetch(`http://localhost:8000/portfolios/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) fetchPortfolios();
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPortfolios();
  }, []);

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8">
      <header className="flex justify-between items-center mb-12">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tighter uppercase">Vaults</h2>
          <p className="text-rh-gray mt-1 font-bold text-xs tracking-widest uppercase opacity-60">Capital Allocation Centers</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center space-x-2 bg-rh-green text-rh-black px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-rh-green/90 transition-all shadow-xl shadow-rh-green/20"
        >
          <Plus size={16} />
          <span>New Vault</span>
        </button>
      </header>

      {showCreate && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="rh-card p-10 max-w-md w-full border-rh-green/30 shadow-2xl">
            <h3 className="text-2xl font-black mb-6 tracking-tighter uppercase text-white">Initialize Vault</h3>
            <form onSubmit={createPortfolio} className="space-y-6">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-rh-gray mb-2">Vault Designation</label>
                <input
                  autoFocus
                  type="text"
                  placeholder="e.g., Aggressive Growth"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-rh-black border border-rh-border rounded-xl px-4 py-4 text-white focus:outline-none focus:ring-1 focus:ring-rh-green/50 font-bold"
                />
              </div>
              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 py-4 bg-rh-surface text-white font-bold rounded-xl border border-rh-border hover:bg-white/5 transition-all text-xs uppercase tracking-widest"
                >
                  ABORT
                </button>
                <button
                  type="submit"
                  className="flex-1 py-4 bg-rh-green text-rh-black font-black rounded-xl hover:bg-rh-green/90 transition-all text-xs uppercase tracking-widest shadow-lg shadow-rh-green/10"
                >
                  INITIALIZE
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-rh-gray animate-pulse font-bold tracking-widest text-sm">ACCESSING SECURE STORAGE...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {portfolios.map((p) => (
            <div
              key={p.id}
              onClick={() => navigate(`/portfolios/${p.id}`)}
              className="rh-card p-8 group cursor-pointer relative overflow-hidden transition-all hover:border-rh-green/30"
            >
              <div className="flex justify-between items-start mb-8">
                <div className="bg-rh-green/10 p-3 rounded-2xl text-rh-green group-hover:scale-110 transition-transform">
                  <Wallet size={24} />
                </div>
                <button
                  onClick={(e) => deletePortfolio(p.id, e)}
                  className="p-2 text-rh-gray hover:text-rh-red transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={18} />
                </button>
              </div>
              
              <div className="space-y-1 mb-8">
                <h3 className="text-xl font-black text-white group-hover:text-rh-green transition-colors uppercase tracking-tighter">
                  {p.name}
                </h3>
                <p className="text-[10px] text-rh-gray font-black uppercase tracking-widest">Designation: V-{p.id.toString().padStart(3, '0')}</p>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex flex-wrap gap-2">
                  {p.holdings.slice(0, 3).map(h => (
                    <span key={h.id} className="px-2 py-1 bg-rh-white/5 rounded-md text-[9px] font-black text-rh-green border border-rh-green/20">
                      {h.ticker}
                    </span>
                  ))}
                  {p.holdings.length > 3 && (
                    <span className="text-[9px] text-rh-gray font-bold self-center">+{p.holdings.length - 3}</span>
                  )}
                </div>
              </div>

              <div className="flex items-end justify-between pt-6 border-t border-rh-border">
                <div>
                  <p className="text-[10px] text-rh-gray font-black uppercase tracking-widest mb-1">Liquid Capital</p>
                  <span className="text-2xl font-bold font-mono text-white tracking-tighter">
                    ${p.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <ChevronRight size={20} className="text-rh-gray group-hover:text-white group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PortfoliosPage;
