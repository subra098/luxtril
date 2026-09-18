const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staffController');
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.post('/', authenticate, upload.single('profileImage'), staffController.createStaff);
router.get('/my-staff', authenticate, staffController.getMyStaff);
router.get('/salon/:salonId', staffController.getSalonStaff);
router.get('/available-for-slot', staffController.getAvailableStaffForSlot);
router.get('/:staffId/services', staffController.getStaffServices);
router.put('/:staffId', authenticate, upload.single('profileImage'), staffController.updateStaff);
router.delete('/:staffId', authenticate, staffController.deleteStaff);

module.exports = router;
