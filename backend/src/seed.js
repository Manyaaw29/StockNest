const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'Stocknest',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

async function seed() {
  try {
    console.log('🔄 Checking database content...');
    
    // Check if organization exists, if not create one
    let orgId = 1;
    const orgs = await pool.query('SELECT org_id FROM organization LIMIT 1');
    if (orgs.rows.length === 0) {
      const res = await pool.query(
        "INSERT INTO organization (name, subscription_tier) VALUES ('StockNest HQ', 'Premium') RETURNING org_id"
      );
      orgId = res.rows[0].org_id;
      console.log('🌱 Created Organization with ID:', orgId);
    } else {
      orgId = orgs.rows[0].org_id;
      console.log('ℹ️ Found existing Organization ID:', orgId);
    }

    // Insert rooms/spaces
    const rooms = await pool.query('SELECT room_id FROM room LIMIT 1');
    if (rooms.rows.length === 0) {
      console.log('🌱 Seeding rooms...');
      const roomsToInsert = [
        { name: 'Meeting Room A', type: 'Meeting Room', floor: '1', capacity: 10 },
        { name: 'Executive Cabin B', type: 'Executive Cabin', floor: '2', capacity: 2 },
        { name: 'Conference Room C', type: 'Conference Room', floor: '1', capacity: 25 },
        { name: 'Co-work Space 1', type: 'Co-work Space', floor: '1', capacity: 100 },
        { name: 'Interview Room D', type: 'Interview Room', floor: '3', capacity: 4 }
      ];

      for (const r of roomsToInsert) {
        await pool.query(
          `INSERT INTO room (org_id, room_name, capacity, type, floor, status, utilization_pct, assigned_assets) 
           VALUES ($1, $2, $3, $4, $5, 'Available', 0, '[]'::jsonb)`,
          [orgId, r.name, r.capacity, r.type, r.floor]
        );
      }
      console.log('✅ Rooms seeded successfully.');
    } else {
      console.log('ℹ️ Rooms table already has records.');
    }

    // Insert inventory
    const inventory = await pool.query('SELECT inventory_id FROM inventory LIMIT 1');
    if (inventory.rows.length === 0) {
      console.log('🌱 Seeding inventory items...');
      const itemsToInsert = [
        { name: 'Coffee Mugs', sku: 'CM-101', category: 'Kitchen', unit: 'Pcs', stock: 45, reorder: 10, status: 'In Stock' },
        { name: 'A4 Printing Paper', sku: 'AP-202', category: 'Stationery', unit: 'Boxes', stock: 150, reorder: 20, status: 'In Stock' },
        { name: 'Whiteboard Markers', sku: 'WM-303', category: 'Office', unit: 'Pcs', stock: 5, reorder: 8, status: 'Low Stock' },
        { name: 'Cleaning Detergent', sku: 'CD-404', category: 'Housekeeping', unit: 'Liters', stock: 25, reorder: 5, status: 'In Stock' }
      ];

      for (const item of itemsToInsert) {
        await pool.query(
          `INSERT INTO inventory (org_id, sku, item_name, category, unit, current_stock, reorder_point, status, consumption_history) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, '[]'::jsonb)`,
          [orgId, item.sku, item.name, item.category, item.unit, item.stock, item.reorder, item.status]
        );
      }
      console.log('✅ Inventory seeded successfully.');
    } else {
      console.log('ℹ️ Inventory table already has records.');
    }

    console.log('🎉 Database seeding complete!');
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    await pool.end();
    process.exit(1);
  }
}

seed();
