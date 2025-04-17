const express = require('express');
const { addToWishlist, getWishlist, removeFromWishlist } = require('../controllers/wishlistController');
const { authenticateAndAuthorize } = require('../middleware/authenticateJWT');
const router = express.Router();

// Routes for restaurant wishlist
router.post('/add-wishlist',authenticateAndAuthorize('user'), addToWishlist);
router.post('/get-wishlist',authenticateAndAuthorize('user'), getWishlist);
router.post('/remove-wishlist',authenticateAndAuthorize('user'), removeFromWishlist);

module.exports = router;
