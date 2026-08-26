const http = require('http');

const data = JSON.stringify({
  email: 'owner@luxtril.com',
  password: 'owner123'
});

const req = http.request({
  hostname: 'localhost',
  port: 5000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
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
