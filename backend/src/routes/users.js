const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/profile', authenticate, userController.getProfile);
router.put('/profile', authenticate, upload.single('profileImage'), userController.updateProfile);

module.exports = router;
