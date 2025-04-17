const express = require("express");
const {
    createDeliveryFee,
    getDeliveryFee,
} = require("../controllers/deliveryController");
const { authenticateJWT, isAdmin } = require('../middleware/authenticateJWT');
const { uploadImage } = require("../utils/uploadFile");

const router = express.Router();

router.post("/add-delivery-fee", authenticateJWT, isAdmin,createDeliveryFee);
router.get("/get-delivery-fee", authenticateJWT, isAdmin, getDeliveryFee);

module.exports = router;