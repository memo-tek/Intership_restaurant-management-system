const router = require('express').Router();
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const InventoryItem = require('../models/InventoryItem');
const { protect, adminOnly } = require('../middleware/auth');

const restoreStock = (used) =>
  Promise.all(
    used.map((u) => InventoryItem.updateOne({ _id: u.ingredient }, { $inc: { quantity: u.quantity } }))
  );

// POST /api/orders
// body: { items: [{ menuItem, quantity }], tableNumber?, notes? }
router.post('/', protect, async (req, res, next) => {
  try {
    const { items, tableNumber, notes } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'items must be a non-empty array' });
    }

    // Merge duplicate lines and validate quantities
    const qtyById = new Map();
    for (const line of items) {
      const qty = Number(line.quantity);
      if (!line.menuItem || !Number.isInteger(qty) || qty < 1) {
        return res.status(400).json({ message: 'Each item needs menuItem and a whole quantity >= 1' });
      }
      const key = String(line.menuItem);
      qtyById.set(key, (qtyById.get(key) || 0) + qty);
    }

    const menuItems = await MenuItem.find({ _id: { $in: [...qtyById.keys()] } });
    if (menuItems.length !== qtyById.size) {
      return res.status(404).json({ message: 'One or more menu items not found' });
    }
    const unavailable = menuItems.filter((m) => !m.available);
    if (unavailable.length) {
      return res.status(400).json({
        message: `Not available right now: ${unavailable.map((m) => m.name).join(', ')}`,
      });
    }

    // Total ingredients needed for the whole order
    const needs = new Map();
    for (const m of menuItems) {
      const qty = qtyById.get(String(m._id));
      for (const r of m.recipe) {
        const key = String(r.ingredient);
        needs.set(key, (needs.get(key) || 0) + r.quantity * qty);
      }
    }

    // Inventory auto-update: deduct each ingredient only if enough is in stock
    const deducted = [];
    const lowStockAlerts = [];
    for (const [ingredient, quantity] of needs) {
      const updated = await InventoryItem.findOneAndUpdate(
        { _id: ingredient, quantity: { $gte: quantity } },
        { $inc: { quantity: -quantity } },
        { new: true }
      );
      if (!updated) {
        await restoreStock(deducted);
        const inv = await InventoryItem.findById(ingredient);
        return res.status(409).json({
          message: `Not enough ${inv ? inv.name : 'stock'} to prepare this order`,
        });
      }
      deducted.push({ ingredient, quantity });
      if (updated.quantity <= updated.lowStockThreshold) {
        lowStockAlerts.push({ name: updated.name, quantity: updated.quantity, unit: updated.unit });
      }
    }

    const lines = menuItems.map((m) => ({
      menuItem: m._id,
      name: m.name,
      price: m.price,
      quantity: qtyById.get(String(m._id)),
    }));
    const total = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);

    let order;
    try {
      order = await Order.create({
        user: req.user._id,
        tableNumber,
        items: lines,
        total,
        notes,
        inventoryUsed: deducted,
      });
    } catch (err) {
      await restoreStock(deducted);
      throw err;
    }

    if (lowStockAlerts.length) console.warn('LOW STOCK:', lowStockAlerts);
    res.status(201).json({ order, lowStockAlerts: req.user.role === 'admin' ? lowStockAlerts : undefined });
  } catch (err) {
    next(err);
  }
});

// GET /api/orders/me
router.get('/me', protect, async (req, res, next) => {
  try {
    res.json(await Order.find({ user: req.user._id }).sort({ createdAt: -1 }));
  } catch (err) {
    next(err);
  }
});

// GET /api/orders?status=pending  (admin)
router.get('/', protect, adminOnly, async (req, res, next) => {
  try {
    const filter = req.query.status ? { status: req.query.status } : {};
    res.json(await Order.find(filter).populate('user', 'name email').sort({ createdAt: -1 }));
  } catch (err) {
    next(err);
  }
});

// GET /api/orders/:id (owner or admin)
router.get('/:id', protect, async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order || (req.user.role !== 'admin' && String(order.user) !== String(req.user._id))) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.json(order);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/orders/:id/status  { "status": "preparing" }  (admin)
// Flow: pending -> preparing -> served -> completed
const NEXT = { preparing: 'pending', served: 'preparing', completed: 'served' };
router.patch('/:id/status', protect, adminOnly, async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!NEXT[status]) {
      return res.status(400).json({ message: 'status must be preparing, served or completed' });
    }
    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, status: NEXT[status] },
      { status },
      { new: true }
    );
    if (!order) {
      return res.status(409).json({ message: `Order must be "${NEXT[status]}" to move to "${status}"` });
    }
    res.json(order);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/orders/:id/cancel -> customers: pending only; admin: pending or preparing
router.patch('/:id/cancel', protect, async (req, res, next) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const filter = {
      _id: req.params.id,
      status: { $in: isAdmin ? ['pending', 'preparing'] : ['pending'] },
    };
    if (!isAdmin) filter.user = req.user._id;

    const order = await Order.findOneAndUpdate(filter, { status: 'cancelled' }, { new: true });
    if (!order) {
      return res.status(409).json({ message: 'Order not found or can no longer be cancelled' });
    }
    await restoreStock(order.inventoryUsed);
    res.json(order);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
