const pool = require('./src/config/db');

async function migrate() {
  try {
    console.log('Altering booking table to add client_id...');
    await pool.query(`ALTER TABLE booking ADD COLUMN client_id INT REFERENCES client(client_id);`);
    console.log('Migration successful.');
  } catch (err) {
    if (err.message.includes('already exists')) {
      console.log('Column client_id already exists. Skipping...');
    } else {
      console.error('Migration failed:', err.message);
    }
  } finally {
    pool.end();
  }
}
migrate();
