import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mysql from 'mysql2/promise';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const H = { 'X-Requested-With': 'XMLHttpRequest' };
let app, db;

const today = () => new Date().toISOString().slice(0, 10);
const tx = (o = {}) => ({ type: 'expense', category: 'Food', amount: 45.5, description: 'lunch', transaction_date: today(), ...o });

async function signup(email, name = 'Test User') {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/register').set(H).send({ name, email, password: 'password123' });
  expect(res.status).toBe(201);
  return { agent, res };
}

beforeAll(async () => {
  const admin = await mysql.createConnection({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT),
    user: process.env.DB_USER, password: process.env.DB_PASSWORD, multipleStatements: true,
  });
  await admin.query('DROP DATABASE IF EXISTS finance_tracker_test; CREATE DATABASE finance_tracker_test CHARACTER SET utf8mb4; USE finance_tracker_test;');
  const schema = fs.readFileSync(new URL('../schema.sql', import.meta.url), 'utf8')
    .replace(/CREATE DATABASE[^;]*;/i, '').replace(/USE [^;]*;/i, '');
  await admin.query(schema);
  await admin.end();
  app = require('../src/app');
  db = require('../src/config/db');
});

afterAll(async () => { await db.end(); });

describe('request guards', () => {
  it('health check works', async () => {
    expect((await request(app).get('/api/health')).body).toEqual({ status: 'ok' });
  });
  it('rejects state-changing requests without the CSRF header', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'a@b.co', password: 'x' });
    expect(res.status).toBe(403);
  });
  it('rejects non-JSON bodies', async () => {
    const res = await request(app).post('/api/auth/login').set(H).set('Content-Type', 'text/plain').send('hello');
    expect(res.status).toBe(415);
  });
  it('sends a restrictive CSP header', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['content-security-policy']).toContain("default-src 'none'");
  });
});

describe('auth', () => {
  it('validates registration input', async () => {
    const bad = [
      { name: '', email: 'a@b.co', password: 'password123' },
      { name: 'A', email: 'nope', password: 'password123' },
      { name: 'A', email: 'a@b.co', password: 'short' },
    ];
    for (const b of bad) expect((await request(app).post('/api/auth/register').set(H).send(b)).status).toBe(400);
  });

  it('registers, sets httpOnly cookies, and blocks duplicates', async () => {
    const { agent, res } = await signup('a@example.com');
    const cookies = res.headers['set-cookie'].join(';');
    expect(cookies).toMatch(/access_token=.*HttpOnly/);
    expect(cookies).toMatch(/refresh_token=.*HttpOnly/);
    expect(res.body.token).toBeUndefined();
    expect((await agent.get('/api/auth/me')).body.user.email).toBe('a@example.com');
    const dup = await request(app).post('/api/auth/register').set(H).send({ name: 'X', email: 'a@example.com', password: 'password123' });
    expect(dup.status).toBe(409);
  });

  it('requires authentication', async () => {
    expect((await request(app).get('/api/auth/me')).status).toBe(401);
    expect((await request(app).get('/api/transactions')).status).toBe(401);
  });

  it('rotates refresh tokens and revokes everything when a stale token is reused', async () => {
    const { agent, res } = await signup('rotate@example.com');
    const oldCookie = res.headers['set-cookie'].find((c) => c.startsWith('refresh_token='));
    expect((await agent.post('/api/auth/refresh').set(H)).status).toBe(200);
    // Within the grace window: rejected, but the new session survives.
    const early = await request(app).post('/api/auth/refresh').set(H).set('Cookie', oldCookie.split(';')[0]);
    expect(early.status).toBe(401);
    expect((await agent.post('/api/auth/refresh').set(H)).status).toBe(200);
    // Outside the grace window: treated as theft, all sessions revoked.
    await db.query('UPDATE refresh_tokens SET revoked_at = DATE_SUB(UTC_TIMESTAMP(), INTERVAL 5 MINUTE) WHERE revoked_at IS NOT NULL');
    const late = await request(app).post('/api/auth/refresh').set(H).set('Cookie', oldCookie.split(';')[0]);
    expect(late.status).toBe(401);
    expect((await agent.post('/api/auth/refresh').set(H)).status).toBe(401);
  });

  it('logout revokes the refresh token', async () => {
    const { agent, res } = await signup('logout@example.com');
    const rt = res.headers['set-cookie'].find((c) => c.startsWith('refresh_token=')).split(';')[0];
    expect((await agent.post('/api/auth/logout').set(H)).status).toBe(200);
    expect((await agent.get('/api/auth/me')).status).toBe(401);
    expect((await request(app).post('/api/auth/refresh').set(H).set('Cookie', rt)).status).toBe(401);
  });

  it('locks the account after 5 failed logins', async () => {
    await signup('lock@example.com');
    const attempt = (pw) => request(app).post('/api/auth/login').set(H).send({ email: 'lock@example.com', password: pw });
    for (let i = 0; i < 5; i++) expect((await attempt('wrongpass1')).status).toBe(401);
    expect((await attempt('password123')).status).toBe(429);
  });
});

describe('transactions', () => {
  it('supports CRUD, filtering and pagination', async () => {
    const { agent } = await signup('crud@example.com');
    const created = await agent.post('/api/transactions').set(H).send(tx());
    expect(created.status).toBe(201);
    const id = created.body.id;
    await agent.post('/api/transactions').set(H).send(tx({ type: 'income', category: 'Salary', amount: '3000', description: 'pay' }));
    for (let i = 0; i < 4; i++) await agent.post('/api/transactions').set(H).send(tx({ amount: 10 + i }));

    const list = await agent.get('/api/transactions?type=expense&limit=3&page=2');
    expect(list.status).toBe(200);
    expect(list.body.total).toBe(5);
    expect(list.body.pages).toBe(2);
    expect(list.body.items).toHaveLength(2);
    expect(typeof list.body.items[0].amount).toBe('number');

    const search = await agent.get('/api/transactions?search=pay');
    expect(search.body.total).toBe(1);
    expect(search.body.sum).toBe(3000);

    expect((await agent.put(`/api/transactions/${id}`).set(H).send(tx({ amount: '50' }))).status).toBe(200);
    expect((await agent.delete(`/api/transactions/${id}`).set(H)).status).toBe(204);
    expect((await agent.delete(`/api/transactions/${id}`).set(H)).status).toBe(404);
  });

  it('validates input', async () => {
    const { agent } = await signup('valid@example.com');
    const post = (b) => agent.post('/api/transactions').set(H).send(b);
    expect((await post(tx({ amount: -1 }))).status).toBe(400);
    expect((await post(tx({ amount: '1.234' }))).status).toBe(400);
    expect((await post(tx({ transaction_date: '2026-02-30' }))).status).toBe(400);
    expect((await post(tx({ transaction_date: '2099-01-01' }))).status).toBe(400);
    expect((await post(tx({ category: 'x'.repeat(61) }))).status).toBe(400);
    expect((await agent.put('/api/transactions/abc').set(H).send(tx())).status).toBe(400);
    expect((await agent.delete('/api/transactions/abc').set(H)).status).toBe(400);
    expect((await agent.get(`/api/transactions?search=${'x'.repeat(101)}`)).status).toBe(400);
  });

  it("never exposes another user's data", async () => {
    const a = await signup('owner@example.com');
    const b = await signup('intruder@example.com');
    const { body } = await a.agent.post('/api/transactions').set(H).send(tx());
    expect((await b.agent.delete(`/api/transactions/${body.id}`).set(H)).status).toBe(404);
    expect((await b.agent.put(`/api/transactions/${body.id}`).set(H).send(tx())).status).toBe(404);
    expect((await b.agent.get('/api/transactions')).body.total).toBe(0);
  });
});

describe('dashboard', () => {
  it('returns totals, 12 months and category split', async () => {
    const { agent } = await signup('dash@example.com');
    await agent.post('/api/transactions').set(H).send(tx({ type: 'income', category: 'Salary', amount: 1000 }));
    await agent.post('/api/transactions').set(H).send(tx({ amount: 250 }));
    const res = await agent.get(`/api/dashboard/summary?today=${today()}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ income: 1000, expense: 250, balance: 750 });
    expect(res.body.monthly).toHaveLength(12);
    expect(res.body.thisMonth.income).toBe(1000);
    expect(res.body.byCategory[0]).toEqual({ category: 'Food', total: 250 });
  });
});
