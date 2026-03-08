import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../context/AuthContext';

const mockData = [
  { time: '10:00', value: 10000 },
  { time: '11:00', value: 10200 },
  { time: '12:00', value: 9900 },
  { time: '13:00', value: 10500 },
  { time: '14:00', value: 10800 },
  { time: '15:00', value: 10750 },
  { time: '16:00', value: 11200 },
];

const Dashboard: React.FC = () => {
  const { logout, username } = useAuth();

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
            Welcome, {username}
          </h1>
          <p className="text-gray-400 mt-2">Personal Portfolio Overview</p>
        </div>
        <button
          onClick={logout}
          className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-lg border border-gray-700 transition-colors"
        >
          Logout
        </button>
      </header>
      
      <main className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 col-span-2">
          <h2 className="text-xl font-semibold mb-4 text-emerald-400">$11,200.00</h2>
          <div className="h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="time" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151' }}
                  itemStyle={{ color: '#34d399' }}
                />
                <Line type="monotone" dataKey="value" stroke="#34d399" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <h2 className="text-xl font-semibold mb-4">Quick Stats</h2>
          <div className="space-y-4">
            <div className="p-4 bg-gray-900 rounded-lg border border-gray-700">
              <span className="block text-gray-500 text-xs uppercase tracking-wider mb-1">Total Portfolios</span>
              <span className="text-2xl font-bold">1</span>
            </div>
            <div className="p-4 bg-gray-900 rounded-lg border border-gray-700">
              <span className="block text-gray-500 text-xs uppercase tracking-wider mb-1">Market Status</span>
              <span className="text-2xl font-bold text-emerald-500">OPEN</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
