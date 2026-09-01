const pool = require('./src/config/db');

async function migrate() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS client (
        client_id       SERIAL PRIMARY KEY,
        org_id          INT NOT NULL REFERENCES organization(org_id) ON DELETE CASCADE,
        name            VARCHAR(255) NOT NULL,
        email           VARCHAR(255),
        phone           VARCHAR(50),
        company         VARCHAR(255),
        created_at      TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('Migration successful: client table added.');
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    pool.end();
  }
}
migrate();
