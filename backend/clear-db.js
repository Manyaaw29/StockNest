const { Client } = require('pg');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'Stocknest'
};

async function clearDatabase() {
    const client = new Client(dbConfig);
    try {
        await client.connect();
        console.log('Connected to DB. Dropping public schema...');
        await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
        console.log('✅ All tables and data completely removed.');
    } catch (err) {
        console.error('❌ Error clearing database:', err);
    } finally {
        await client.end();
    }
}

clearDatabase();
