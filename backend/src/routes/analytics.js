const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authenticate } = require('../middleware/auth');

router.get('/earnings', authenticate, analyticsController.getEarnings);
router.get('/booking-stats', authenticate, analyticsController.getBookingStats);
router.get('/report-data', authenticate, analyticsController.getReportData);
router.get('/export-pdf', authenticate, analyticsController.exportPdf);

module.exports = router;
