const isId = (v) => /^\d{1,10}$/.test(String(v));

const isEmail = (v) =>
  typeof v === 'string' && v.length <= 190 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

const isRealDate = (s) => {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};

const MIN_DATE = '2000-01-01';

// Allowed: 2000-01-01 up to one year ahead of `now` (UTC).
function isDateInRange(s, now = new Date()) {
  const max = new Date(now.getTime());
  max.setUTCFullYear(max.getUTCFullYear() + 1);
  return s >= MIN_DATE && s <= max.toISOString().slice(0, 10);
}

// Explicit numeric conversion: accepts "12.5" or 12.5, always returns a number with 2 decimals.
const toAmount = (v) => Number(Number(v).toFixed(2));

function validateTransaction(b = {}, now = new Date()) {
  const errors = [];
  if (!['income', 'expense'].includes(b.type)) errors.push('type must be income or expense');
  if (typeof b.category !== 'string' || !b.category.trim()) errors.push('category is required');
  else if (b.category.trim().length > 60) errors.push('category must be 60 characters or fewer');
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(String(b.amount)) || !(Number(b.amount) > 0))
    errors.push('amount must be a positive number with up to 2 decimals');
  if (b.description != null && (typeof b.description !== 'string' || b.description.length > 255))
    errors.push('description must be 255 characters or fewer');
  if (!isRealDate(b.transaction_date)) errors.push('transaction_date must be a valid YYYY-MM-DD date');
  else if (!isDateInRange(b.transaction_date, now)) errors.push('transaction_date must be between 2000-01-01 and one year from today');
  return errors;
}

function parsePagination(q = {}) {
  const page = Math.max(1, parseInt(q.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(q.limit, 10) || 20));
  return { page, limit, offset: (page - 1) * limit };
}

module.exports = { isId, isEmail, isRealDate, isDateInRange, toAmount, validateTransaction, parsePagination };
