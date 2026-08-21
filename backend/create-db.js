const { Client } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

async function createDb() {
  const client = new Client({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: 'postgres', // Connect to default database
    password: process.env.DB_PASSWORD || 'postgres',
    port: process.env.DB_PORT || 5432,
  });

  try {
    await client.connect();
    const res = await client.query("SELECT 1 FROM pg_database WHERE datname = 'risms'");
    if (res.rowCount === 0) {
      console.log('Creating database risms...');
      await client.query('CREATE DATABASE risms');
      console.log('Database risms created successfully.');
    } else {
      console.log('Database risms already exists.');
    }
  } catch (err) {
    console.error('Error creating database:', err);
  } finally {
    await client.end();
  }
}

createDb();
