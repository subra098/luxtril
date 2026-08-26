const http = require('http');

const data = JSON.stringify({
  name: 'Premium Cuts Salon Edit',
  description: 'Updated description',
  phone: '8888888888',
  email: 'owner@luxtril.com',
  is_active: true
});

const req = http.request({
  hostname: 'localhost',
  port: 5000,
  path: '/api/salons/my-salon',
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjQ0YmMyNzgyLTcyYTgtNGZmYS04NTA4LWY3OTdjOWE2Y2MyNSIsInJvbGUiOiJzYWxvbl9vd25lciIsImlhdCI6MTc4Nzc2MTA3NSwiZXhwIjoxNzkwMzUzMDc1fQ.b_4gtQeOtl30EEWojQTgg6qFcENhe9H4KEcSFjq-NB4' // Use the owner token we got earlier
  }
}, res => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('STATUS:', res.statusCode);
    console.log('BODY:', body);
  });
});

req.on('error', e => {
  console.error('Request error:', e);
});

req.write(data);
req.end();
