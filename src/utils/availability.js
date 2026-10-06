const Table = require('../models/Table');
const Reservation = require('../models/Reservation');

// Tables with enough seats that have no confirmed reservation overlapping [start, end)
async function findFreeTables({ start, end, partySize = 1 }) {
  const busyTableIds = await Reservation.find({
    status: 'confirmed',
    startTime: { $lt: end },
    endTime: { $gt: start },
  }).distinct('table');

  return Table.find({ _id: { $nin: busyTableIds }, seats: { $gte: partySize } }).sort({
    seats: 1,
    number: 1,
  });
}

// Parses ?start=ISO&duration=minutes into { start, end } or null if invalid
function parseSlot(startRaw, durationRaw = 90) {
  const start = new Date(startRaw);
  const duration = Number(durationRaw);
  if (Number.isNaN(start.getTime()) || !Number.isFinite(duration) || duration < 15) return null;
  return { start, end: new Date(start.getTime() + duration * 60000) };
}

module.exports = { findFreeTables, parseSlot };
