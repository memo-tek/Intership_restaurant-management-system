const router = require('express').Router();
const Order = require('../models/Order');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect, adminOnly);

// GET /api/reports/daily-sales?date=2026-12-01   (defaults to today, UTC)
router.get('/daily-sales', async (req, res, next) => {
  try {
    const day = req.query.date || new Date().toISOString().slice(0, 10);
    const from = new Date(`${day}T00:00:00.000Z`);
    if (Number.isNaN(from.getTime())) return res.status(400).json({ message: 'Invalid date' });
    const to = new Date(from.getTime() + 86400000);

    const orders = await Order.find({ createdAt: { $gte: from, $lt: to } });
    const valid = orders.filter((o) => o.status !== 'cancelled');

    const sold = new Map();
    for (const o of valid) {
      for (const l of o.items) {
        const row = sold.get(l.name) || { name: l.name, quantity: 0, revenue: 0 };
        row.quantity += l.quantity;
        row.revenue += l.quantity * l.price;
        sold.set(l.name, row);
      }
    }

    const totalRevenue = valid.reduce((s, o) => s + o.total, 0);
    res.json({
      date: day,
      orders: valid.length,
      cancelledOrders: orders.length - valid.length,
      totalRevenue,
      averageOrderValue: valid.length ? Number((totalRevenue / valid.length).toFixed(2)) : 0,
      topItems: [...sold.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 5),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
