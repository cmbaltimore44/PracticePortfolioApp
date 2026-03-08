import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const mockData = [
  { time: '10:00', value: 10000 },
  { time: '11:00', value: 10200 },
  { time: '12:00', value: 9900 },
  { time: '13:00', value: 10500 },
  { time: '14:00', value: 10800 },
  { time: '15:00', value: 10750 },
  { time: '16:00', value: 11200 },
];

function App() {
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <header className="mb-8">
        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
          Portfolio Dashboard
        </h1>
        <p className="text-gray-400 mt-2">Paper Trading Investment Simulator</p>
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
          <h2 className="text-xl font-semibold mb-4">Recent Transactions</h2>
          <div className="space-y-4 text-sm mt-4">
            <div className="flex justify-between p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors pointer cursor-pointer border border-gray-600">
              <div className="flex flex-col">
                <span className="font-bold text-white">AAPL</span>
                <span className="text-xs text-gray-400">BUY • 10 shares</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-emerald-400 font-semibold">$1,500.00</span>
                <span className="text-xs text-gray-400">@ 150.00</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
