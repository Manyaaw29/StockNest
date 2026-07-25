const pool = require('./src/config/db');

async function updateDb() {
  try {
    // Drop the constraint if it exists just in case
    await pool.query('ALTER TABLE room DROP CONSTRAINT IF EXISTS room_status_check');
    
    // Make sure all existing data conforms (they should based on earlier checks, but just in case)
    await pool.query("UPDATE room SET status = 'Available' WHERE status NOT IN ('Available', 'Booked', 'Under Maintenance')");

    // Add the check constraint
    await pool.query("ALTER TABLE room ADD CONSTRAINT room_status_check CHECK (status IN ('Available', 'Booked', 'Under Maintenance'))");
    
    // Set default value
    await pool.query("ALTER TABLE room ALTER COLUMN status SET DEFAULT 'Available'");

    console.log('Database updated successfully with ENUM constraints!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

updateDb();
