const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    quantity: { type: Number, required: true, min: 0, default: 0 },
    unit: { type: String, default: 'unit' }, // kg, l, pcs...
    lowStockThreshold: { type: Number, default: 5, min: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('InventoryItem', inventorySchema);
