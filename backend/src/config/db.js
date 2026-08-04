const { Pool } = require('pg');
require('dotenv').config();

const isSupabase = process.env.DB_HOST && (
  process.env.DB_HOST.includes('supabase.co') ||
  process.env.DB_HOST.includes('pooler.supabase.com')
);

const pool = new Pool({
  host:                   process.env.DB_HOST,
  port:                   process.env.DB_PORT,
  database:               process.env.DB_NAME,
  user:                   process.env.DB_USER,
  password:               process.env.DB_PASSWORD,
  // Limit connections — Supabase free tier allows max 15
  max:                    5,
  idleTimeoutMillis:      30000,
  connectionTimeoutMillis: 10000,
  // SSL required for Supabase
  ssl: isSupabase ? { rejectUnauthorized: false } : false,
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