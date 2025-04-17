const { Pool } = require('pg');

// Create a pool connection to PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: {
    rejectUnauthorized: false, // Enable SSL if needed; adjust according to your setup
  },
});

// Function to connect to the database
const connectDB = async () => {
  try {
    await pool.connect();
    console.log('Database connected');
  } catch (err) {
    console.error('Error connecting to database:', err);
    process.exit(1);
  }
};

module.exports = { pool, connectDB };
