const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', authenticate, authController.getMe);
router.put('/update-password', authenticate, authController.updatePassword);
router.post('/forgot-password', authController.forgotPassword);
router.put('/reset-password/:resetToken', authController.resetPassword);

module.exports = router;
