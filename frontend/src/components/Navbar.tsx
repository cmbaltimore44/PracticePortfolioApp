import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, TrendingUp, Briefcase, LogOut } from 'lucide-react';

const Navbar: React.FC = () => {
  const { logout, username } = useAuth();
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Markets', path: '/market', icon: TrendingUp },
    { name: 'Portfolios', path: '/portfolios', icon: Briefcase },
  ];

  return (
    <nav className="bg-gray-800 border-b border-gray-700 h-screen w-64 fixed left-0 top-0 flex flex-col p-6">
      <div className="mb-10">
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
          InvestSim
        </h1>
        <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest font-semibold">Pro Trader</p>
      </div>

      <div className="flex-1 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                isActive 
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20' 
                  : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'
              }`}
            >
              <Icon size={20} />
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </div>

      <div className="mt-auto pt-6 border-t border-gray-700">
        <div className="flex items-center space-x-3 mb-6 px-4">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-emerald-500 flex items-center justify-center text-xs font-bold">
            {username?.charAt(0).toUpperCase()}
          </div>
          <span className="text-sm font-medium text-gray-300 truncate">{username}</span>
        </div>
        <button
          onClick={logout}
          className="flex items-center space-x-3 w-full px-4 py-3 text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
        >
          <LogOut size={20} />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
