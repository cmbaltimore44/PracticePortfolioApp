import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface TradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticker: string;
  price: number;
  onSuccess?: () => void;
}

interface Portfolio {
  id: number;
  name: string;
  balance: number;
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
      fetchPortfolios();
    }
  }, [isOpen]);

  const fetchPortfolios = async () => {
    try {
      const response = await fetch('http://localhost:8000/portfolios', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setPortfolios(data);
      if (data.length > 0) setSelectedPortfolioId(data[0].id);
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

  const total = Number(quantity) * price;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-gray-800 w-full max-w-md rounded-3xl border border-gray-700 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-gray-700 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-white uppercase tracking-tight">{type} {ticker}</h3>
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-widest mt-0.5">Market Order</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-700 rounded-xl text-gray-400 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-8">
          <div className="flex bg-gray-900 p-1 rounded-2xl mb-8">
            <button 
              onClick={() => setType('buy')}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${type === 'buy' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Buy
            </button>
            <button 
              onClick={() => setType('sell')}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${type === 'sell' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Sell
            </button>
          </div>

          <form onSubmit={handleTrade} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 px-1">Target Account</label>
              <select 
                value={selectedPortfolioId}
                onChange={(e) => setSelectedPortfolioId(Number(e.target.value))}
                className="w-full bg-gray-900 border border-gray-700 rounded-2xl px-4 py-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none cursor-pointer"
              >
                {portfolios.map(p => (
                  <option key={p.id} value={p.id}>{p.name} (${p.balance.toLocaleString()})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 px-1">Quantity</label>
                <input 
                  type="number"
                  min="0"
                  step="any"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-2xl px-4 py-4 text-white font-mono text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 px-1">Current Price</label>
                <div className="bg-gray-900 border border-gray-700 rounded-2xl px-4 py-4 text-white font-mono text-lg flex items-center">
                  <span className="text-gray-500 mr-1">$</span>
                  {price.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="bg-gray-900/50 p-6 rounded-2xl border border-gray-700/50 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Estimated Value</span>
                <span className="text-white font-bold font-mono">${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Platform Fee</span>
                <span className="text-emerald-500 font-bold font-mono">$0.00</span>
              </div>
              <div className="pt-3 border-t border-gray-700 flex justify-between">
                <span className="text-gray-300 font-bold">Total Estimate</span>
                <span className="text-white font-black font-mono text-lg">${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <button
              disabled={loading || !selectedPortfolioId}
              type="submit"
              className={`w-full py-5 rounded-2xl text-white font-black text-lg transition-all shadow-xl active:scale-95 disabled:opacity-50 ${
                type === 'buy' ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20' : 'bg-red-600 hover:bg-red-500 shadow-red-600/20'
              }`}
            >
              {loading ? 'Processing Transaction...' : `Confirm ${type.toUpperCase()}`}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TradeModal;
