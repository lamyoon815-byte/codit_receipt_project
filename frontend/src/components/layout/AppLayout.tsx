import { NavLink, Outlet } from 'react-router-dom';

const links = [
  { to: '/dashboard', label: 'HOME' },
  { to: '/receipts/new', label: '영수증 등록' },
  { to: '/expenses', label: '소비 내역' },
  { to: '/analytics', label: '소비 분석' },
];

export function AppLayout() {
  return (
    <div className="app-shell">
      <header className="site-header">
        <NavLink to="/" className="brand" aria-label="Spendly 시작 화면">Spendly</NavLink>
        <nav className="main-nav" aria-label="주요 메뉴">
          {links.map(({ to, label }) => (
            <NavLink key={to} to={to} className={({ isActive }) => isActive ? 'active' : ''}>
              {label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main><Outlet /></main>
    </div>
  );
}
