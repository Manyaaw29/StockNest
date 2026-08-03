require('dotenv').config();
const { Client } = require('pg');

const c = new Client({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

async function run() {
  try {
    await c.connect();
    
    // Add new columns to organization
    await c.query("ALTER TABLE organization ADD COLUMN IF NOT EXISTS address VARCHAR(255);").catch(e => console.log('Add address failed:', e.message));
    await c.query("ALTER TABLE organization ADD COLUMN IF NOT EXISTS support_email VARCHAR(255);").catch(e => console.log('Add support_email failed:', e.message));
    
    console.log('✅ Schema successfully updated!');
  } catch (err) {
    console.error('❌ Error updating schema:', err);
  } finally {
    await c.end();
  }
}

run();
