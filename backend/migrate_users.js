
const pool = require('./src/config/db');

async function migrate() {
  try {
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50)');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(100)');
    console.log('Migration successful: phone and department columns added to users table.');
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    pool.end();
  }
}
migrate();
