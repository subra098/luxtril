const http = require('http');

const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';

const addressJSON = JSON.stringify({
  street: 'Main Street New 2',
  city: 'Chandan New 2',
  state: 'Odisha New 2',
  pincode: '756114'
});

const parts = [
  `--${boundary}\r\nContent-Disposition: form-data; name="name"\r\n\r\nPremium Cuts Edit Multipart 2\r\n`,
  `--${boundary}\r\nContent-Disposition: form-data; name="phone"\r\n\r\n8888888888\r\n`,
  `--${boundary}\r\nContent-Disposition: form-data; name="address"\r\n\r\n${addressJSON}\r\n`,
  `--${boundary}\r\nContent-Disposition: form-data; name="images"\r\n\r\n[]\r\n`, // Empty existing images
  `--${boundary}\r\nContent-Disposition: form-data; name="logo"; filename="logo2.jpg"\r\nContent-Type: image/jpeg\r\n\r\nfakeimagecontent\r\n`,
  `--${boundary}--\r\n`
];

const body = Buffer.concat(parts.map(p => Buffer.from(p)));

const req = http.request({
  hostname: 'localhost',
  port: 5000,
  path: '/api/salons/my-salon',
  method: 'PUT',
  headers: {
    'Content-Type': `multipart/form-data; boundary=${boundary}`,
    'Content-Length': body.length,
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjQ0YmMyNzgyLTcyYTgtNGZmYS04NTA4LWY3OTdjOWE2Y2MyNSIsInJvbGUiOiJzYWxvbl9vd25lciIsImlhdCI6MTc4Nzc2MTA3NSwiZXhwIjoxNzkwMzUzMDc1fQ.b_4gtQeOtl30EEWojQTgg6qFcENhe9H4KEcSFjq-NB4'
  }
}, res => {
  let resBody = '';
  res.on('data', chunk => resBody += chunk);
  res.on('end', () => {
    console.log('STATUS:', res.statusCode);
    console.log('BODY:', resBody);
  });
});

req.on('error', e => {
  console.error('Request error:', e);
});

req.write(body);
req.end();
