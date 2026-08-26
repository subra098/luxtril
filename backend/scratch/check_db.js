const pool = require('../src/config/db');

async function checkColumns() {
  try {
    const res = await pool.query(
      `SELECT column_name, data_type, is_nullable 
       FROM information_schema.columns 
       WHERE table_name = 'salons'`
    );
    console.log('Columns of salons:', res.rows);
    
    const salonRes = await pool.query('SELECT * FROM salons');
    console.log('Existing salons in DB:', salonRes.rows);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
checkColumns();
