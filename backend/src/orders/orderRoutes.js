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
      SELECT poi.order_id, poi.item_id, poi.quantity, i.name as item_name, i.unit, i.cost_price
      FROM purchase_order_items poi
      JOIN items i ON poi.item_id = i.id
    `);

    const ordersWithItems = orders.map(o => {
      const orderLineItems = items.filter(i => i.order_id === o.id).map(li => ({
        ...li,
        line_total: parseFloat(li.quantity || 0) * parseFloat(li.cost_price || 0)
      }));
      const totalAmount = orderLineItems.reduce((acc, curr) => acc + curr.line_total, 0);
      o.items = orderLineItems;
      o.total_amount = totalAmount;
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
        [orderId, item.item_id, parseFloat(item.quantity)]
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

// Update order status (Manager only) with automatic stock fulfillment on 'Received'
router.patch('/:id/status', requireRole(['Manager']), async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['Pending', 'Ordered', 'Received'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const { rows: currentOrderRows } = await client.query(
      'SELECT * FROM purchase_orders WHERE id = $1',
      [id]
    );

    if (currentOrderRows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Order not found' });
    }

    const previousStatus = currentOrderRows[0].status;

    // Update the purchase order status
    const { rows: updatedOrderRows } = await client.query(
      'UPDATE purchase_orders SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );

    // If status changed to 'Received' from another status, fulfill stock intake
    if (status === 'Received' && previousStatus !== 'Received') {
      const { rows: orderItems } = await client.query(
        'SELECT item_id, quantity FROM purchase_order_items WHERE order_id = $1',
        [id]
      );

      for (const item of orderItems) {
        const qty = parseFloat(item.quantity);
        // 1. Increment item stock
        await client.query(
          'UPDATE items SET current_stock = current_stock + $1 WHERE id = $2',
          [qty, item.item_id]
        );

        // 2. Log stock IN transaction
        const idemKey = `po-recv-${id}-${item.item_id}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        await client.query(
          `INSERT INTO transactions (item_id, type, quantity, reason, user_id, idempotency_key)
           VALUES ($1, 'IN', $2, $3, $4, $5)`,
          [item.item_id, qty, `Received Delivery (PO #${id})`, req.user.id, idemKey]
        );
      }
    }

    await client.query('COMMIT');
    res.json({
      ...updatedOrderRows[0],
      stockUpdated: status === 'Received' && previousStatus !== 'Received'
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating order status:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

module.exports = router;
