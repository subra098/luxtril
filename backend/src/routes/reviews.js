const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { authenticate } = require('../middleware/auth');

router.post('/', authenticate, reviewController.createReview);
router.get('/salon/:salonId', reviewController.getSalonReviews);
router.get('/my-reviews', authenticate, reviewController.getMyReviews);
router.post('/:reviewId/respond', authenticate, reviewController.respondToReview);

module.exports = router;
