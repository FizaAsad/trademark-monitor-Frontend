import { Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Keywords from './pages/Keywords';
import Settings from './pages/Settings';
const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/keywords', label: 'Keywords' },
  { to: '/settings', label: 'Scan Control' }
];





export default function App() {
  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-56 bg-[#0f2044] text-white flex flex-col py-8 px-4 shrink-0">
        <div className="mb-8">
          <p className="text-xs font-semibold text-yellow-400 uppercase tracking-widest">Cyber Nexus</p>
          <h2 className="text-lg font-bold mt-1 leading-tight">Trademark<br />Monitor</h2>
        </div>
        <nav className="flex flex-col gap-1">
          {navItems.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `px-3 py-2 rounded text-sm font-medium transition-colors ${
                  isActive ? 'bg-yellow-400 text-[#0f2044]' : 'text-gray-300 hover:bg-white/10'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/keywords" element={<Keywords />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}
