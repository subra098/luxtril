const express = require('express');
const router = express.Router();
const salonController = require('../controllers/salonController');

router.get('/nearby', salonController.getNearbySalons);
router.get('/search', salonController.searchSalons);

module.exports = router;
