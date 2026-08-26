const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authController = require('../controllers/authController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate, authorize('admin'));

router.get('/dashboard', adminController.getDashboard);
router.get('/users', adminController.getUsers);
router.put('/users/:userId/status', adminController.updateUserStatus);
router.get('/salons', adminController.getAdminSalons);
router.put('/salons/:salonId/approve', adminController.approveSalon);
router.put('/salons/:salonId/status', adminController.updateSalonStatus);
router.get('/bookings', adminController.getAdminBookings);
router.get('/revenue', adminController.getRevenueAnalytics);

module.exports = router;
