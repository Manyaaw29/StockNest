const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123456',
};

async function runSetup() {
  const targetDb = process.env.DB_NAME || 'Stocknest';

  console.log('🔄 Connecting to PostgreSQL with config:', {
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    database: targetDb,
  });

  const adminClient = new Client({
    ...dbConfig,
    database: 'postgres',
  });

  try {
    await adminClient.connect();
    console.log('✅ Connected to default PostgreSQL database.');

    const dbExistsResult = await adminClient.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [targetDb]
    );

    if (dbExistsResult.rowCount === 0) {
      console.log(`🔨 Creating database "${targetDb}"...`);
      await adminClient.query(`CREATE DATABASE "${targetDb}"`);
      console.log(`✅ Database "${targetDb}" created successfully.`);
    } else {
      console.log(`ℹ️ Database "${targetDb}" already exists. Using it.`);
    }
  } catch (err) {
    console.error('❌ Error checking/creating database:', err.message);
    process.exit(1);
  } finally {
    await adminClient.end();
  }

  const dbClient = new Client({
    ...dbConfig,
    database: targetDb,
  });

  try {
    await dbClient.connect();
    console.log(`🔄 Connected to database "${targetDb}".`);

    const schemaCheck = await dbClient.query(`
      SELECT to_regclass('public.organization') AS organization_table,
             to_regclass('public.users') AS users_table;
    `);

    const hasSchema = schemaCheck.rows[0].organization_table && schemaCheck.rows[0].users_table;

    if (!hasSchema) {
      const schemaPath = path.join(__dirname, '../sql/schema.sql');
      const sql = fs.readFileSync(schemaPath, 'utf8');

      console.log('🔨 Executing schema.sql queries...');
      await dbClient.query(sql);
      console.log('✅ Database tables and schema set up successfully!');
    } else {
      console.log('ℹ️ Schema already exists. Skipping initialization.');
    }

    console.log('🌱 Ensuring seed data exists...');

    const orgRes = await dbClient.query(
      `SELECT org_id FROM organization ORDER BY org_id LIMIT 1`
    );
    let orgId;

    if (orgRes.rows.length === 0) {
      const insertOrg = await dbClient.query(
        `INSERT INTO organization (name, subscription_tier)
         VALUES ($1, $2)
         RETURNING org_id`,
        ['StockNest HQ', 'Premium']
      );
      orgId = insertOrg.rows[0].org_id;
    } else {
      orgId = orgRes.rows[0].org_id;
    }

    const adminUser = await dbClient.query(
      `SELECT user_id FROM users WHERE email = $1`,
      ['admin@stocknest.com']
    );

    if (adminUser.rows.length === 0) {
      const passwordHash = await bcrypt.hash('admin123', 10);
      await dbClient.query(
        `INSERT INTO users (org_id, email, password_hash, name, role)
         VALUES ($1, $2, $3, $4, $5)`,
        [orgId, 'admin@stocknest.com', passwordHash, 'Admin User', 'Admin']
      );
      console.log('✅ Created default administrator:');
      console.log('   - Email: admin@stocknest.com');
      console.log('   - Password: admin123');
    } else {
      console.log('ℹ️ Default administrator already exists.');
    }
  } catch (err) {
    console.error('❌ Error setting up database:', err.message);
  } finally {
    await dbClient.end();
  }
}

runSetup();
