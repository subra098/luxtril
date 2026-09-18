const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'luxtril',
  user: 'postgres',
  password: 'subra@09'
});

async function run() {
  try {
    await pool.query("ALTER TABLE working_hours ADD COLUMN IF NOT EXISTS manual_slots TEXT[] DEFAULT '{}'");
    console.log("Migration successful");
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
run();
