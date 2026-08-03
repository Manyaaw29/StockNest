const pool = require('./src/config/db');

async function seedAssets() {
  try {
    console.log('🌱 Starting to seed assets and transfer history...');

    const orgId = 1;

    const usersRes = await pool.query('SELECT user_id FROM users LIMIT 1');
    const adminUserId = usersRes.rows.length > 0 ? usersRes.rows[0].user_id : null;

    const roomsRes = await pool.query('SELECT room_id, capacity, room_name FROM room WHERE org_id = $1', [orgId]);
    const rooms = roomsRes.rows;

    if (rooms.length === 0) {
      console.log('❌ No rooms found. Please seed rooms first.');
      process.exit(1);
    }

    console.log(`🧹 Clearing existing assets and transfer history...`);
    await pool.query('TRUNCATE TABLE asset CASCADE');

    const assetTypes = [
      { prefix: 'CH', desc: 'Ergonomic Office Chair', category: 'Furniture' },
      { prefix: 'DK', desc: 'Work Desk', category: 'Furniture' },
      { prefix: 'MN', desc: 'Dell 27" Monitor', category: 'Electronics' },
      { prefix: 'CM', desc: 'Logitech Camera', category: 'A/V Equipment' },
      { prefix: 'TV', desc: 'Samsung 65" TV', category: 'A/V Equipment' }
    ];

    let totalAssets = 0;
    const insertedAssets = [];

    // Seed assets based on capacity
    for (const room of rooms) {
      const { room_id, capacity, room_name } = room;
      
      const numChairs = Math.max(1, capacity);
      const numDesks = Math.max(1, capacity > 5 ? capacity / 2 : capacity);
      const numMonitors = Math.max(1, capacity > 5 ? capacity / 2 : 1);
      
      const toGenerate = [
        { type: assetTypes[0], count: Math.floor(numChairs) },
        { type: assetTypes[1], count: Math.floor(numDesks) },
        { type: assetTypes[2], count: Math.floor(numMonitors) },
      ];

      // Boardrooms and Conference halls get a TV and Camera
      if (room_name.includes('Boardroom') || room_name.includes('Conference')) {
        toGenerate.push({ type: assetTypes[3], count: 1 });
        toGenerate.push({ type: assetTypes[4], count: 1 });
      }

      for (const gen of toGenerate) {
        for (let i = 0; i < gen.count; i++) {
          totalAssets++;
          const assetName = `${gen.type.prefix}-${String(totalAssets).padStart(4, '0')} - ${gen.type.desc}`;
          
          const res = await pool.query(
            `INSERT INTO asset (org_id, room_id, name, category, condition_level, current_value, status)
             VALUES ($1, $2, $3, $4, 100, 250.00, 'Active') RETURNING asset_id`,
            [orgId, room_id, assetName, gen.type.category]
          );
          insertedAssets.push({ asset_id: res.rows[0].asset_id, room_id, name: assetName });
        }
      }
    }
    
    console.log(`✅ Seeded ${totalAssets} assets across ${rooms.length} rooms based on capacity.`);

    if (adminUserId && insertedAssets.length > 0) {
      console.log('📜 Generating mock transfer history...');
      
      for (let i = 0; i < 30; i++) {
        const asset = insertedAssets[Math.floor(Math.random() * insertedAssets.length)];
        let newRoom;
        do {
          newRoom = rooms[Math.floor(Math.random() * rooms.length)];
        } while (newRoom.room_id === asset.room_id);

        await pool.query(
          `INSERT INTO transfer_history (org_id, asset_id, from_room_id, to_room_id, initiated_by, reason, transfer_date)
           VALUES ($1, $2, $3, $4, $5, $6, NOW() - INTERVAL '${Math.floor(Math.random() * 30)} days')`,
          [orgId, asset.asset_id, asset.room_id, newRoom.room_id, adminUserId, 'Reallocation due to space constraints']
        );
        
        asset.room_id = newRoom.room_id;
        await pool.query('UPDATE asset SET room_id = $1 WHERE asset_id = $2', [newRoom.room_id, asset.asset_id]);
      }
      console.log('✅ Mock transfer history generated.');
    }

    console.log('\n🎉 Asset seeding successfully completed!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding assets:', err.message);
    process.exit(1);
  }
}

seedAssets();
