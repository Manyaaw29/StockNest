const pool = require('./src/config/db');

async function seed() {
  try {
    console.log('Altering client table to add status and notes...');
    try {
        await pool.query(`ALTER TABLE client ADD COLUMN status VARCHAR(50) DEFAULT 'Active';`);
        await pool.query(`ALTER TABLE client ADD COLUMN notes TEXT;`);
    } catch(e) {
        // Ignore if columns already exist
    }

    console.log('Inserting dummy clients...');
    const clients = [
      { org_id: 1, name: 'Acme Corp Events', email: 'events@acme.com', phone: '+1-555-0100', company: 'Acme Corp', status: 'Active', notes: 'VIP client, always books the Grand Boardroom.' },
      { org_id: 1, name: 'Sarah Jenkins', email: 'sarah.j@globex.net', phone: '+1-555-0199', company: 'Globex Inc', status: 'Active', notes: 'Prefers morning bookings.' },
      { org_id: 1, name: 'Tech Innovators LLC', email: 'booking@techinnovators.com', phone: '+1-555-0245', company: 'Tech Innovators', status: 'Inactive', notes: 'Has not booked since 2024.' },
      { org_id: 1, name: 'Marcus Wong', email: 'mwong@startup.io', phone: '+1-555-0331', company: 'Startup.io', status: 'Active', notes: 'Frequent booker for weekend seminars.' },
      { org_id: 1, name: 'Stark Industries', email: 'pr@stark.com', phone: '+1-555-8888', company: 'Stark Industries', status: 'Active', notes: 'High security requirements.' }
    ];

    for (const c of clients) {
      await pool.query(
        `INSERT INTO client (org_id, name, email, phone, company, status, notes) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [c.org_id, c.name, c.email, c.phone, c.company, c.status, c.notes]
      );
    }
    console.log('Dummy clients seeded successfully.');
  } catch (err) {
    console.error('Seeding failed:', err.message);
  } finally {
    pool.end();
  }
}
seed();
