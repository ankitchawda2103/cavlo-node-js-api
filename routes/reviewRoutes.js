const express = require('express');
const { getReviewsByRestaurant, addReview, deleteReview } = require('../controllers/reviewController');
const { authenticateAndAuthorize } = require('../middleware/authenticateJWT');

const router = express.Router();

// Get User Profile route
router.post('/get-review-by-restaurant', authenticateAndAuthorize('user'), getReviewsByRestaurant);
router.post('/add-review', authenticateAndAuthorize('user'), addReview);
router.delete('/delete-review/:id', authenticateAndAuthorize('user'), deleteReview);



module.exports = router;
