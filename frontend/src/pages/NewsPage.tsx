import React, { useState, useEffect } from 'react';
import { Newspaper, ArrowUpRight, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NewsItem {
  title: string;
  published: string;
  tag: string;
  link: string;
}

const NewsPage: React.FC = () => {
  const {} = useAuth();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const res = await fetch('http://localhost:8000/market/news');
        const data = await res.json();
        setNews(data);
      } catch (err) {
        console.error('News fetch failed:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchNews();
  }, []);

  const getTagColor = (tag: string) => {
    const t = tag.toUpperCase();
    if (t.includes('TECH')) return 'text-blue-400 border-blue-400/30 bg-blue-400/10';
    if (t.includes('FED') || t.includes('MACRO')) return 'text-purple-400 border-purple-400/30 bg-purple-400/10';
    if (t.includes('ENERGY')) return 'text-orange-400 border-orange-400/30 bg-orange-400/10';
    return 'text-rh-green border-rh-green/30 bg-rh-green/10';
  };

  if (loading) {
    return <div className="p-8 text-rh-gray animate-pulse font-black uppercase tracking-widest text-[10px]">Synchronizing News Feed...</div>;
  }

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto pb-20">
      <header className="bg-rh-surface/30 p-8 rounded-[40px] border border-rh-border backdrop-blur-md">
        <div className="flex items-center space-x-6">
          <div className="p-5 bg-rh-green/20 rounded-2xl shadow-[0_0_20px_rgba(0,200,5,0.2)] border border-rh-green/30">
            <Newspaper size={32} className="text-rh-green" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase leading-none">Intelligence Hub</h1>
            <p className="text-rh-gray font-bold text-[10px] tracking-[0.2em] uppercase mt-2 opacity-60">Global Market Data Stream</p>
          </div>
        </div>
      </header>

      <main className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {news.map((item, i) => (
          <a 
            key={i} 
            href={item.link} 
            target="_blank" 
            rel="noopener noreferrer"
            className="rh-card p-10 hover:bg-white/5 transition-all duration-300 group overflow-hidden border border-rh-border hover:border-rh-green/40 shadow-2xl relative flex flex-col justify-between"
          >
            <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-all">
              <ArrowUpRight size={24} className="text-rh-green" />
            </div>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-black px-4 py-1.5 border rounded-full uppercase tracking-widest ${getTagColor(item.tag)}`}>
                  {item.tag}
                </span>
                <div className="flex items-center space-x-2 text-rh-gray opacity-40">
                  <Clock size={12} />
                  <span className="text-[10px] font-black uppercase tracking-widest">{item.published}</span>
                </div>
              </div>
              
              <h2 className="text-xl font-black text-white group-hover:text-rh-green transition-colors leading-tight uppercase tracking-tighter">
                {item.title}
              </h2>
            </div>

            <div className="mt-8 pt-6 border-t border-rh-border/30 flex items-center justify-between text-rh-gray group-hover:text-white transition-colors">
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Read Dispatch</span>
              <div className="w-8 h-[1px] bg-rh-border group-hover:bg-rh-green transition-colors"></div>
            </div>
          </a>
        ))}
      </main>
    </div>
  );
}

export default NewsPage;
