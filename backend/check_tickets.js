const pool = require('./src/config/db');
pool.query("SELECT * FROM maintenance WHERE room_id = 32").then(r => {
  console.log(r.rows);
  process.exit(0);
}).catch(e => {
  console.error(e);
  process.exit(1);
});
