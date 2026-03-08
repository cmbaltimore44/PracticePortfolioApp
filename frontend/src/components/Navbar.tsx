import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, TrendingUp, Briefcase, LogOut, Terminal } from 'lucide-react';

const Navbar: React.FC = () => {
  const { logout, username } = useAuth();
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Markets', path: '/market', icon: TrendingUp },
    { name: 'Portfolios', path: '/portfolios', icon: Briefcase },
  ];

  return (
    <nav className="bg-rh-black border-r border-rh-border h-screen w-64 fixed left-0 top-0 flex flex-col p-8 z-50">
      <div className="mb-12 flex items-center space-x-3">
        <div className="p-2 bg-rh-green rounded-xl">
          <Terminal size={24} className="text-rh-black" />
        </div>
        <div>
          <h1 className="text-xl font-black text-white tracking-tighter uppercase leading-none">
            InvestSim
          </h1>
          <p className="text-[10px] text-rh-gray mt-1 uppercase tracking-[0.2em] font-black opacity-60">Pro Terminal</p>
        </div>
      </div>

      <div className="flex-1 space-y-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || (item.path === '/' && location.pathname === '/dashboard');
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center space-x-4 px-5 py-4 rounded-xl transition-all duration-200 group ${
                isActive 
                  ? 'bg-rh-green/10 text-rh-green border border-rh-green/20' 
                  : 'text-rh-gray hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon size={18} className={isActive ? 'text-rh-green' : 'text-rh-gray group-hover:text-white'} />
              <span className={`text-xs font-black uppercase tracking-widest ${isActive ? 'text-rh-green' : ''}`}>{item.name}</span>
            </Link>
          );
        })}
      </div>

      <div className="mt-auto pt-8 border-t border-rh-border">
        <div className="flex items-center space-x-4 mb-8 px-2">
          <div className="w-10 h-10 rounded-xl bg-rh-white/5 border border-rh-border flex items-center justify-center text-xs font-black text-rh-green uppercase">
            {username?.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-xs font-black text-white uppercase tracking-tighter">{username}</p>
            <p className="text-[8px] text-rh-gray font-black uppercase tracking-widest opacity-60">Operator 01</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center space-x-4 w-full px-5 py-4 text-rh-red hover:bg-rh-red/5 hover:border-rh-red/20 border border-transparent rounded-xl transition-all text-xs font-black uppercase tracking-widest"
        >
          <LogOut size={18} />
          <span>Exit System</span>
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
