const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const authRoutes = require('./auth/authRoutes');
const inventoryRoutes = require('./inventory/inventoryRoutes');
const transactionRoutes = require('./inventory/transactionRoutes');
const supplierRoutes = require('./suppliers/supplierRoutes');
const orderRoutes = require('./orders/orderRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Root & Health Status
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'Restaurant Inventory & Supply Management System (RISMS) API',
    endpoints: {
      auth: ['POST /api/auth/login', 'POST /api/auth/register', 'GET /api/auth/me'],
      inventory: ['GET /api/inventory', 'GET /api/inventory/low-stock', 'POST /api/inventory', 'PUT /api/inventory/:id', 'DELETE /api/inventory/:id'],
      transactions: ['GET /api/transactions', 'POST /api/transactions'],
      suppliers: ['GET /api/suppliers', 'POST /api/suppliers', 'POST /api/suppliers/:id/items'],
      orders: ['GET /api/orders', 'POST /api/orders', 'PATCH /api/orders/:id/status']
    },
    frontendUrl: 'http://localhost:5173'
  });
});

app.get('/api', (req, res) => {
  res.json({
    status: 'online',
    version: '1.0.0',
    documentation: 'See README.md or GET / for route details'
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/orders', orderRoutes);

// Basic error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
