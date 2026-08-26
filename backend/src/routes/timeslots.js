const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');

router.get('/available', bookingController.getAvailableTimeSlots);

module.exports = router;
