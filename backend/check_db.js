const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'luxtril',
  password: 'subra@09',
  port: 5432,
});

async function query() {
  try {
    const res = await pool.query('SELECT id, name, is_approved, is_active, address_city FROM salons');
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

query();
