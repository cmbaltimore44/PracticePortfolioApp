import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, Wallet, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface TradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticker: string;
  price: number;
  onSuccess?: () => void;
}

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

const TradeModal: React.FC<TradeModalProps> = ({ isOpen, onClose, ticker, price, onSuccess }) => {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<number | ''>('');
  const [quantity, setQuantity] = useState('1');
  const [type, setType] = useState<'buy' | 'sell'>('buy');
  const [loading, setLoading] = useState(false);
  const { token } = useAuth();

  useEffect(() => {
    if (isOpen) {
      setQuantity('1'); 
      fetchPortfolios();
    }
  }, [isOpen]);

  useEffect(() => {
    setQuantity('1');
  }, [type, ticker]);

  const fetchPortfolios = async () => {
    try {
      const response = await fetch('http://localhost:8000/portfolios', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data: Portfolio[] = await response.json();
      if (Array.isArray(data)) {
        setPortfolios(data);
        const holdingIndex = data.findIndex(p => p.holdings.some(h => h.ticker === ticker && h.quantity > 0));
        if (type === 'sell' && holdingIndex !== -1) {
          setSelectedPortfolioId(data[holdingIndex].id);
        } else if (data.length > 0 && !selectedPortfolioId) {
          setSelectedPortfolioId(data[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPortfolioId || !quantity) return;
    
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/trade/${type}?portfolio_id=${selectedPortfolioId}&ticker=${ticker}&quantity=${quantity}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        onSuccess?.();
        onClose();
      } else {
        const err = await response.json();
        alert(err.detail || 'Trade failed');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const selectedPortfolio = portfolios.find(p => p.id === selectedPortfolioId);
  const total = Number(quantity) * price;
  const newBalance = selectedPortfolio ? (type === 'buy' ? selectedPortfolio.balance - total : selectedPortfolio.balance + total) : 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="rh-card w-full max-w-lg border-rh-border shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-8 border-b border-rh-border flex justify-between items-center bg-rh-surface/80 backdrop-blur-sm">
          <div>
            <h3 className="text-3xl font-black text-white uppercase tracking-tighter">{type} {ticker}</h3>
            <div className="flex items-center space-x-2 mt-1">
              <div className="w-1.5 h-1.5 rounded-full bg-rh-green"></div>
              <p className="text-[10px] text-rh-gray font-black uppercase tracking-widest opacity-60">Market Execution Platform</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-white/5 rounded-2xl text-rh-gray transition-colors border border-transparent hover:border-rh-border">
            <X size={20} />
          </button>
        </div>

        <div className="p-10 space-y-10">
          <div className="flex bg-rh-black p-1.5 rounded-2xl border border-rh-border relative">
            <button 
              onClick={() => setType('buy')}
              className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 relative z-10 ${type === 'buy' ? 'buy-active' : 'text-rh-gray hover:text-white'}`}
            >
              Acquire
            </button>
            <button 
              onClick={() => setType('sell')}
              className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 relative z-10 ${type === 'sell' ? 'sell-active' : 'text-rh-gray hover:text-white'}`}
            >
              Liquidate
            </button>
          </div>

          <form onSubmit={handleTrade} className="space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="block text-[10px] font-black uppercase tracking-widest text-rh-gray px-1">Source Vault</label>
                <div className="relative">
                  <select 
                    value={selectedPortfolioId}
                    onChange={(e) => setSelectedPortfolioId(Number(e.target.value))}
                    className="w-full bg-rh-black border border-rh-border rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-rh-white/20 transition-all appearance-none cursor-pointer font-bold pr-10"
                  >
                    {portfolios.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <Wallet className="absolute right-4 top-1/2 -translate-y-1/2 text-rh-gray opacity-40 pointer-events-none" size={16} />
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-[10px] font-black uppercase tracking-widest text-rh-gray px-1">Quantity</label>
                <input 
                  type="number"
                  min="0"
                  step="any"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full bg-rh-black border border-rh-border rounded-2xl px-5 py-4 text-white font-mono text-xl font-black focus:outline-none focus:ring-1 focus:ring-rh-white/20 transition-all"
                />
              </div>
            </div>

            <div className="bg-rh-black p-8 rounded-3xl border border-rh-border space-y-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <ShieldCheck size={80} />
              </div>
              
              <div className="flex justify-between items-center group-hover:translate-x-1 transition-transform">
                <span className="text-[10px] font-black text-rh-gray uppercase tracking-widest">Total Estimated Value</span>
                <span className={`text-2xl font-black font-mono tracking-tighter ${type === 'buy' ? 'text-white' : 'text-rh-green'}`}>
                  ${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="pt-6 border-t border-rh-border space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-rh-gray uppercase tracking-widest">Portfolio Balance Impact</span>
                  <div className="flex items-center space-x-3">
                    <span className="text-xs font-bold text-rh-gray transition-opacity group-hover:opacity-100 opacity-60">
                      ${selectedPortfolio?.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                    <ArrowRight size={12} className="text-rh-gray" />
                    <span className={`text-sm font-black font-mono ${newBalance < 0 ? 'text-rh-red' : 'text-white'}`}>
                      ${newBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <button
              disabled={loading || !selectedPortfolioId || newBalance < 0 && type === 'buy'}
              type="submit"
              className={`w-full py-6 rounded-2xl text-rh-black font-black text-[11px] uppercase tracking-[0.3em] transition-all shadow-2xl active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed ${
                type === 'buy' ? 'bg-rh-green hover:bg-rh-green/90 shadow-rh-green/20' : 'bg-rh-red text-white hover:bg-rh-red/90 shadow-rh-red/20'
              }`}
            >
              {loading ? 'Transmitting...' : newBalance < 0 && type === 'buy' ? 'Insufficient Liquidity' : `Execute ${type} Order`}
            </button>
            <p className="text-center text-[9px] text-rh-gray font-black uppercase tracking-widest opacity-40">
              Institutional Grade Settlement Logic
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TradeModal;
