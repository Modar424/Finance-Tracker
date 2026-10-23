const router = require('express').Router();
const db = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');
const { isRealDate } = require('../utils/validators');
const { monthKeys } = require('../utils/dates');

router.use(authMiddleware);

// `today` (YYYY-MM-DD) is the user's local date, so "last 12 months" follows their timezone, not the server's.
router.get('/summary', async (req, res, next) => {
  try {
    const uid = req.user.id;
    const today = isRealDate(req.query.today) ? req.query.today : new Date().toISOString().slice(0, 10);
    const keys = monthKeys(today);
    const start = `${keys[0]}-01`;

    const [[totals]] = await db.query(
      `SELECT COALESCE(SUM(CASE WHEN type='income' THEN amount END),0) AS income,
              COALESCE(SUM(CASE WHEN type='expense' THEN amount END),0) AS expense
       FROM transactions WHERE user_id=?`, [uid]);

    const [monthlyRows] = await db.query(
      `SELECT DATE_FORMAT(transaction_date,'%Y-%m') AS month,
              SUM(CASE WHEN type='income' THEN amount ELSE 0 END) AS income,
              SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) AS expense
       FROM transactions
       WHERE user_id=? AND transaction_date >= ?
       GROUP BY month`, [uid, start]);
    const byMonth = Object.fromEntries(monthlyRows.map((m) => [m.month, m]));
    const monthly = keys.map((k) => ({
      month: k,
      income: Number(byMonth[k]?.income || 0),
      expense: Number(byMonth[k]?.expense || 0),
    }));

    const [byCategory] = await db.query(
      `SELECT category, SUM(amount) AS total FROM transactions
       WHERE user_id=? AND type='expense' AND transaction_date >= ?
       GROUP BY category ORDER BY total DESC`, [uid, start]);

    const [recent] = await db.query(
      `SELECT id, type, category, amount, description, transaction_date FROM transactions
       WHERE user_id=? ORDER BY transaction_date DESC, id DESC LIMIT 6`, [uid]);

    const income = Number(totals.income), expense = Number(totals.expense);
    res.json({
      income, expense, balance: income - expense,
      thisMonth: monthly[monthly.length - 1],
      monthly,
      byCategory: byCategory.map((c) => ({ category: c.category, total: Number(c.total) })),
      recent: recent.map((r) => ({ ...r, amount: Number(r.amount) })),
    });
  } catch (e) { next(e); }
});

module.exports = router;
