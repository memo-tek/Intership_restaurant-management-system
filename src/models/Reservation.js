const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    table: { type: mongoose.Schema.Types.ObjectId, ref: 'Table', required: true },
    customerName: { type: String, required: true, trim: true },
    phone: { type: String, default: '' },
    partySize: { type: Number, required: true, min: 1 },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    status: { type: String, enum: ['confirmed', 'cancelled'], default: 'confirmed' },
  },
  { timestamps: true }
);

reservationSchema.index({ table: 1, startTime: 1, endTime: 1 });

module.exports = mongoose.model('Reservation', reservationSchema);
