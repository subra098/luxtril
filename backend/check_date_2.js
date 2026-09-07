const { Pool } = require('pg'); 
const pool = new Pool({ user: 'postgres', host: 'localhost', database: 'luxtril', password: 'subra@09', port: 5432 }); 
const todayUTC = new Date().toISOString().split('T')[0]; 
console.log('todayUTC:', todayUTC);
pool.query("SELECT COALESCE(SUM(total_amount) FILTER (WHERE booking_date::text = $1 AND status IN ('completed', 'confirmed', 'accepted')), 0) as today_revenue FROM bookings", [todayUTC])
.then(res => { console.log(res.rows); pool.end(); }).catch(console.error);
