const express = require('express');
const db = require('../db');
const { authenticate, requireRole } = require('../auth/authMiddleware');

const router = express.Router();

router.use(authenticate);

// Get all orders
router.get('/', async (req, res) => {
  try {
    const { rows: orders } = await db.query(`
      SELECT o.*, s.name as supplier_name, u.email as created_by_email
      FROM purchase_orders o
      LEFT JOIN suppliers s ON o.supplier_id = s.id
      LEFT JOIN users u ON o.created_by = u.id
      ORDER BY o.created_at DESC
    `);

    const { rows: items } = await db.query(`
      SELECT poi.order_id, poi.item_id, poi.quantity, i.name as item_name
      FROM purchase_order_items poi
      JOIN items i ON poi.item_id = i.id
    `);

    const ordersWithItems = orders.map(o => {
      o.items = items.filter(i => i.order_id === o.id);
      return o;
    });

    res.json(ordersWithItems);
  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create order
router.post('/', async (req, res) => {
  const { supplier_id, items } = req.body;
  if (!supplier_id || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Supplier ID and items array are required' });
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const { rows: orderRows } = await client.query(
      'INSERT INTO purchase_orders (supplier_id, status, created_by) VALUES ($1, $2, $3) RETURNING *',
      [supplier_id, 'Pending', req.user.id]
    );

    const orderId = orderRows[0].id;

    for (const item of items) {
      if (!item.item_id || !item.quantity) throw new Error('Invalid item data');
      await client.query(
        'INSERT INTO purchase_order_items (order_id, item_id, quantity) VALUES ($1, $2, $3)',
        [orderId, item.item_id, item.quantity]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(orderRows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating order:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Update order status (Manager only)
router.patch('/:id/status', requireRole(['Manager']), async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['Pending', 'Ordered', 'Received'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    const { rows } = await db.query(
      'UPDATE purchase_orders SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Error updating order:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
