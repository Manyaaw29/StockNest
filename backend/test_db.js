const { Pool } = require('pg');
const pool = require('./src/config/db');

async function testDelete() {
  const id = 4;
  const existing = await pool.query(
    `SELECT m.*, r.org_id as room_org, i.org_id as inv_org 
     FROM maintenance m
     LEFT JOIN room r ON m.room_id = r.room_id
     LEFT JOIN inventory i ON m.inventory_id = i.inventory_id
     WHERE m.request_id = $1`,
    [id]
  );
  console.log("existing rows:", existing.rows);
  const row = existing.rows[0];
  console.log("belongsToOrg variables:", {
    room_org: row.room_org,
    inv_org: row.inv_org,
    req_user_org: 1
  });
  
  process.exit(0);
}
testDelete();
