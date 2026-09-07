const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'luxtril',
  user: 'postgres',
  password: 'subra@09'
});

const JWT_SECRET = 'luxtril_jwt_secret_key_2026';

async function test() {
  try {
    const result = await pool.query("SELECT id FROM users WHERE email = 'owner@luxtril.com'");
    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, role: 'salon_owner' }, JWT_SECRET, { expiresIn: '30d' });
    
    const axios = require('axios');
    const res = await axios.get('http://localhost:5000/api/analytics/export-pdf?token=' + token, { responseType: 'stream' });
    console.log('Status:', res.status);
    console.log('Content-Type:', res.headers['content-type']);
  } catch(e) {
    if (e.response) {
      console.error('Error status:', e.response.status);
      e.response.data.on('data', chunk => console.log(chunk.toString()));
    } else {
      console.error('Error:', e.message);
    }
  } finally {
    pool.end();
  }
}

test();
