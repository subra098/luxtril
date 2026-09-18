const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'luxtril',
  user: 'postgres',
  password: 'subra@09',
});

async function run() {
  try {
    const res = await pool.query('SELECT email, password, is_active FROM users LIMIT 5;');
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

run();
