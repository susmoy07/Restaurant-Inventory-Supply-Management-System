const express = require('express');
const db = require('../db');
const { authenticate } = require('../auth/authMiddleware');

const router = express.Router();

router.use(authenticate);

// Get recent transactions
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT t.*, i.name as item_name, u.email as user_email
      FROM transactions t
      JOIN items i ON t.item_id = i.id
      LEFT JOIN users u ON t.user_id = u.id
      ORDER BY t.created_at DESC
      LIMIT 50
    `);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching transactions:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a stock transaction (IN/OUT)
router.post('/', async (req, res) => {
  const { item_id, type, quantity, idempotency_key } = req.body;

  if (!item_id || !type || !quantity || !idempotency_key) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (type !== 'IN' && type !== 'OUT') {
    return res.status(400).json({ error: 'Invalid transaction type' });
  }

  if (quantity <= 0) {
    return res.status(400).json({ error: 'Quantity must be positive' });
  }

  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    // 1. Check idempotency key to prevent double submission
    const existingTx = await client.query(
      'SELECT id FROM transactions WHERE idempotency_key = $1',
      [idempotency_key]
    );

    if (existingTx.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Transaction already processed (idempotency key match)' });
    }

    // 2. Lock the item row for update to ensure atomic stock modification
    const itemResult = await client.query(
      'SELECT current_stock FROM items WHERE id = $1 FOR UPDATE',
      [item_id]
    );

    if (itemResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Item not found' });
    }

    const currentStock = parseFloat(itemResult.rows[0].current_stock);
    const parsedQuantity = parseFloat(quantity);
    
    let newStock = currentStock;
    if (type === 'IN') {
      newStock += parsedQuantity;
    } else {
      if (currentStock < parsedQuantity) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Insufficient stock' });
      }
      newStock -= parsedQuantity;
    }

    // 3. Insert transaction
    const txResult = await client.query(
      `INSERT INTO transactions (item_id, type, quantity, user_id, idempotency_key)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [item_id, type, parsedQuantity, req.user.id, idempotency_key]
    );

    // 4. Update item stock
    await client.query(
      'UPDATE items SET current_stock = $1 WHERE id = $2',
      [newStock, item_id]
    );

    await client.query('COMMIT');

    res.status(201).json(txResult.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Transaction error:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

module.exports = router;
