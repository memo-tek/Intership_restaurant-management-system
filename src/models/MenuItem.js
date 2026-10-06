const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
    category: { type: String, default: 'main', trim: true },
    available: { type: Boolean, default: true },
    // Ingredients consumed per portion. Used to auto-update inventory on orders.
    recipe: [
      {
        _id: false,
        ingredient: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
        quantity: { type: Number, required: true, min: 0 },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('MenuItem', menuItemSchema);
