const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { authenticate } = require('../middleware/auth');

router.post('/', authenticate, bookingController.createBooking);
router.get('/my-bookings', authenticate, bookingController.getMyBookings);
router.get('/salon-bookings', authenticate, bookingController.getSalonBookings);
router.get('/:bookingId', authenticate, bookingController.getBookingById);
router.put('/:bookingId/status', authenticate, bookingController.updateBookingStatus);
router.put('/:bookingId/cancel', authenticate, bookingController.cancelBooking);

module.exports = router;
