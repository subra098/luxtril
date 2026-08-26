const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authenticate } = require('../middleware/auth');

router.get('/earnings', authenticate, analyticsController.getEarnings);
router.get('/booking-stats', authenticate, analyticsController.getBookingStats);

module.exports = router;
