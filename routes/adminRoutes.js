const express = require('express');
const { sendOtpToPhone, verifyOtp,addAdmin, getAllAdmin } = require('../controllers/adminController');
const { authenticateAndAuthorize } = require('../middleware/authenticateJWT');

const router = express.Router();

// Send OTP route
router.post('/send-otp', sendOtpToPhone);

// Verify OTP route
router.post('/verify-otp', verifyOtp);

// Add admin route
router.post('/add-admin',authenticateAndAuthorize('admin'), addAdmin);

// Add admin route
router.post('/get-all-admin',authenticateAndAuthorize('admin'), getAllAdmin);


module.exports = router;
