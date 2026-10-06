const router = require('express').Router();
const InventoryItem = require('../models/InventoryItem');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect, adminOnly);

// GET /api/inventory
router.get('/', async (req, res, next) => {
  try {
    res.json(await InventoryItem.find().sort({ name: 1 }));
  } catch (err) {
    next(err);
  }
});

// GET /api/inventory/low-stock  -> stock alerts
router.get('/low-stock', async (req, res, next) => {
  try {
    const items = await InventoryItem.find({
      $expr: { $lte: ['$quantity', '$lowStockThreshold'] },
    }).sort({ quantity: 1 });
    res.json(items);
  } catch (err) {
    next(err);
  }
});

// POST /api/inventory
router.post('/', async (req, res, next) => {
  try {
    const { name, quantity, unit, lowStockThreshold } = req.body;
    res.status(201).json(await InventoryItem.create({ name, quantity, unit, lowStockThreshold }));
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'Inventory item already exists' });
    next(err);
  }
});

// PUT /api/inventory/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { name, quantity, unit, lowStockThreshold } = req.body;
    const update = Object.fromEntries(
      Object.entries({ name, quantity, unit, lowStockThreshold }).filter(([, v]) => v !== undefined)
    );
    const item = await InventoryItem.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    });
    if (!item) return res.status(404).json({ message: 'Inventory item not found' });
    res.json(item);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/inventory/:id/restock  { "amount": 20 }
router.patch('/:id/restock', async (req, res, next) => {
  try {
    const amount = Number(req.body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ message: 'amount must be a positive number' });
    }
    const item = await InventoryItem.findByIdAndUpdate(
      req.params.id,
      { $inc: { quantity: amount } },
      { new: true }
    );
    if (!item) return res.status(404).json({ message: 'Inventory item not found' });
    res.json(item);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/inventory/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const item = await InventoryItem.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: 'Inventory item not found' });
    res.json({ message: 'Inventory item deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
