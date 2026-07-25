const pool = require('./src/config/db');
pool.query("UPDATE room SET status = 'Available' WHERE room_id = 32").then(r => {
  console.log('Fixed Focus Pod 8');
  process.exit(0);
}).catch(e => {
  console.error(e);
  process.exit(1);
});
