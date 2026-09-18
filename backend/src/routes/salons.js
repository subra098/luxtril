const express = require('express');
const router = express.Router();
const salonController = require('../controllers/salonController');
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/', salonController.getAllSalons);
router.get('/my-salon', authenticate, salonController.getMySalon);
router.post('/', authenticate, upload.any(), salonController.createSalon);
router.put('/my-salon', authenticate, upload.any(), salonController.updateMySalon);
router.put('/slot-config', authenticate, salonController.updateSlotConfig);
router.put('/working-hours', authenticate, salonController.updateWorkingHours);
router.get('/:salonId', salonController.getSalonById);
router.get('/:salonId/available-slots', salonController.getAvailableSlots);

module.exports = router;
