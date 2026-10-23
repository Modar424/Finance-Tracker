const router = require('express').Router();
const db = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');
const { isId, isRealDate, toAmount, validateTransaction, parsePagination } = require('../utils/validators');

router.use(authMiddleware);

const bad = (res, message) => res.status(400).json({ message });

router.get('/', async (req, res, next) => {
  try {
    const { type, category, from, to, search } = req.query;
    if (type && !['income', 'expense'].includes(type)) return bad(res, 'Invalid type');
    if (category && (typeof category !== 'string' || category.length > 60)) return bad(res, 'Invalid category');
    if (from && !isRealDate(from)) return bad(res, 'Invalid from date');
    if (to && !isRealDate(to)) return bad(res, 'Invalid to date');
    if (search && (typeof search !== 'string' || search.length > 100)) return bad(res, 'Search text must be 100 characters or fewer');

    const where = ['user_id = ?'];
    const params = [req.user.id];
    if (type) { where.push('type = ?'); params.push(type); }
    if (category) { where.push('category = ?'); params.push(category); }
    if (from) { where.push('transaction_date >= ?'); params.push(from); }
    if (to) { where.push('transaction_date <= ?'); params.push(to); }
    if (search) {
      const like = `%${search.replace(/[\\%_]/g, '\\$&')}%`;
      where.push('(description LIKE ? OR category LIKE ?)');
      params.push(like, like);
    }
    const clause = where.join(' AND ');
    const { page, limit, offset } = parsePagination(req.query);

    const [[agg]] = await db.query(
      `SELECT COUNT(*) AS total, COALESCE(SUM(amount),0) AS sum FROM transactions WHERE ${clause}`, params);
    const [rows] = await db.query(
      `SELECT id, type, category, amount, description, transaction_date
       FROM transactions WHERE ${clause}
       ORDER BY transaction_date DESC, id DESC LIMIT ? OFFSET ?`, [...params, limit, offset]);

    res.json({
      items: rows.map((r) => ({ ...r, amount: Number(r.amount) })),
      total: Number(agg.total), sum: Number(agg.sum),
      page, limit, pages: Math.max(1, Math.ceil(Number(agg.total) / limit)),
    });
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const errors = validateTransaction(req.body);
    if (errors.length) return bad(res, errors.join(', '));
    const { type, category, amount, description, transaction_date } = req.body;
    const [r] = await db.query(
      'INSERT INTO transactions (user_id,type,category,amount,description,transaction_date) VALUES (?,?,?,?,?,?)',
      [req.user.id, type, category.trim(), toAmount(amount), description?.trim() || null, transaction_date]);
    res.status(201).json({ id: r.insertId });
  } catch (e) { next(e); }
});

router.put('/:id', async (req, res, next) => {
  try {
    if (!isId(req.params.id)) return bad(res, 'Invalid id');
    const errors = validateTransaction(req.body);
    if (errors.length) return bad(res, errors.join(', '));
    const { type, category, amount, description, transaction_date } = req.body;
    const [r] = await db.query(
      'UPDATE transactions SET type=?, category=?, amount=?, description=?, transaction_date=? WHERE id=? AND user_id=?',
      [type, category.trim(), toAmount(amount), description?.trim() || null, transaction_date, req.params.id, req.user.id]);
    if (!r.affectedRows) return res.status(404).json({ message: 'Transaction not found' });
    res.json({ id: Number(req.params.id) });
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    if (!isId(req.params.id)) return bad(res, 'Invalid id');
    const [r] = await db.query('DELETE FROM transactions WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
    if (!r.affectedRows) return res.status(404).json({ message: 'Transaction not found' });
    res.status(204).end();
  } catch (e) { next(e); }
});

module.exports = router;
