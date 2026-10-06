const router = require('express').Router();
const Table = require('../models/Table');
const { protect, adminOnly } = require('../middleware/auth');
const { findFreeTables, parseSlot } = require('../utils/availability');

// GET /api/tables
router.get('/', async (req, res, next) => {
  try {
    res.json(await Table.find().sort({ number: 1 }));
  } catch (err) {
    next(err);
  }
});

// GET /api/tables/available?start=2026-12-01T19:00:00Z&duration=90&partySize=4
router.get('/available', async (req, res, next) => {
  try {
    const slot = parseSlot(req.query.start, req.query.duration);
    if (!slot) return res.status(400).json({ message: 'Valid start (ISO date) is required' });
    const partySize = Number(req.query.partySize) || 1;
    res.json(await findFreeTables({ ...slot, partySize }));
  } catch (err) {
    next(err);
  }
});

// POST /api/tables (admin)
router.post('/', protect, adminOnly, async (req, res, next) => {
  try {
    const { number, seats } = req.body;
    res.status(201).json(await Table.create({ number, seats }));
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'Table number already exists' });
    next(err);
  }
});

// PUT /api/tables/:id (admin)
router.put('/:id', protect, adminOnly, async (req, res, next) => {
  try {
    const { number, seats } = req.body;
    const update = Object.fromEntries(
      Object.entries({ number, seats }).filter(([, v]) => v !== undefined)
    );
    const table = await Table.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    });
    if (!table) return res.status(404).json({ message: 'Table not found' });
    res.json(table);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/tables/:id (admin)
router.delete('/:id', protect, adminOnly, async (req, res, next) => {
  try {
    const table = await Table.findByIdAndDelete(req.params.id);
    if (!table) return res.status(404).json({ message: 'Table not found' });
    res.json({ message: 'Table deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
