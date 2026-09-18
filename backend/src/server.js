const express = require('express');
const cors = require('cors');
const path = require('path');

require('dotenv').config();

const app = express();

app.use(cors());

// Middleware to recursively format PostgreSQL query rows for MongoDB and camelCase compatibility in frontend ddjf
function formatResponseObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(formatResponseObject);
  }
  
  const newObj = {};
  let hasAddress = false;
  let hasRating = false;
  const address = {};
  const rating = {};

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const val = formatResponseObject(obj[key]);
      newObj[key] = val;

      // Map snake_case to camelCase
      if (key.includes('_')) {
        const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
        newObj[camelKey] = val;
      }

      if (key.startsWith('address_')) {
        const subKey = key.replace('address_', '');
        address[subKey] = val;
        hasAddress = true;
      } else if (key.startsWith('rating_')) {
        const subKey = key.replace('rating_', '');
        if (subKey === 'average') {
          rating[subKey] = val !== null ? parseFloat(val) : 0.0;
        } else {
          rating[subKey] = val;
        }
        hasRating = true;
      }
    }
  }

  if (newObj.id !== undefined && newObj._id === undefined) {
    newObj._id = newObj.id;
  }

  if (hasAddress) {
    newObj.address = address;
  }
  if (hasRating) {
    newObj.rating = rating;
  }

  return newObj;
}

app.use((req, res, next) => {
  const originalJson = res.json;
  res.json = function (body) {
    if (body && typeof body === 'object') {
      body = formatResponseObject(body);
    }
    return originalJson.call(this, body);
  };
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/salons', require('./routes/salons'));
app.use('/api/services', require('./routes/services'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/staff', require('./routes/staff'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/users', require('./routes/users'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/nearby', require('./routes/nearby'));
app.use('/api/timeslots', require('./routes/timeslots'));
app.use('/api/admin', require('./routes/admin'));

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Luxtril API is running', timestamp: new Date().toISOString() });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Luxtril API server running on port ${PORT} (Bound to 0.0.0.0 for external access)`);
});

module.exports = app;
 
 
 
 
