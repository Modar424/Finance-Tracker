import { useEffect, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api, { errMsg } from '../api';
import { CATEGORIES, dateBounds, formatDate, localToday, money } from '../utils';
import useDebounced from '../hooks/useDebounced';
import { useToast } from '../context/ToastContext';
import Icon from '../components/Icon';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';

const EMPTY_FILTERS = { search: '', from: '', to: '', category: '' };

function TransactionForm({ type, item, onClose }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [form, setForm] = useState({
    category: item?.category || CATEGORIES[type][0],
    amount: item ? String(item.amount) : '',
    description: item?.description || '',
    transaction_date: item?.transaction_date || localToday(),
  });
  const [error, setError] = useState('');

  const save = useMutation({
    mutationFn: (body) => (item ? api.put(`/transactions/${item.id}`, body) : api.post('/transactions', body)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(item ? 'Changes saved' : `${type === 'income' ? 'Income' : 'Expense'} added`);
      onClose();
    },
    onError: (e) => setError(errMsg(e)),
  });

  const submit = (e) => {
    e.preventDefault();
    setError('');
    if (!/^\d{1,10}(\.\d{1,2})?$/.test(form.amount) || Number(form.amount) <= 0)
      return setError('Enter an amount greater than 0 with up to 2 decimals.');
    const { min, max } = dateBounds();
    if (form.transaction_date < min || form.transaction_date > max)
      return setError('Pick a date between 2000 and one year from today.');
    save.mutate({ ...form, type, amount: Number(form.amount) });
  };

  const categories = CATEGORIES[type].includes(form.category) ? CATEGORIES[type] : [form.category, ...CATEGORIES[type]];

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <p role="alert" className="rounded-xl bg-coral-soft p-3 text-sm font-medium text-coral-dark">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="amount">Amount</label>
          <input id="amount" className="input" inputMode="decimal" placeholder="0.00" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="date">Date</label>
          <input id="date" className="input" type="date" required min={dateBounds().min} max={dateBounds().max} value={form.transaction_date} onChange={(e) => setForm({ ...form, transaction_date: e.target.value })} />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="category">Category</label>
        <select id="category" className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="note">Note (optional)</label>
        <input id="note" className="input" maxLength={255} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className={type === 'income' ? 'btn' : 'btn-coral'} disabled={save.isPending}>
          {save.isPending ? 'Saving…' : item ? 'Save changes' : `Add ${type}`}
        </button>
      </div>
    </form>
  );
}

export default function Transactions({ type }) {
  const qc = useQueryClient();
  const toast = useToast();
  const isIncome = type === 'income';
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [modal, setModal] = useState(null); // { item? }
  const [toDelete, setToDelete] = useState(null);
  const search = useDebounced(filters.search);

  useEffect(() => { setFilters(EMPTY_FILTERS); setPage(1); setModal(null); }, [type]);
  useEffect(() => { setPage(1); }, [search, filters.from, filters.to, filters.category]);

  const params = {
    type, page, limit: 15,
    search: search || undefined, from: filters.from || undefined,
    to: filters.to || undefined, category: filters.category || undefined,
  };

  const { data, error, isLoading, isFetching } = useQuery({
    queryKey: ['transactions', params],
    queryFn: () => api.get('/transactions', { params }).then((r) => r.data),
    placeholderData: keepPreviousData,
  });

  const remove = useMutation({
    mutationFn: (id) => api.delete(`/transactions/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Deleted');
      setToDelete(null);
    },
    onError: (e) => { toast.error(errMsg(e)); setToDelete(null); },
  });

  const filtered = Object.values({ ...filters, search }).some(Boolean);
  const tone = isIncome ? 'text-moss' : 'text-coral';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">{isIncome ? 'Income' : 'Expenses'}</h1>
          <p className="text-sm text-ink/70">
            {data ? <>{data.total} {data.total === 1 ? 'record' : 'records'}, total <strong className={tone}>{money(data.sum)}</strong>{filtered && ' (filtered)'}</> : 'Loading…'}
          </p>
        </div>
        <button className={isIncome ? 'btn' : 'btn-coral'} onClick={() => setModal({})}>
          <Icon name="plus" className="h-4 w-4" />Add {type}
        </button>
      </div>

      <div className="card grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative lg:col-span-1">
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
          <input className="input pl-9" placeholder="Search notes" maxLength={100} aria-label="Search notes" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
        </div>
        <select className="input" aria-label="Category" value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}>
          <option value="">All categories</option>
          {CATEGORIES[type].map((c) => <option key={c}>{c}</option>)}
        </select>
        <input className="input" type="date" aria-label="From date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
        <input className="input" type="date" aria-label="To date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
      </div>

      <div className={`card transition-opacity ${isFetching && !isLoading ? 'opacity-70' : ''}`}>
        {error ? (
          <p role="alert" className="text-coral-dark">{errMsg(error)}</p>
        ) : isLoading ? (
          <div className="space-y-3 animate-pulse" aria-busy="true">{[0, 1, 2, 3].map((i) => <div key={i} className="h-14 rounded-xl bg-ink/10" />)}</div>
        ) : data.items.length === 0 ? (
          <div className="py-10 text-center">
            <p className="font-bold">{filtered ? 'No matches' : `No ${type} yet`}</p>
            <p className="mt-1 text-sm text-ink/70">{filtered ? 'Try different filters.' : `Add your first ${type} record to get started.`}</p>
            {filtered
              ? <button className="btn-ghost mt-4" onClick={() => setFilters(EMPTY_FILTERS)}>Clear filters</button>
              : <button className={`${isIncome ? 'btn' : 'btn-coral'} mt-4`} onClick={() => setModal({})}>Add {type}</button>}
          </div>
        ) : (
          <ul className="divide-y divide-ink/10">
            {data.items.map((t) => (
              <li key={t.id} className="flex items-center gap-3 py-3">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold ${isIncome ? 'bg-moss-soft text-moss' : 'bg-coral-soft text-coral'}`}>
                  {t.category.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{t.category}</p>
                  <p className="truncate text-xs text-ink/60">{formatDate(t.transaction_date)}{t.description ? ` · ${t.description}` : ''}</p>
                </div>
                <p className={`text-sm font-bold ${tone}`}>{isIncome ? '+' : '-'}{money(t.amount)}</p>
                <div className="flex">
                  <button className="rounded-lg p-2 text-ink/60 hover:bg-ink/5 hover:text-ink" aria-label={`Edit ${t.category}`} onClick={() => setModal({ item: t })}><Icon name="edit" className="h-4 w-4" /></button>
                  <button className="rounded-lg p-2 text-ink/60 hover:bg-coral-soft hover:text-coral" aria-label={`Delete ${t.category}`} onClick={() => setToDelete(t)}><Icon name="trash" className="h-4 w-4" /></button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {data && <Pagination page={data.page} pages={data.pages} onChange={setPage} />}
      </div>

      {modal && (
        <Modal title={modal.item ? `Edit ${type}` : `Add ${type}`} onClose={() => setModal(null)}>
          <TransactionForm type={type} item={modal.item} onClose={() => setModal(null)} />
        </Modal>
      )}

      {toDelete && (
        <Modal title="Delete this record?" onClose={() => setToDelete(null)}>
          <p className="text-sm text-ink/80">
            {toDelete.category} for {money(toDelete.amount)} on {formatDate(toDelete.transaction_date)} will be removed permanently.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button className="btn-ghost" onClick={() => setToDelete(null)}>Cancel</button>
            <button className="btn-coral" disabled={remove.isPending} onClick={() => remove.mutate(toDelete.id)}>{remove.isPending ? 'Deleting…' : 'Delete'}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
