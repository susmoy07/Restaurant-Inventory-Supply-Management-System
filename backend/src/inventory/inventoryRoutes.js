const express = require('express');
const db = require('../db');
const { authenticate } = require('../auth/authMiddleware');

const router = express.Router();

router.use(authenticate);

// Get all items
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM items ORDER BY id');
    res.json(rows);
  } catch (err) {
    console.error('Error fetching items:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get low stock items
router.get('/low-stock', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM items WHERE current_stock < reorder_level ORDER BY id');
    res.json(rows);
  } catch (err) {
    console.error('Error fetching low stock items:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create item
router.post('/', async (req, res) => {
  const { name, unit, category, reorder_level } = req.body;
  if (!name || !unit || !category || reorder_level === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const { rows } = await db.query(
      'INSERT INTO items (name, unit, category, current_stock, reorder_level) VALUES ($1, $2, $3, 0, $4) RETURNING *',
      [name, unit, category, reorder_level]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error creating item:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update item (excluding stock, which is handled via transactions)
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, unit, category, reorder_level } = req.body;

  try {
    const { rows } = await db.query(
      'UPDATE items SET name = $1, unit = $2, category = $3, reorder_level = $4 WHERE id = $5 RETURNING *',
      [name, unit, category, reorder_level, id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Item not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Error updating item:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete item
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await db.query('DELETE FROM items WHERE id = $1 RETURNING *', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Item not found' });
    res.json({ message: 'Item deleted successfully' });
  } catch (err) {
    console.error('Error deleting item:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
