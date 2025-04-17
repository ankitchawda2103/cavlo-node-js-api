const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

// Set up PostgreSQL client
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: {
      rejectUnauthorized: false, // Enable SSL if needed; adjust according to your setup
    }
});

// Function to create DB schema
const createDatabaseSchema = async () => {
  try {
    const sql = fs.readFileSync(path.join(__dirname, 'init_db.sql'), 'utf8');
    await pool.query(sql);
    console.log('Database schema created successfully.');
  } catch (error) {
    console.error('Error creating database schema:', error);
  } finally {
    await pool.end();
  }
};

// Run the function to create the schema
createDatabaseSchema();
