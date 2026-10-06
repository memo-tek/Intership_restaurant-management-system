const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    tableNumber: { type: Number },
    items: [
      {
        _id: false,
        menuItem: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
        name: String, // snapshot at order time
        price: Number, // snapshot at order time
        quantity: { type: Number, required: true, min: 1 },
      },
    ],
    total: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'preparing', 'served', 'completed', 'cancelled'],
      default: 'pending',
    },
    notes: { type: String, default: '' },
    // Stock consumed by this order, so a cancellation can put it back
    inventoryUsed: [
      {
        _id: false,
        ingredient: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem' },
        quantity: Number,
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
