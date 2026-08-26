const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/salon/:salonId', serviceController.getSalonServices);
router.get('/my-services', authenticate, serviceController.getMyServices);
router.post('/', authenticate, upload.single('image'), serviceController.createService);
router.put('/:serviceId', authenticate, upload.single('image'), serviceController.updateService);
router.delete('/:serviceId', authenticate, serviceController.deleteService);

module.exports = router;
