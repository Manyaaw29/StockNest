const pool = require('./src/config/db');

async function seedData() {
  try {
    console.log('🌱 Starting to seed application data...');

    // 1. Clear old data from children tables first to avoid foreign key conflicts
    console.log('🧹 Clearing existing rooms, bookings, assets, inventory, and maintenance...');
    await pool.query('TRUNCATE TABLE booking, maintenance, asset, inventory, room RESTART IDENTITY CASCADE');

    const orgId = 1; // StockNest HQ

    // Get some valid user IDs for foreign keys
    const usersRes = await pool.query('SELECT user_id FROM users LIMIT 5');
    if (usersRes.rows.length === 0) {
      console.error('❌ No users found in the database. Please run seed-user.js first!');
      process.exit(1);
    }
    const userIds = usersRes.rows.map(u => u.user_id);
    const primaryUser = userIds[0];
    const secondaryUser = userIds[1] || primaryUser;

    // 2. Seed Rooms
    console.log('🚪 Seeding rooms...');
    const roomInserts = [
      // 2nd Floor - East Wing (8)
      ['Executive Boardroom 1', 15, 'Executive Boardroom', 'East Wing - 2nd Floor', '["TV", "Video Conference"]', 'Available'],
      ['Executive Boardroom 2', 15, 'Executive Boardroom', 'East Wing - 2nd Floor', '["TV", "Video Conference"]', 'Available'],
      ['Conference Hall Alpha', 25, 'Conference Hall', 'East Wing - 2nd Floor', '["Sound System", "Stage", "Projector"]', 'Available'],
      ['Private Cabin 101', 3, 'Private Cabin', 'East Wing - 2nd Floor', '["Executive Desk", "Whiteboard"]', 'Available'],
      ['Private Cabin 102', 3, 'Private Cabin', 'East Wing - 2nd Floor', '["Executive Desk", "Whiteboard"]', 'Available'],
      ['Private Cabin 103', 2, 'Private Cabin', 'East Wing - 2nd Floor', '["Executive Desk"]', 'Available'],
      ['Focus Pod 1', 2, 'Focus Pod', 'East Wing - 2nd Floor', '["Acoustic Panels"]', 'Available'],
      ['Focus Pod 2', 2, 'Focus Pod', 'East Wing - 2nd Floor', '["Acoustic Panels"]', 'Available'],
      
      // 2nd Floor - West Wing (8)
      ['Executive Boardroom 3', 20, 'Executive Boardroom', 'West Wing - 2nd Floor', '["TV", "Video Conference"]', 'Available'],
      ['Executive Boardroom 4', 20, 'Executive Boardroom', 'West Wing - 2nd Floor', '["TV", "Video Conference", "Whiteboard"]', 'Available'],
      ['Conference Hall Beta', 30, 'Conference Hall', 'West Wing - 2nd Floor', '["Sound System", "Projector"]', 'Available'],
      ['Private Cabin 104', 2, 'Private Cabin', 'West Wing - 2nd Floor', '["Executive Desk"]', 'Available'],
      ['Private Cabin 105', 4, 'Private Cabin', 'West Wing - 2nd Floor', '["Executive Desk", "Whiteboard"]', 'Available'],
      ['Private Cabin 106', 4, 'Private Cabin', 'West Wing - 2nd Floor', '["Executive Desk", "Whiteboard"]', 'Available'],
      ['Focus Pod 3', 2, 'Focus Pod', 'West Wing - 2nd Floor', '["Acoustic Panels"]', 'Available'],
      ['Focus Pod 4', 2, 'Focus Pod', 'West Wing - 2nd Floor', '["Acoustic Panels"]', 'Available'],

      // 1st Floor - East Wing (8)
      ['Meeting Room A', 8, 'Meeting Room', 'East Wing - 1st Floor', '["Whiteboard", "Projector"]', 'Available'],
      ['Meeting Room B', 8, 'Meeting Room', 'East Wing - 1st Floor', '["Whiteboard", "Projector"]', 'Available'],
      ['Meeting Room C', 6, 'Meeting Room', 'East Wing - 1st Floor', '["Whiteboard"]', 'Available'],
      ['Meeting Room D', 6, 'Meeting Room', 'East Wing - 1st Floor', '["Whiteboard"]', 'Available'],
      ['Hot Desk Zone North', 1, 'Hot Desk Area', 'East Wing - 1st Floor', '["Power Outlet", "Monitor"]', 'Available'],
      ['Hot Desk Zone South', 1, 'Hot Desk Area', 'East Wing - 1st Floor', '["Power Outlet", "Monitor"]', 'Available'],
      ['Focus Pod 5', 2, 'Focus Pod', 'East Wing - 1st Floor', '["Acoustic Panels"]', 'Available'],
      ['Focus Pod 6', 2, 'Focus Pod', 'East Wing - 1st Floor', '["Acoustic Panels"]', 'Available'],
      
      // 1st Floor - West Wing (8)
      ['Meeting Room E', 10, 'Meeting Room', 'West Wing - 1st Floor', '["Whiteboard", "TV"]', 'Available'],
      ['Meeting Room F', 10, 'Meeting Room', 'West Wing - 1st Floor', '["Whiteboard", "TV"]', 'Available'],
      ['Meeting Room G', 6, 'Meeting Room', 'West Wing - 1st Floor', '["Whiteboard"]', 'Available'],
      ['Meeting Room H', 6, 'Meeting Room', 'West Wing - 1st Floor', '["Whiteboard"]', 'Available'],
      ['Hot Desk Zone East', 1, 'Hot Desk Area', 'West Wing - 1st Floor', '["Power Outlet"]', 'Available'],
      ['Hot Desk Zone West', 1, 'Hot Desk Area', 'West Wing - 1st Floor', '["Power Outlet"]', 'Available'],
      ['Focus Pod 7', 2, 'Focus Pod', 'West Wing - 1st Floor', '["Acoustic Panels"]', 'Available'],
      ['Focus Pod 8', 2, 'Focus Pod', 'West Wing - 1st Floor', '["Acoustic Panels"]', 'Under Maintenance']
    ];

    const roomIds = [];
    for (const room of roomInserts) {
      const res = await pool.query(
        `INSERT INTO room (org_id, room_name, capacity, category, floor, amenities, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING room_id`,
        [orgId, room[0], room[1], room[2], room[3], room[4], room[5]]
      );
      roomIds.push(res.rows[0].room_id);
    }
    console.log(`✅ Seeded ${roomIds.length} rooms.`);

    // 3. Seed Bookings
    console.log('📅 Seeding bookings...');
    const bookings = [];

    for (const b of bookings) {
      await pool.query(
        `INSERT INTO booking (user_id, room_id, booking_date, start_time, end_time, attendees, status)
         VALUES ($1, $2, ${b[2]}, $3, $4, $5, $6)`,
        [b[0], b[1], b[3], b[4], b[5], b[6]]
      );
    }
    console.log('✅ Seeded bookings.');

    // 4. Seed Assets
    console.log('💻 Seeding assets...');
    const assets = [
      ['Dell UltraSharp 27" Monitor', 95, 350.00, '[]', '2026-05-10', 'Active'],
      ['Ergonomic Office Chair', 80, 250.00, '[]', '2026-06-15', 'Active'],
      ['Logitech Rally Plus Camera', 45, 1200.00, '[]', '2026-04-20', 'Damaged'],
      ['Smartboard interactive screen', 90, 2500.00, '[]', '2026-07-01', 'Active'],
      ['Water Dispenser Lounge', 30, 150.00, '[]', '2026-02-14', 'In-Maintenance'],
    ];

    const assetIds = [];
    for (const a of assets) {
      const res = await pool.query(
        `INSERT INTO asset (org_id, name, condition_level, current_value, service_history, last_service_date, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING asset_id`,
        [orgId, a[0], a[1], a[2], a[3], a[4], a[5]]
      );
      assetIds.push(res.rows[0].asset_id);
    }
    console.log(`✅ Seeded ${assetIds.length} assets.`);

    // 5. Seed Inventory
    console.log('📦 Seeding inventory...');
    const inventoryItems = [
      ['ST-PPR-A4', 'A4 Printing Paper', 'Office Supplies', 'Reams', 120, 20, 15, '[]', 'In Stock', 'supplies@copier.com'],
      ['ST-MKR-BLK', 'Dry Erase Markers (Black)', 'Office Supplies', 'Box of 12', 3, 5, 8, '[]', 'Low Stock', 'stationery@office.com'],
      ['ST-COF-DRK', 'Dark Roast Coffee Beans', 'Pantry', 'Bags (1kg)', 15, 5, 25, '[]', 'In Stock', 'java@roasters.com'],
      ['ST-MUG-CER', 'Ceramic Mugs', 'Pantry', 'Units', 0, 10, 2, '[]', 'Out of Stock', 'mugs@ceramics.com'],
      ['ST-CBL-HDMI', 'HDMI Cable 3m', 'IT Infrastructure', 'Units', 2, 5, 1, '[]', 'Low Stock', 'cables@tech.com'],
    ];

    const inventoryIds = [];
    for (const item of inventoryItems) {
      const res = await pool.query(
        `INSERT INTO inventory (org_id, sku, item_name, category, unit, current_stock, reorder_point, monthly_consumption, consumption_history, status, supplier_email)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING inventory_id`,
        [orgId, item[0], item[1], item[2], item[3], item[4], item[5], item[6], item[7], item[8], item[9]]
      );
      inventoryIds.push(res.rows[0].inventory_id);
    }
    console.log('✅ Seeded inventory items.');

    // 6. Seed Maintenance
    console.log('🔧 Seeding maintenance tickets...');
    const tickets = [
      [inventoryIds[0], null, primaryUser, 'Pending', 'High', 150.00, 'CURRENT_DATE + 3'],
      [inventoryIds[1], null, secondaryUser, 'In Progress', 'Medium', 50.00, 'CURRENT_DATE + 5'],
      [null, roomIds[4], primaryUser, 'Pending', 'Medium', 0.00, 'CURRENT_DATE + 7'],
    ];

    for (const t of tickets) {
      await pool.query(
        `INSERT INTO maintenance (inventory_id, room_id, assigned_to, status, priority, cost, deadline)
         VALUES ($1, $2, $3, $4, $5, $6, ${t[6]})`,
        [t[0], t[1], t[2], t[3], t[4], t[5]]
      );
    }
    console.log('✅ Seeded maintenance tickets.');

    console.log('\n🎉 Database population successfully completed!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding data:', err.message);
    process.exit(1);
  }
}

seedData();
