const express = require('express');
const db = require('../db');
const { authenticate } = require('../auth/authMiddleware');

const router = express.Router();

router.use(authenticate);

// Get all items with calculated total value
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM items ORDER BY id');
    const itemsWithValue = rows.map(item => ({
      ...item,
      current_stock: parseFloat(item.current_stock || 0),
      reorder_level: parseFloat(item.reorder_level || 0),
      cost_price: parseFloat(item.cost_price || 0),
      total_value: parseFloat((parseFloat(item.current_stock || 0) * parseFloat(item.cost_price || 0)).toFixed(2))
    }));
    res.json(itemsWithValue);
  } catch (err) {
    console.error('Error fetching items:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get analytics overview
router.get('/analytics', async (req, res) => {
  try {
    const { rows: items } = await db.query('SELECT * FROM items');
    const today = new Date();
    const sevenDaysFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    let totalValuation = 0;
    let lowStockCount = 0;
    let expiringSoonCount = 0;
    const categoryMap = {};

    items.forEach(item => {
      const stock = parseFloat(item.current_stock || 0);
      const reorder = parseFloat(item.reorder_level || 0);
      const cost = parseFloat(item.cost_price || 0);
      const val = stock * cost;

      totalValuation += val;

      if (stock <= reorder) {
        lowStockCount++;
      }

      if (item.expiry_date) {
        const exp = new Date(item.expiry_date);
        if (exp <= sevenDaysFromNow) {
          expiringSoonCount++;
        }
      }

      const cat = item.category || 'Uncategorized';
      if (!categoryMap[cat]) {
        categoryMap[cat] = { category: cat, count: 0, totalStock: 0, totalValuation: 0 };
      }
      categoryMap[cat].count += 1;
      categoryMap[cat].totalStock += stock;
      categoryMap[cat].totalValuation += val;
    });

    const categoryBreakdown = Object.values(categoryMap).map(c => ({
      ...c,
      totalValuation: parseFloat(c.totalValuation.toFixed(2))
    }));

    // Fetch transaction reasons breakdown
    const { rows: transactions } = await db.query(`SELECT type, reason, quantity FROM transactions`);
    const reasonsMap = {
      Usage: 0,
      Spoilage: 0,
      Waste: 0,
      Delivery: 0,
      Other: 0
    };

    transactions.forEach(tx => {
      const qty = parseFloat(tx.quantity || 0);
      const r = (tx.reason || '').toLowerCase();
      if (r.includes('usage') || r.includes('kitchen')) reasonsMap.Usage += qty;
      else if (r.includes('spoil') || r.includes('expire')) reasonsMap.Spoilage += qty;
      else if (r.includes('waste') || r.includes('prep')) reasonsMap.Waste += qty;
      else if (r.includes('deliver') || r.includes('po') || r.includes('stocking')) reasonsMap.Delivery += qty;
      else reasonsMap.Other += qty;
    });

    res.json({
      totalValuation: parseFloat(totalValuation.toFixed(2)),
      totalItems: items.length,
      lowStockCount,
      expiringSoonCount,
      categoryBreakdown,
      reasonsMap
    });
  } catch (err) {
    console.error('Error calculating analytics:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get low stock items
router.get('/low-stock', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM items WHERE current_stock <= reorder_level ORDER BY id');
    res.json(rows.map(r => ({
      ...r,
      current_stock: parseFloat(r.current_stock || 0),
      reorder_level: parseFloat(r.reorder_level || 0),
      cost_price: parseFloat(r.cost_price || 0)
    })));
  } catch (err) {
    console.error('Error fetching low stock items:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get expiring soon items (< 7 days)
router.get('/expiring-soon', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM items WHERE expiry_date IS NOT NULL ORDER BY expiry_date ASC');
    const today = new Date();
    const sevenDaysFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    const expiring = rows.filter(item => {
      if (!item.expiry_date) return false;
      const exp = new Date(item.expiry_date);
      return exp <= sevenDaysFromNow;
    }).map(r => ({
      ...r,
      current_stock: parseFloat(r.current_stock || 0),
      reorder_level: parseFloat(r.reorder_level || 0),
      cost_price: parseFloat(r.cost_price || 0)
    }));

    res.json(expiring);
  } catch (err) {
    console.error('Error fetching expiring items:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create item
router.post('/', async (req, res) => {
  const { name, unit, category, reorder_level, cost_price, expiry_date, batch_no } = req.body;
  if (!name || !unit || !category || reorder_level === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const { rows } = await db.query(
      `INSERT INTO items (name, unit, category, current_stock, reorder_level, cost_price, expiry_date, batch_no)
       VALUES ($1, $2, $3, 0, $4, $5, $6, $7) RETURNING *`,
      [
        name,
        unit,
        category,
        parseFloat(reorder_level),
        cost_price ? parseFloat(cost_price) : 0,
        expiry_date || null,
        batch_no || null
      ]
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
  const { name, unit, category, reorder_level, cost_price, expiry_date, batch_no } = req.body;

  try {
    const { rows } = await db.query(
      `UPDATE items 
       SET name = $1, unit = $2, category = $3, reorder_level = $4, cost_price = $5, expiry_date = $6, batch_no = $7 
       WHERE id = $8 RETURNING *`,
      [
        name,
        unit,
        category,
        parseFloat(reorder_level),
        cost_price !== undefined ? parseFloat(cost_price) : 0,
        expiry_date || null,
        batch_no || null,
        id
      ]
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
