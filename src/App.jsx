import { useState } from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Keywords from './pages/Keywords';
import Settings from './pages/Settings';
import ScanControl from './pages/ScanControl';
const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/keywords', label: 'Keywords' },
  { to: '/scan', label: 'Scan Control' },
  { to: '/settings', label: 'Settings' },
];





export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="app-shell flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="app-sidebar w-56 bg-[#0f2044] text-white flex flex-col py-8 px-4 shrink-0">
        <div className="app-sidebar-top">
          <div className="app-brand mb-8">
            <p className="text-xs font-semibold text-yellow-400 uppercase tracking-widest">Cyber Nexus</p>
            <h2 className="text-lg font-bold mt-1 leading-tight">Trademark<br />Monitor</h2>
          </div>
          <button
            type="button"
            className="hamburger-btn"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
        <nav className={`app-nav ${menuOpen ? 'app-nav-open' : ''} flex flex-col gap-1`}>
          {navItems.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setMenuOpen(false)}
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
      <main className="app-main flex-1 overflow-auto">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/keywords" element={<Keywords />} />
          <Route path="/scan" element={<ScanControl />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}
