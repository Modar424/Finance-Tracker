import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Icon from './Icon';
import ThemeToggle from './ThemeToggle';

const items = [
  { to: '/', label: 'Dashboard', icon: 'dashboard', end: true },
  { to: '/income', label: 'Income', icon: 'income' },
  { to: '/expenses', label: 'Expenses', icon: 'expense' },
];

const sideLink = ({ isActive }) =>
  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${isActive ? 'bg-white text-deep' : 'text-white/75 hover:bg-white/10 hover:text-white'}`;
const tabLink = ({ isActive }) =>
  `flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-semibold ${isActive ? 'text-moss' : 'text-ink/60'}`;

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen lg:flex">
      <aside className="hidden w-64 shrink-0 flex-col bg-deep p-5 lg:flex">
        <div className="mb-8 flex items-center gap-2.5 text-white">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-moss"><Icon name="wallet" /></span>
          <span className="text-xl font-extrabold tracking-tight">Ledgerly</span>
        </div>
        <nav className="flex flex-col gap-1" aria-label="Main">
          {items.map((i) => (
            <NavLink key={i.to} to={i.to} end={i.end} className={sideLink}><Icon name={i.icon} />{i.label}</NavLink>
          ))}
        </nav>
        <div className="mt-auto border-t border-white/15 pt-4">
          <p className="truncate text-sm font-semibold text-white">{user?.name}</p>
          <p className="mb-3 truncate text-xs text-white/60">{user?.email}</p>
          <div className="flex items-center gap-1">
            <button onClick={logout} className="flex flex-1 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-white/75 hover:bg-white/10 hover:text-white">
              <Icon name="logout" className="h-4 w-4" />Log out
            </button>
            <ThemeToggle className="text-white/75 hover:bg-white/10 hover:text-white" />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between bg-deep px-4 py-3 text-white lg:hidden">
          <span className="flex items-center gap-2 text-lg font-extrabold"><Icon name="wallet" className="h-5 w-5" />Ledgerly</span>
          <div className="flex items-center gap-1">
            <ThemeToggle className="hover:bg-white/10" />
            <button onClick={logout} className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold hover:bg-white/10">
              <Icon name="logout" className="h-4 w-4" />Log out
            </button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-24 lg:px-8 lg:py-8 lg:pb-8"><Outlet /></main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-ink/10 bg-panel lg:hidden" aria-label="Main">
        {items.map((i) => (
          <NavLink key={i.to} to={i.to} end={i.end} className={tabLink}><Icon name={i.icon} />{i.label}</NavLink>
        ))}
      </nav>
    </div>
  );
}
