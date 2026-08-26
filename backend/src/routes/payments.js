const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticate } = require('../middleware/auth');

router.post('/create-order', authenticate, paymentController.createOrder);
router.post('/verify', authenticate, paymentController.verifyPayment);
router.post('/failure', authenticate, paymentController.handlePaymentFailure);
router.get('/history', authenticate, paymentController.getPaymentHistory);

module.exports = router;
