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
      <aside className="app-sidebar w-56 bg-black text-white flex flex-col py-8 px-4 shrink-0">
        <div className="app-sidebar-top">
          <div className="app-brand mb-8">
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ width: 36, height: 36, background: "#E3000F", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: 16, color: "#fff", flexShrink: 0 }}>G</div>
              <h2 style={{ fontSize: 16, fontWeight: "bold", color: "#fff", margin: 0, lineHeight: 1.2 }}>GoBeagleGo</h2>
            </div>
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
                  isActive ? 'bg-[#E3000F] text-white' : 'text-gray-300 hover:bg-white/10'
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
