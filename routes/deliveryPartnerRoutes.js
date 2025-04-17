const express = require("express");
const {
    sendOtpToPhone,
    verifyOtp,
    createDeliveryPartner,
    getAllDeliveryPartners,
    getDeliveryPartnerById,
    updateDeliveryPartner,
    deleteDeliveryPartner,
} = require("../controllers/deliveryPartnerController");
const { authenticateJWT, isAdmin } = require('../middleware/authenticateJWT');
const { uploadImage } = require("../utils/uploadFile");

const router = express.Router();

// Send OTP route
router.post('/send-otp', sendOtpToPhone);
// Verify OTP route
router.post('/verify-otp', verifyOtp);

router.post("/add-partner", authenticateJWT, isAdmin, uploadImage.single("profile_image"), createDeliveryPartner);
router.get("/get-all-partner", authenticateJWT, isAdmin, getAllDeliveryPartners);
router.get("/get-partner/:id", authenticateJWT, getDeliveryPartnerById);
router.put("/edit-partner/:id", authenticateJWT, uploadImage.single("profile_image"), updateDeliveryPartner);
router.delete("delete-partner/:id", authenticateJWT, isAdmin, deleteDeliveryPartner);

module.exports = router;