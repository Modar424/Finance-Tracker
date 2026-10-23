const currency = import.meta.env.VITE_CURRENCY || 'USD';
const fmt = new Intl.NumberFormat(undefined, { style: 'currency', currency });

export const money = (n) => fmt.format(n || 0);

export const localToday = () =>
  new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);

export const dateBounds = () => {
  const max = new Date(`${localToday()}T00:00:00`);
  max.setFullYear(max.getFullYear() + 1);
  return { min: '2000-01-01', max: new Date(max.getTime() - max.getTimezoneOffset() * 60000).toISOString().slice(0, 10) };
};

export const formatDate = (s) =>
  new Date(`${s}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

export const monthLabel = (ym) =>
  new Date(`${ym}-01T00:00:00`).toLocaleDateString(undefined, { month: 'short' });

export const CATEGORIES = {
  income: ['Salary', 'Freelance', 'Business', 'Investments', 'Gift', 'Other'],
  expense: ['Food', 'Rent', 'Transport', 'Utilities', 'Health', 'Entertainment', 'Shopping', 'Education', 'Other'],
};
