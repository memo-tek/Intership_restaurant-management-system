const router = require('express').Router();
const MenuItem = require('../models/MenuItem');
const { protect, adminOnly } = require('../middleware/auth');

const FIELDS = ['name', 'description', 'price', 'category', 'available', 'recipe'];
const pick = (body) =>
  Object.fromEntries(FIELDS.filter((f) => body[f] !== undefined).map((f) => [f, body[f]]));

// GET /api/menu  -> view menu (?category=drinks&available=true)
router.get('/', async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.category) filter.category = req.query.category;
    if (req.query.available !== undefined) filter.available = req.query.available === 'true';
    res.json(await MenuItem.find(filter).sort({ category: 1, name: 1 }));
  } catch (err) {
    next(err);
  }
});

// GET /api/menu/:id
router.get('/:id', async (req, res, next) => {
  try {
    const item = await MenuItem.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Menu item not found' });
    res.json(item);
  } catch (err) {
    next(err);
  }
});

// POST /api/menu (admin)
router.post('/', protect, adminOnly, async (req, res, next) => {
  try {
    res.status(201).json(await MenuItem.create(pick(req.body)));
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'Menu item already exists' });
    next(err);
  }
});

// PUT /api/menu/:id (admin)
router.put('/:id', protect, adminOnly, async (req, res, next) => {
  try {
    const item = await MenuItem.findByIdAndUpdate(req.params.id, pick(req.body), {
      new: true,
      runValidators: true,
    });
    if (!item) return res.status(404).json({ message: 'Menu item not found' });
    res.json(item);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/menu/:id (admin)
router.delete('/:id', protect, adminOnly, async (req, res, next) => {
  try {
    const item = await MenuItem.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: 'Menu item not found' });
    res.json({ message: 'Menu item deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
