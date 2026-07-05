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
  console.log('🔄 Connecting to PostgreSQL with config:', {
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
  });

  // Step 1: Connect to default 'postgres' database to create the new database
  const client = new Client({
    ...dbConfig,
    database: 'postgres',
  });

  try {
    await client.connect();
    console.log('✅ Connected to default PostgreSQL database.');
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
    console.log('\n💡 Please check if your PostgreSQL password is correct in the backend/.env file (DB_PASSWORD).');
    process.exit(1);
  }

  const targetDb = process.env.DB_NAME || 'Stocknest';

  try {
    // Drop database if it exists to ensure a clean install
    console.log(`🧹 Dropping existing database "${targetDb}" if it exists...`);
    await client.query(`DROP DATABASE IF EXISTS "${targetDb}"`);

    console.log(`🔨 Creating database "${targetDb}"...`);
    await client.query(`CREATE DATABASE "${targetDb}"`);
    console.log(`✅ Database "${targetDb}" created successfully.`);
  } catch (err) {
    console.error('❌ Error checking/creating database:', err.message);
    await client.end();
    process.exit(1);
  }

  await client.end();

  // Step 2: Connect to the newly created database and run the schema
  console.log(`🔄 Connecting to database "${targetDb}" to run schema...`);
  const dbClient = new Client({
    ...dbConfig,
    database: targetDb,
  });

  try {
    await dbClient.connect();
    
    // Read schema.sql
    const schemaPath = path.join(__dirname, '../sql/schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('🔨 Executing schema.sql queries...');
    await dbClient.query(sql);
    console.log('✅ Database tables and schema set up successfully!');

    console.log('🌱 Seeding database with initial data...');
    // Insert organization
    const orgRes = await dbClient.query(
      `INSERT INTO organization (name, subscription_tier) 
       VALUES ('StockNest HQ', 'Premium') 
       RETURNING org_id`
    );
    const orgId = orgRes.rows[0].org_id;

    // Hash password for default admin
    const passwordHash = await bcrypt.hash('admin123', 10);
    
    // Insert admin user
    await dbClient.query(
      `INSERT INTO users (org_id, email, password_hash, name, role) 
       VALUES ($1, 'admin@stocknest.com', $2, 'Admin User', 'Admin')`,
      [orgId, passwordHash]
    );
    console.log('✅ Created default administrator:');
    console.log('   - Email: admin@stocknest.com');
    console.log('   - Password: admin123');
  } catch (err) {
    console.error('❌ Error setting up database:', err.message);
  } finally {
    await dbClient.end();
  }
}

runSetup();
