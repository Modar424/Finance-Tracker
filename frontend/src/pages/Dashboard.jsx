import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import api, { errMsg } from '../api';
import { useAuth } from '../context/AuthContext';
import { money, localToday, formatDate, monthLabel } from '../utils';
import Icon from '../components/Icon';

const tick = { fill: 'rgb(var(--ink) / 0.65)', fontSize: 12 };
const tooltipStyle = { background: 'rgb(var(--panel))', border: '1px solid rgb(var(--ink) / 0.15)', borderRadius: 12, color: 'rgb(var(--ink))' };
const COLORS = ['#1f7a63', '#d4553a', '#e0a526', '#3b6ea5', '#7a5195', '#5f6b66', '#d17b49', '#2a9d8f', '#9a6b4f'];

function Stat({ label, value, hint, icon, tone }) {
  const tones = { income: 'bg-moss-soft text-moss', expense: 'bg-coral-soft text-coral', balance: 'bg-deep text-white' };
  return (
    <div className="card flex items-start gap-4">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}><Icon name={icon} /></span>
      <div className="min-w-0">
        <p className="text-sm text-ink/70">{label}</p>
        <p className="truncate text-2xl font-extrabold">{money(value)}</p>
        <p className="text-xs text-ink/60">{hint}</p>
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true">
      <div className="h-8 w-56 rounded-lg bg-ink/10" />
      <div className="grid gap-4 sm:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="h-28 rounded-2xl bg-ink/10" />)}</div>
      <div className="h-80 rounded-2xl bg-ink/10" />
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data, error, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard/summary', { params: { today: localToday() } }).then((r) => r.data),
    refetchOnMount: 'always',
  });

  if (isLoading) return <Skeleton />;
  if (error) return <p role="alert" className="rounded-xl bg-coral-soft p-4 text-coral-dark">{errMsg(error)}</p>;

  const empty = data.recent.length === 0;
  const catTotal = data.byCategory.reduce((s, c) => s + c.total, 0);
  const chartData = data.monthly.map((m) => ({ ...m, label: monthLabel(m.month) }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Hi, {user?.name?.split(' ')[0]}</h1>
          <p className="text-sm text-ink/70">Here is where your money stands today.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/income" className="btn"><Icon name="plus" className="h-4 w-4" />Income</Link>
          <Link to="/expenses" className="btn-coral"><Icon name="plus" className="h-4 w-4" />Expense</Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat tone="income" icon="income" label="Total income" value={data.income} hint={`${money(data.thisMonth.income)} this month`} />
        <Stat tone="expense" icon="expense" label="Total expenses" value={data.expense} hint={`${money(data.thisMonth.expense)} this month`} />
        <Stat tone="balance" icon="wallet" label="Balance" value={data.balance} hint={data.balance >= 0 ? 'You are in the green' : 'Spending exceeds income'} />
      </div>

      {empty ? (
        <div className="card py-12 text-center">
          <p className="text-lg font-bold">No transactions yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink/70">Add your first income or expense and your charts will appear here.</p>
          <div className="mt-5 flex justify-center gap-2">
            <Link to="/income" className="btn">Add income</Link>
            <Link to="/expenses" className="btn-coral">Add expense</Link>
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-5">
            <div className="card lg:col-span-3">
              <h2 className="mb-4 font-bold">Income and expenses, last 12 months</h2>
              <div className="h-72">
                <ResponsiveContainer>
                  <BarChart data={chartData} margin={{ left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgb(var(--ink) / 0.12)" />
                    <XAxis dataKey="label" tick={tick} tickLine={false} axisLine={false} />
                    <YAxis tick={tick} tickLine={false} axisLine={false} />
                    <Tooltip formatter={(v) => money(v)} cursor={{ fill: 'rgb(var(--ink) / 0.06)' }} contentStyle={tooltipStyle} itemStyle={{ color: 'rgb(var(--ink))' }} />
                    <Legend wrapperStyle={{ color: 'rgb(var(--ink))' }} />
                    <Bar dataKey="income" name="Income" fill="#1f7a63" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" name="Expenses" fill="#d4553a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card lg:col-span-2">
              <h2 className="mb-1 font-bold">Spending by category</h2>
              <p className="mb-2 text-xs text-ink/60">Last 12 months</p>
              {data.byCategory.length ? (
                <>
                  <div className="relative h-52">
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie data={data.byCategory} dataKey="total" nameKey="category" innerRadius={58} outerRadius={88} paddingAngle={2} stroke="none">
                          {data.byCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v) => money(v)} contentStyle={tooltipStyle} itemStyle={{ color: 'rgb(var(--ink))' }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-xs text-ink/60">Spent</span>
                      <span className="text-base font-extrabold">{money(catTotal)}</span>
                    </div>
                  </div>
                  <ul className="mt-2 space-y-1.5 text-sm">
                    {data.byCategory.slice(0, 5).map((c, i) => (
                      <li key={c.category} className="flex items-center justify-between">
                        <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />{c.category}</span>
                        <span className="font-semibold">{Math.round((c.total / catTotal) * 100)}%</span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : <p className="text-sm text-ink/70">No expenses in the last 12 months.</p>}
            </div>
          </div>

          <div className="card">
            <h2 className="mb-2 font-bold">Recent transactions</h2>
            <ul className="divide-y divide-ink/10">
              {data.recent.map((t) => (
                <li key={t.id} className="flex items-center gap-3 py-3">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${t.type === 'income' ? 'bg-moss-soft text-moss' : 'bg-coral-soft text-coral'}`}>
                    <Icon name={t.type} className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{t.category}</p>
                    <p className="truncate text-xs text-ink/60">{t.description || formatDate(t.transaction_date)}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${t.type === 'income' ? 'text-moss' : 'text-coral'}`}>{t.type === 'income' ? '+' : '-'}{money(t.amount)}</p>
                    <p className="text-xs text-ink/60">{formatDate(t.transaction_date)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
