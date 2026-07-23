const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT,
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Test connection on startup
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);

    if (err.message.includes('does not exist')) {
      console.log('💡 Fix: run "node src/setupDb.js" to create the database & tables.');
    } else if (err.code === 'ECONNREFUSED') {
      console.log('💡 Fix: PostgreSQL service is not running. Start it first.');
    } else if (err.message.includes('password authentication failed')) {
      console.log('💡 Fix: DB_PASSWORD in .env does not match your postgres user password.');
    }
  } else {
    console.log('✅ Connected to PostgreSQL');
    release();
  }
});

module.exports = pool;