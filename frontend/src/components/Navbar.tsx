import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, TrendingUp, Briefcase, LogOut, Terminal, ChevronRight, Newspaper } from 'lucide-react';

interface NewsItem {
  title: string;
  link: string;
  tag: string;
}

const Navbar: React.FC = () => {
  const { logout, username } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [news, setNews] = useState<NewsItem[]>([]);

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Markets', path: '/market', icon: TrendingUp },
    { name: 'Portfolios', path: '/portfolios', icon: Briefcase },
    { name: 'Intelligence', path: '/news', icon: Newspaper },
  ];

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const res = await fetch('http://localhost:8000/market/news');
        const data = await res.json();
        setNews(data.slice(0, 3));
      } catch (err) {
        console.error('Sidebar news fetch failed:', err);
      }
    };
    fetchNews();
  }, []);

  return (
    <nav className="bg-rh-black border-r border-rh-border h-screen w-72 fixed left-0 top-0 flex flex-col z-50 overflow-hidden shadow-2xl">
      <div className="p-8 border-b border-rh-border/50">
        <div className="flex items-center space-x-4 mb-2">
          <div className="p-3 bg-rh-green rounded-2xl shadow-[0_0_15px_rgba(0,200,5,0.4)]">
            <Terminal size={24} className="text-rh-black" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tighter uppercase leading-none">
              InvestSim
            </h1>
            <p className="text-[10px] text-rh-gray mt-1 uppercase tracking-[0.3em] font-black opacity-30">Prime Node 01</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-8 space-y-10 custom-scrollbar">
        <div className="space-y-2">
           <p className="text-[9px] font-black text-rh-gray uppercase tracking-[0.3em] mb-4 opacity-40 px-2 text-center">Navigation Map</p>
           {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path === '/' && location.pathname === '/dashboard');
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center space-x-4 px-6 py-4 rounded-2xl transition-all duration-300 group relative overflow-hidden ${
                  isActive 
                    ? 'bg-rh-green/10 text-rh-green border border-rh-green/20' 
                    : 'text-rh-gray hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-rh-green shadow-[0_0_10px_rgba(0,200,5,0.5)]"></div>}
                <Icon size={18} className={isActive ? 'text-rh-green' : 'text-rh-gray group-hover:text-white transition-colors'} />
                <span className={`text-[11px] font-black uppercase tracking-[0.2em] ${isActive ? 'text-rh-green' : ''}`}>{item.name}</span>
              </Link>
            );
          })}
        </div>

        {/* Sidebar News Integration */}
        <div className="space-y-6 pt-10 border-t border-rh-border/30">
          <div className="flex items-center justify-between px-2">
            <p className="text-[9px] font-black text-rh-gray uppercase tracking-[0.3em] opacity-40">Intelligence</p>
            <div className="w-1.5 h-1.5 rounded-full bg-rh-green animate-pulse"></div>
          </div>
          <div className="space-y-4">
            {news.map((item, i) => (
              <a 
                key={i} 
                href={item.link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="block p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-all border border-rh-border/30 hover:border-rh-green/30 group"
              >
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-[8px] font-black px-1.5 py-0.5 bg-rh-green/10 text-rh-green border border-rh-green/20 rounded uppercase tracking-widest">{item.tag}</span>
                  <div className="flex-1 h-[1px] bg-white/5"></div>
                </div>
                <h4 className="text-[10px] font-bold text-white leading-tight line-clamp-2 uppercase tracking-tight opacity-70 group-hover:opacity-100 group-hover:text-rh-green transition-all">
                  {item.title}
                </h4>
              </a>
            ))}
            <button 
              onClick={() => navigate('/news')} 
              className="w-full flex items-center justify-center space-x-2 text-[8px] font-black text-rh-gray uppercase tracking-[0.2em] py-3 hover:text-white transition-colors group"
            >
              <span>Access Intelligence Hub</span>
              <ChevronRight size={10} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 border-t border-rh-border/50 bg-black/40 backdrop-blur-md">
        <div className="flex items-center space-x-4 mb-6 px-2">
          <div className="w-12 h-12 rounded-2xl bg-rh-green/10 border border-rh-green/20 flex items-center justify-center text-sm font-black text-rh-green uppercase shadow-inner">
            {username?.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-[11px] font-black text-white uppercase tracking-tighter truncate w-32">{username}</p>
            <p className="text-[8px] text-rh-gray font-black uppercase tracking-[0.2em] opacity-40">Operator 01</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center justify-center space-x-3 w-full px-6 py-4 bg-rh-red/10 text-rh-red hover:bg-rh-red hover:text-white border border-rh-red/20 rounded-2xl transition-all duration-300 text-[9px] font-black uppercase tracking-[0.3em] active:scale-95 shadow-lg group"
        >
          <LogOut size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span>Exit System</span>
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
