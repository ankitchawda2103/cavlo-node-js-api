const express = require('express');
const { sendOtpToPhone, verifyOtp,socailLogin } = require('../controllers/authController');

const router = express.Router();

// Send OTP route
router.post('/send-otp', sendOtpToPhone);

// Verify OTP route
router.post('/verify-otp', verifyOtp);

// Verify OTP route
router.post('/social-login', socailLogin);


module.exports = router;
