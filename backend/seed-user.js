const bcrypt = require('bcryptjs');
const pool = require('./src/config/db');

const users = [
  { name: 'Admin User', email: 'admin@stocknest.com', password: 'password123', role: 'Admin' },
  { name: 'Anshika', email: 'anshikasehgal00@gmail.com', password: 'Anshika123', role: 'Admin' },
  { name: 'Angad', email: 'angad@stocknest.com', password: 'Angad123', role: 'Manager' },
  { name: 'Aashish', email: 'aashish@stocknest.com', password: 'Aashish123', role: 'Manager' },
  { name: 'Neha', email: 'neha@stocknest.com', password: 'Neha123', role: 'Staff' },
  { name: 'Tanmay', email: 'tanmay@stocknest.com', password: 'Tanmay123', role: 'Admin' },
  { name: 'Samaira', email: 'samaira@stocknest.com', password: 'Samaira123', role: 'Manager' },
  { name: 'Manya', email: 'manya@stocknest.com', password: 'Manya123', role: 'Manager' },
  { name: 'Anya', email: 'anya@stocknest.com', password: 'Anya123', role: 'Admin' },
  { name: 'Prashast', email: 'prashast@stocknest.com', password: 'Prashast123', role: 'Admin' },
  { name: 'Nikhil', email: 'nikhil@stocknest.com', password: 'Nikhil123', role: 'Manager' }
];

async function seedUsers() {
  try {
    console.log('Starting to seed users...');
    
    for (const user of users) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      
      try {
        await pool.query(
          'INSERT INTO users (org_id, email, password_hash, name, role) VALUES ($1, $2, $3, $4, $5)',
          [1, user.email, hashedPassword, user.name, user.role]
        );
        console.log(`✅ Created user: ${user.email}`);
      } catch (err) {
        if (err.code === '23505') {
          console.log(`⚠️  User already exists: ${user.email}`);
        } else {
          throw err;
        }
      }
    }
    
    console.log('\n✅ All users seeded successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding users:', err.message);
    process.exit(1);
  }
}

seedUsers();