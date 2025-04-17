const { pool } = require('../config/db');

// Get user by phone number
const getUserByPhone = async (phone_number) => {
  const result = await pool.query('SELECT * FROM users WHERE phone_number = $1', [phone_number]);
  return result.rows[0];
};

// Create a new user
const createUser = async (phone_number) => {
  const result = await pool.query('INSERT INTO users (phone_number) VALUES ($1) RETURNING *', [phone_number]);
  return result.rows[0];
};

module.exports = { getUserByPhone, createUser };
