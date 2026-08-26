const salonController = require('../src/controllers/salonController');

// Mock request and response
const req = {
  user: { id: '44bc2782-72a8-4ffa-8508-f797c9a6cc25' }, // owner user id from seed
  body: {
    name: 'Premium Cuts Edit',
    phone: '8888888888',
    images: '["/uploads/placeholder.jpg"]'
  },
  files: [
    {
      fieldname: 'logo',
      filename: 'fake-logo.jpg',
      originalname: 'logo.jpg',
      path: 'uploads/fake-logo.jpg'
    }
  ]
};

const res = {
  status: function(code) {
    this.statusCode = code;
    return this;
  },
  json: function(data) {
    console.log('JSON RESPONSE:', data);
  }
};

salonController.updateMySalon(req, res);
