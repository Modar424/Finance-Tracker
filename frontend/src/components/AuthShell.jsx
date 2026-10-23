import Icon from './Icon';
import ThemeToggle from './ThemeToggle';

const bars = [38, 64, 46, 82, 58, 96, 70];

export default function AuthShell({ title, subtitle, children }) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-deep p-12 text-white lg:flex">
        <span className="flex items-center gap-2.5 text-xl font-extrabold">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-moss"><Icon name="wallet" /></span>Ledgerly
        </span>
        <div>
          <div className="mb-8 flex h-40 items-end gap-3" aria-hidden="true">
            {bars.map((h, i) => (
              <div key={i} className={`w-8 rounded-t-lg ${i % 2 ? 'bg-coral' : 'bg-moss'}`} style={{ height: `${h}%` }} />
            ))}
          </div>
          <p className="max-w-sm text-3xl font-extrabold leading-tight">Know where every dollar goes.</p>
          <p className="mt-3 max-w-sm text-white/70">Record income and expenses, then see your balance, monthly trend and spending by category.</p>
        </div>
        <span className="text-sm text-white/50">Your data stays in your own database.</span>
      </div>
      <div className="relative flex min-h-screen items-center justify-center px-4 py-10">
        <ThemeToggle className="absolute right-4 top-4 hover:bg-ink/10" />
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-extrabold">{title}</h1>
          <p className="mb-6 mt-1 text-sm text-ink/70">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}
