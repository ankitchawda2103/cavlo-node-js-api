const express = require('express');
const router = express.Router();
const { addToCart, removeFromCart, getCart } = require('../controllers/cartController');
const { authenticateAndAuthorize } = require('../middleware/authenticateJWT');

router.post('/add-to-cart', authenticateAndAuthorize('user'), addToCart);
router.post('/remove-from-cart', authenticateAndAuthorize('user'), removeFromCart);
router.get('/get-cart', authenticateAndAuthorize('user'), getCart);

module.exports = router;
