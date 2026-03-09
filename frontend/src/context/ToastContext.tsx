import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-8 right-8 z-[100] space-y-4 max-w-md w-full">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center justify-between p-6 rounded-[24px] border backdrop-blur-xl shadow-2xl animate-in slide-in-from-right-10 fade-in duration-300 transition-all ${
              toast.type === 'success' ? 'bg-rh-green/10 border-rh-green/30 text-rh-green shadow-[0_0_30px_rgba(0,200,5,0.1)]' :
              toast.type === 'error' ? 'bg-rh-red/10 border-rh-red/30 text-rh-red shadow-[0_0_30px_rgba(255,80,0,0.1)]' :
              toast.type === 'warning' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500 shadow-[0_0_30px_rgba(255,180,0,0.1)]' :
              'bg-blue-500/10 border-blue-500/30 text-blue-500 shadow-[0_0_30px_rgba(0,100,255,0.1)]'
            }`}
          >
            <div className="flex items-center space-x-4">
              <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                {toast.type === 'success' && <CheckCircle size={20} />}
                {toast.type === 'error' && <AlertCircle size={20} />}
                {toast.type === 'warning' && <AlertCircle size={20} />}
                {toast.type === 'info' && <Info size={20} />}
              </div>
              <p className="text-[11px] font-black uppercase tracking-widest leading-relaxed">
                {toast.message}
              </p>
            </div>
            <button onClick={() => removeToast(toast.id)} className="ml-6 p-2 hover:bg-white/10 rounded-lg transition-colors opacity-40 hover:opacity-100">
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};
