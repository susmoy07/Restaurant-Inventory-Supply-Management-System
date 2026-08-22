const express = require('express');
const db = require('../db');
const { authenticate } = require('../auth/authMiddleware');

const router = express.Router();

router.use(authenticate);

// Get all suppliers with their items
router.get('/', async (req, res) => {
  try {
    const { rows: suppliers } = await db.query('SELECT * FROM suppliers ORDER BY id');
    
    // For simplicity, doing a secondary query to get all mappings, then attach in memory
    const { rows: mappings } = await db.query(`
      SELECT si.supplier_id, i.id, i.name, i.category
      FROM supplier_items si
      JOIN items i ON si.item_id = i.id
    `);

    const suppliersWithItems = suppliers.map(s => {
      s.items = mappings.filter(m => m.supplier_id === s.id).map(m => ({ id: m.id, name: m.name, category: m.category }));
      return s;
    });

    res.json(suppliersWithItems);
  } catch (err) {
    console.error('Error fetching suppliers:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create supplier
router.post('/', async (req, res) => {
  const { name, contact_info } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  try {
    const { rows } = await db.query(
      'INSERT INTO suppliers (name, contact_info) VALUES ($1, $2) RETURNING *',
      [name, contact_info]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error creating supplier:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Link item to supplier
router.post('/:supplierId/items', async (req, res) => {
  const { supplierId } = req.params;
  const { item_id } = req.body;

  try {
    await db.query(
      'INSERT INTO supplier_items (supplier_id, item_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [supplierId, item_id]
    );
    res.status(201).json({ message: 'Linked successfully' });
  } catch (err) {
    console.error('Error linking item to supplier:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
