const express = require('express');
const { authenticateJWT, isRestaurantOwner } = require('../middleware/authenticateJWT');
const { getAllMenuItems,getAllMenuItemsByCategory,getAllMenuItemsByRestaurant, addMenuItem, editMenuItem, deleteMenuItem } = require('../controllers/menuItemController');
const { uploadImage } = require('../utils/uploadFile'); // Utility for handling image uploads

const router = express.Router();

// Get all menu items
router.post('/get-all-menu-items', authenticateJWT, getAllMenuItems);

// Get all menu items by category
router.post('/get-all-menu-items-by-category/:categoryId', authenticateJWT, getAllMenuItemsByCategory);

router.post('/get-all-menu-items/:restaurantId', authenticateJWT, getAllMenuItemsByRestaurant);

// Add a new menu item (Admin & Restaurant Owner access)
router.post('/add-menu-item', authenticateJWT, isRestaurantOwner, uploadImage.single('item_image'), addMenuItem);

// Edit an existing menu item
router.put('/edit-menu-item/:id', authenticateJWT, isRestaurantOwner, uploadImage.single('item_image'), editMenuItem);

// Delete a menu item
router.delete('/delete-menu-item/:id', authenticateJWT, isRestaurantOwner, deleteMenuItem);

module.exports = router;
