const express = require('express');
const router = express.Router();
const { createCategory, updateCategory, deleteCategory, getAllCategories, getCategoryById } = require('../controllers/categoryController');
const { uploadImage } = require('../utils/uploadFile');
const { authenticateJWT, authenticateAndAuthorize } = require('../middleware/authenticateJWT');

// Get all categories
router.post('/get-all-categories',authenticateJWT, getAllCategories);

// Get category by ID
router.post('/get-category-by-id/:id',authenticateJWT, getCategoryById);

// Create a new category (with image upload)
router.post('/add-category',authenticateAndAuthorize('admin'), uploadImage.single('category_image'), createCategory);

// Update category (with image upload)
router.put('/edit-category/:id',authenticateAndAuthorize('admin'), uploadImage.single('category_image'), updateCategory);

// Delete category
router.delete('/delete-category/:id',authenticateAndAuthorize('admin'), deleteCategory);

module.exports = router;
