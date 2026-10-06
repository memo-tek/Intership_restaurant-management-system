// Loads sample tables, inventory and menu so you can test right away: npm run seed
require('dotenv').config();
const mongoose = require('mongoose');
const Table = require('./models/Table');
const InventoryItem = require('./models/InventoryItem');
const MenuItem = require('./models/MenuItem');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);

  if (await Table.countDocuments()) {
    console.log('Data already exists, skipping seed.');
    return mongoose.disconnect();
  }

  await Table.insertMany([
    { number: 1, seats: 2 },
    { number: 2, seats: 2 },
    { number: 3, seats: 4 },
    { number: 4, seats: 4 },
    { number: 5, seats: 6 },
  ]);

  const [dough, cheese, tomato, chicken, rice, cola] = await InventoryItem.insertMany([
    { name: 'Pizza dough', quantity: 30, unit: 'pcs', lowStockThreshold: 5 },
    { name: 'Mozzarella', quantity: 5, unit: 'kg', lowStockThreshold: 1 },
    { name: 'Tomato sauce', quantity: 4, unit: 'l', lowStockThreshold: 1 },
    { name: 'Chicken', quantity: 10, unit: 'kg', lowStockThreshold: 2 },
    { name: 'Rice', quantity: 15, unit: 'kg', lowStockThreshold: 3 },
    { name: 'Cola cans', quantity: 48, unit: 'pcs', lowStockThreshold: 10 },
  ]);

  await MenuItem.insertMany([
    {
      name: 'Margherita Pizza',
      price: 120,
      category: 'main',
      recipe: [
        { ingredient: dough._id, quantity: 1 },
        { ingredient: cheese._id, quantity: 0.15 },
        { ingredient: tomato._id, quantity: 0.1 },
      ],
    },
    {
      name: 'Grilled Chicken with Rice',
      price: 150,
      category: 'main',
      recipe: [
        { ingredient: chicken._id, quantity: 0.25 },
        { ingredient: rice._id, quantity: 0.2 },
      ],
    },
    { name: 'Cola', price: 20, category: 'drinks', recipe: [{ ingredient: cola._id, quantity: 1 }] },
  ]);

  console.log('Seeded 5 tables, 6 inventory items and 3 menu items.');
  await mongoose.disconnect();
})();
