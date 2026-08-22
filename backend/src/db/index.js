const { newDb } = require('pg-mem');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

const db = newDb();

const basicSchema = `
  CREATE TABLE users (id SERIAL PRIMARY KEY, email TEXT, password_hash TEXT, role TEXT, created_at TEXT);
  CREATE TABLE items (id SERIAL PRIMARY KEY, name TEXT, unit TEXT, category TEXT, current_stock NUMERIC, reorder_level NUMERIC, created_at TEXT);
  CREATE TABLE transactions (id SERIAL PRIMARY KEY, item_id INTEGER, type TEXT, quantity NUMERIC, user_id INTEGER, idempotency_key TEXT, created_at TEXT);
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

    await client.query(`
      INSERT INTO users (email, password_hash, role) VALUES 
      ('manager@risms.com', $1, 'Manager'),
      ('staff@risms.com', $2, 'Staff');
    `, [managerPassword, staffPassword]);

    await client.query(`
      INSERT INTO items (name, unit, category, current_stock, reorder_level) VALUES
      ('Flour', 'kg', 'Pantry', 50, 20),
      ('Sugar', 'kg', 'Pantry', 10, 15),
      ('Tomatoes', 'kg', 'Produce', 5, 10),
      ('Chicken Breast', 'kg', 'Meat', 30, 25);
    `);

    await client.query(`
      INSERT INTO suppliers (name, contact_info) VALUES
      ('FreshFarm Produce', 'contact@freshfarm.com'),
      ('Meat Master', 'sales@meatmaster.com'),
      ('Pantry Supplies Inc', 'info@pantrysupplies.com');
    `);

    await client.query(`
      INSERT INTO supplier_items (supplier_id, item_id) VALUES
      (1, 3),
      (2, 4),
      (3, 1),
      (3, 2);
    `);
    console.log("In-memory database seeded successfully.");
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
