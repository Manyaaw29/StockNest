const pool = require('./src/config/db'); 

async function updateRooms() {
  await pool.query('ALTER TABLE room ADD COLUMN IF NOT EXISTS capacity INT DEFAULT 4');
  const rooms = await pool.query('SELECT room_id, category FROM room');
  for (let r of rooms.rows) {
    let capacity = 4;
    if (r.category === 'Executive Boardroom') capacity = 12;
    if (r.category === 'Meeting Room') capacity = 8;
    if (r.category === 'Conference Hall') capacity = 50;
    if (r.category === 'Hot Desk Area') capacity = 1;
    if (r.category === 'Focus Pod') capacity = 2;
    if (r.category === 'Private Cabin') capacity = 4;

    const floors = ['Ground Floor', '1st Floor', '2nd Floor, East Wing', '2nd Floor, West Wing'];
    const randomFloor = floors[Math.floor(Math.random() * floors.length)];
    
    await pool.query('UPDATE room SET capacity = $1, floor = $2 WHERE room_id = $3', [capacity, randomFloor, r.room_id]);
  }
  console.log('Done updating rooms');
  process.exit(0);
}

updateRooms();
