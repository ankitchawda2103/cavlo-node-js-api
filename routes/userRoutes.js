const express = require('express');
const { getUser, updateUser,updateFcmToken } = require('../controllers/userController');
const { authenticateJWT, authenticateAndAuthorize } = require('../middleware/authenticateJWT');
const { uploadImage } = require('../utils/uploadFile');

const router = express.Router();

// Get User Profile route
router.post('/get-profile', authenticateAndAuthorize('user'), getUser);
// Update User Profile route
router.post('/update-profile', authenticateAndAuthorize('user'), uploadImage.single("profile_image"), updateUser);
router.post('/update-fcm-token', authenticateAndAuthorize('user'),  updateFcmToken);


module.exports = router;
