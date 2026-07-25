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
    
    // Create new enum type
    await c.query("CREATE TYPE room_category AS ENUM ('Executive Boardroom', 'Meeting Room', 'Conference Hall', 'Hot Desk Area', 'Focus Pod', 'Private Cabin');").catch(e => console.log('Enum may already exist:', e.message));
    
    // Add new column
    await c.query("ALTER TABLE room ADD COLUMN IF NOT EXISTS category room_category NOT NULL DEFAULT 'Meeting Room';").catch(e => console.log('Add category failed:', e.message));
    
    // Drop old columns
    await c.query("ALTER TABLE room DROP COLUMN IF EXISTS utilization_pct;").catch(e => console.log('Drop utilization failed:', e.message));
    await c.query("ALTER TABLE room DROP COLUMN IF EXISTS type;").catch(e => console.log('Drop type failed:', e.message));
    
    console.log('✅ Schema successfully updated!');
  } catch (err) {
    console.error('❌ Error updating schema:', err);
  } finally {
    await c.end();
  }
}

run();
