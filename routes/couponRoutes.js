const express = require('express');
const { getAllCoupons, getCouponById,getCouponByRestaurant,createCoupon,  updateCoupon, deleteCoupon, applyCoupon } = require('../controllers/couponController');
const { uploadImage } = require('../utils/uploadFile');
const { authenticateJWT, authenticateAndAuthorize } = require('../middleware/authenticateJWT');

const router = express.Router();

// Route for getting all coupons
router.post('/get-all-coupons', authenticateJWT, getAllCoupons);

// Route for getting a single coupon by ID
router.post('/get-coupon-by-id/:id', authenticateJWT, getCouponById);

// Route for getting a single coupon by ID
router.post('/get-coupon-by-restaurant', authenticateJWT, getCouponByRestaurant);

// Route for creating a new coupon
router.post('/add-coupon',authenticateAndAuthorize('admin'), uploadImage.fields([
    { name: 'image', maxCount: 1 },
]), createCoupon);

// Route for updating a coupon
router.put('/edit-coupon/:id',authenticateAndAuthorize('admin'),
uploadImage.fields([
    { name: 'image', maxCount: 1 },
]), updateCoupon);

// Route for deleting a coupon
router.delete('/delete-coupon/:id',authenticateAndAuthorize('admin'), deleteCoupon);
router.post('/apply-coupon',authenticateAndAuthorize('user'), applyCoupon);

module.exports = router;
