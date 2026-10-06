const express = require('express');

const app = express();
app.use(express.json());

app.get('/', (req, res) => res.json({ message: 'Restaurant Management API is running' }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/menu', require('./routes/menu'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/tables', require('./routes/tables'));
app.use('/api/reservations', require('./routes/reservations'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/reports', require('./routes/reports'));

app.use((req, res) => res.status(404).json({ message: 'Route not found' }));

// Central error handler
app.use((err, req, res, next) => {
  if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid id' });
  if (err.name === 'ValidationError') return res.status(400).json({ message: err.message });
  console.error(err);
  res.status(500).json({ message: 'Server error' });
});

module.exports = app;
