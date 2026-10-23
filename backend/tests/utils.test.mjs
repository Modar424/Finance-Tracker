import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { isId, isEmail, isRealDate, isDateInRange, toAmount, validateTransaction, parsePagination } = require('../src/utils/validators');
const { monthKeys } = require('../src/utils/dates');

const ok = { type: 'expense', category: 'Food', amount: '12.50', transaction_date: '2026-02-28' };
const now = new Date('2026-10-13T12:00:00Z');

describe('validators', () => {
  it('isId accepts digits only', () => {
    expect(isId('12')).toBe(true);
    expect(isId('abc')).toBe(false);
    expect(isId('1; DROP')).toBe(false);
  });

  it('isEmail', () => {
    expect(isEmail('a@b.co')).toBe(true);
    expect(isEmail('nope')).toBe(false);
  });

  it('isRealDate rejects impossible dates', () => {
    expect(isRealDate('2024-02-29')).toBe(true);
    expect(isRealDate('2026-02-30')).toBe(false);
    expect(isRealDate('2026-13-01')).toBe(false);
  });

  it('isDateInRange enforces min and max', () => {
    expect(isDateInRange('2026-10-13', now)).toBe(true);
    expect(isDateInRange('2027-10-13', now)).toBe(true);
    expect(isDateInRange('2027-10-14', now)).toBe(false);
    expect(isDateInRange('2099-01-01', now)).toBe(false);
    expect(isDateInRange('1999-12-31', now)).toBe(false);
  });

  it('toAmount converts strings and numbers explicitly', () => {
    expect(toAmount('45.50')).toBe(45.5);
    expect(toAmount(3000)).toBe(3000);
    expect(typeof toAmount('1')).toBe('number');
  });

  it('validateTransaction', () => {
    expect(validateTransaction(ok, now)).toEqual([]);
    expect(validateTransaction({ ...ok, amount: 12.5 }, now)).toEqual([]);
    expect(validateTransaction({ ...ok, amount: -5 }, now).length).toBeGreaterThan(0);
    expect(validateTransaction({ ...ok, amount: '1.234' }, now).length).toBeGreaterThan(0);
    expect(validateTransaction({ ...ok, category: 'x'.repeat(61) }, now).length).toBeGreaterThan(0);
    expect(validateTransaction({ ...ok, description: 'x'.repeat(256) }, now).length).toBeGreaterThan(0);
    expect(validateTransaction({ ...ok, type: 'other' }, now).length).toBeGreaterThan(0);
    expect(validateTransaction({ ...ok, transaction_date: '2099-01-01' }, now).length).toBeGreaterThan(0);
  });

  it('parsePagination clamps values', () => {
    expect(parsePagination({ page: '3', limit: '10' })).toEqual({ page: 3, limit: 10, offset: 20 });
    expect(parsePagination({ limit: '9999' }).limit).toBe(100);
    expect(parsePagination({ page: '-4' }).page).toBe(1);
  });
});

describe('dates', () => {
  it('monthKeys spans 12 months across a year boundary', () => {
    const keys = monthKeys('2026-02-10');
    expect(keys).toHaveLength(12);
    expect(keys[0]).toBe('2025-03');
    expect(keys[11]).toBe('2026-02');
  });
});
