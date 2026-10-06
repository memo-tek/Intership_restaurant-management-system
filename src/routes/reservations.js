const router = require('express').Router();
const Reservation = require('../models/Reservation');
const { protect, adminOnly } = require('../middleware/auth');
const { findFreeTables, parseSlot } = require('../utils/availability');

// POST /api/reservations
// body: { start, duration?, partySize, tableId?, customerName?, phone? }
router.post('/', protect, async (req, res, next) => {
  try {
    const slot = parseSlot(req.body.start, req.body.duration);
    const partySize = Number(req.body.partySize);
    if (!slot || !Number.isInteger(partySize) || partySize < 1) {
      return res.status(400).json({ message: 'Valid start (ISO date) and partySize are required' });
    }
    if (slot.start <= new Date()) {
      return res.status(400).json({ message: 'Reservation must be in the future' });
    }

    // Table availability check
    const free = await findFreeTables({ ...slot, partySize });
    let table;
    if (req.body.tableId) {
      table = free.find((t) => String(t._id) === String(req.body.tableId));
      if (!table) return res.status(409).json({ message: 'Requested table is not available' });
    } else {
      table = free[0]; // smallest table that fits
      if (!table) return res.status(409).json({ message: 'No table available for that time' });
    }

    const reservation = await Reservation.create({
      user: req.user._id,
      table: table._id,
      customerName: req.body.customerName || req.user.name,
      phone: req.body.phone || '',
      partySize,
      startTime: slot.start,
      endTime: slot.end,
    });

    // Guard against two simultaneous bookings: the later one loses
    const clash = await Reservation.findOne({
      _id: { $lt: reservation._id },
      table: table._id,
      status: 'confirmed',
      startTime: { $lt: slot.end },
      endTime: { $gt: slot.start },
    });
    if (clash) {
      await Reservation.deleteOne({ _id: reservation._id });
      return res.status(409).json({ message: 'That table was just booked, please try again' });
    }

    res.status(201).json(await reservation.populate('table', 'number seats'));
  } catch (err) {
    next(err);
  }
});

// GET /api/reservations/me
router.get('/me', protect, async (req, res, next) => {
  try {
    res.json(
      await Reservation.find({ user: req.user._id })
        .populate('table', 'number seats')
        .sort({ startTime: -1 })
    );
  } catch (err) {
    next(err);
  }
});

// GET /api/reservations?date=2026-12-01  (admin)
router.get('/', protect, adminOnly, async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.date) {
      const from = new Date(`${req.query.date}T00:00:00.000Z`);
      if (Number.isNaN(from.getTime())) return res.status(400).json({ message: 'Invalid date' });
      filter.startTime = { $gte: from, $lt: new Date(from.getTime() + 86400000) };
    }
    res.json(
      await Reservation.find(filter)
        .populate('table', 'number seats')
        .populate('user', 'name email')
        .sort({ startTime: 1 })
    );
  } catch (err) {
    next(err);
  }
});

// DELETE /api/reservations/:id  -> cancel (owner or admin)
router.delete('/:id', protect, async (req, res, next) => {
  try {
    const filter = { _id: req.params.id, status: 'confirmed' };
    if (req.user.role !== 'admin') filter.user = req.user._id;
    const reservation = await Reservation.findOneAndUpdate(
      filter,
      { status: 'cancelled' },
      { new: true }
    );
    if (!reservation) return res.status(404).json({ message: 'Reservation not found' });
    res.json({ message: 'Reservation cancelled' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
