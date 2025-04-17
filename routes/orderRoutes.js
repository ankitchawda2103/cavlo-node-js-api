const express = require("express");
const {
  authenticateAndAuthorize,
  authenticateJWT,
} = require("../middleware/authenticateJWT");
const {
  getAllOrders,
  getUserOrders,
  getPartnerOrders,
  getOrderById,
  placeOrder,
  assignOrderToDeliveryPartner,
  updateOrderStatus,
  checkoutOrder,
  orderDelivered,
} = require("../controllers/orderController");

const router = express.Router();

// Get User Profile route
router.post("/get-all-orders", authenticateAndAuthorize("user"), getAllOrders);
router.get("/get-user-orders", authenticateAndAuthorize("user"), getUserOrders);
router.post("/get-partner-orders", authenticateJWT, getPartnerOrders);
router.post("/get-order-by-id", authenticateAndAuthorize("user"), getOrderById);
router.post("/place-order", authenticateAndAuthorize("user"), placeOrder);
router.post("/checkout-order", authenticateAndAuthorize("user"), checkoutOrder);
router.post(
  "/update-order",
  authenticateAndAuthorize("user"),
  updateOrderStatus
);

//orderDelivered
router.post("/order-delivered", orderDelivered);

router.post(
  "/assign-order-partner",
  authenticateAndAuthorize("user"),
  assignOrderToDeliveryPartner
);

module.exports = router;
