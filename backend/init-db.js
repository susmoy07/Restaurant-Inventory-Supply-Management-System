const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');

dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'risms',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

async function run() {
  const client = await pool.connect();
  try {
    console.log('Reading schema.sql...');
    const schemaSql = fs.readFileSync(path.join(__dirname, 'src', 'db', 'schema.sql'), 'utf-8');
    
    console.log('Executing schema...');
    await client.query(schemaSql);
    console.log('Schema created successfully.');

    // Create Manager user
    const managerPassword = await bcrypt.hash('manager123', 10);
    // Create Staff user
    const staffPassword = await bcrypt.hash('staff123', 10);

    console.log('Inserting seed data...');
    // Seed Users
    await client.query(`
      INSERT INTO users (email, password_hash, role) VALUES 
      ('manager@risms.com', $1, 'Manager'),
      ('staff@risms.com', $2, 'Staff')
      ON CONFLICT (email) DO NOTHING;
    `, [managerPassword, staffPassword]);

    // Seed Items
    await client.query(`
      INSERT INTO items (name, unit, category, current_stock, reorder_level) VALUES
      ('Flour', 'kg', 'Pantry', 50, 20),
      ('Sugar', 'kg', 'Pantry', 10, 15),
      ('Tomatoes', 'kg', 'Produce', 5, 10),
      ('Chicken Breast', 'kg', 'Meat', 30, 25)
      ON CONFLICT DO NOTHING; -- we don't have unique constraint, so this is just for simplicity
    `);

    // Seed Suppliers
    await client.query(`
      INSERT INTO suppliers (name, contact_info) VALUES
      ('FreshFarm Produce', 'contact@freshfarm.com'),
      ('Meat Master', 'sales@meatmaster.com'),
      ('Pantry Supplies Inc', 'info@pantrysupplies.com')
      ON CONFLICT DO NOTHING;
    `);

    // Seed Supplier Items mapping
    await client.query(`
      INSERT INTO supplier_items (supplier_id, item_id) VALUES
      (1, 3), -- FreshFarm supplies Tomatoes
      (2, 4), -- Meat Master supplies Chicken Breast
      (3, 1), -- Pantry Supplies supplies Flour
      (3, 2)  -- Pantry Supplies supplies Sugar
      ON CONFLICT DO NOTHING;
    `);

    console.log('Seed data inserted successfully.');
  } catch (err) {
    console.error('Error initializing database:', err);
  } finally {
    client.release();
    pool.end();
  }
}

run();
