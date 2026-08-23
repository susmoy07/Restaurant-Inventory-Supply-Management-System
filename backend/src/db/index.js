const { newDb } = require('pg-mem');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

const db = newDb();

const basicSchema = `
  CREATE TABLE users (id SERIAL PRIMARY KEY, email TEXT, password_hash TEXT, role TEXT, created_at TEXT);
  CREATE TABLE items (id SERIAL PRIMARY KEY, name TEXT, unit TEXT, category TEXT, current_stock NUMERIC, reorder_level NUMERIC, cost_price NUMERIC, expiry_date TEXT, batch_no TEXT, created_at TEXT);
  CREATE TABLE transactions (id SERIAL PRIMARY KEY, item_id INTEGER, type TEXT, quantity NUMERIC, reason TEXT, user_id INTEGER, idempotency_key TEXT, created_at TEXT);
  CREATE TABLE suppliers (id SERIAL PRIMARY KEY, name TEXT, contact_info TEXT, created_at TEXT);
  CREATE TABLE supplier_items (supplier_id INTEGER, item_id INTEGER);
  CREATE TABLE purchase_orders (id SERIAL PRIMARY KEY, supplier_id INTEGER, status TEXT, created_by INTEGER, created_at TEXT);
  CREATE TABLE purchase_order_items (order_id INTEGER, item_id INTEGER, quantity NUMERIC);
`;

db.public.none(basicSchema);


// Intercept the pg module to provide a mock pool
const pg = db.adapters.createPg();
const pool = new pg.Pool();

// Seed data
(async () => {
  const client = await pool.connect();
  try {
    const managerPassword = await bcrypt.hash('manager123', 10);
    const staffPassword = await bcrypt.hash('staff123', 10);
    const nowIso = new Date().toISOString();

    // Helper dates for expiration tracking
    const today = new Date();
    const plus3Days = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const plus15Days = new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const plus90Days = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    await client.query(`
      INSERT INTO users (email, password_hash, role, created_at) VALUES 
      ('manager@risms.com', $1, 'Manager', '${nowIso}'),
      ('staff@risms.com', $2, 'Staff', '${nowIso}');
    `, [managerPassword, staffPassword]);

    await client.query(`
      INSERT INTO items (name, unit, category, current_stock, reorder_level, cost_price, expiry_date, batch_no, created_at) VALUES
      ('Organic Flour', 'kg', 'Pantry', 50, 20, 1.80, '${plus90Days}', 'B-FL-101', '${nowIso}'),
      ('Refined Sugar', 'kg', 'Pantry', 10, 15, 1.20, '${plus90Days}', 'B-SG-204', '${nowIso}'),
      ('Ripe Tomatoes', 'kg', 'Produce', 5, 10, 3.50, '${plus3Days}', 'B-TM-882', '${nowIso}'),
      ('Fresh Chicken Breast', 'kg', 'Meat', 30, 25, 6.50, '${plus3Days}', 'B-CK-991', '${nowIso}'),
      ('Extra Virgin Olive Oil', 'L', 'Pantry', 20, 8, 12.00, '${plus90Days}', 'B-OL-301', '${nowIso}'),
      ('Whole Milk', 'L', 'Dairy', 18, 12, 2.10, '${plus15Days}', 'B-MK-512', '${nowIso}');
    `);

    await client.query(`
      INSERT INTO suppliers (name, contact_info, created_at) VALUES
      ('FreshFarm Produce', 'contact@freshfarm.com', '${nowIso}'),
      ('Meat Master Ltd', 'sales@meatmaster.com', '${nowIso}'),
      ('Pantry Supplies Inc', 'info@pantrysupplies.com', '${nowIso}');
    `);

    await client.query(`
      INSERT INTO supplier_items (supplier_id, item_id) VALUES
      (1, 3),
      (2, 4),
      (3, 1),
      (3, 2),
      (3, 5),
      (1, 6);
    `);

    // Seed sample transactions with diverse reasons
    await client.query(`
      INSERT INTO transactions (item_id, type, quantity, reason, user_id, idempotency_key, created_at) VALUES
      (1, 'IN', 50, 'Initial Stocking', 1, 'seed-tx-1', '${nowIso}'),
      (3, 'OUT', 3, 'Kitchen Usage', 2, 'seed-tx-2', '${nowIso}'),
      (3, 'OUT', 2, 'Spoilage / Expired', 2, 'seed-tx-3', '${nowIso}'),
      (4, 'OUT', 5, 'Kitchen Usage', 2, 'seed-tx-4', '${nowIso}'),
      (2, 'OUT', 1, 'Prep Waste', 2, 'seed-tx-5', '${nowIso}');
    `);

    console.log("In-memory database seeded successfully with pricing & batch data.");
  } catch (err) {
    console.error("Seed error:", err);
  } finally {
    client.release();
  }
})();

module.exports = {
  query: (text, params) => {
    // pg-mem doesn't fully support FOR UPDATE, strip it if present
    const cleanText = text.replace(/FOR UPDATE/gi, '');
    return pool.query(cleanText, params);
  },
  getClient: async () => {
    const client = await pool.connect();
    const originalQuery = client.query.bind(client);
    client.query = async (text, params) => {
      if (typeof text === 'string') {
        text = text.replace(/FOR UPDATE/gi, '');
      }
      return originalQuery(text, params);
    };
    return client;
  },
};
