const express = require('express');
const { authenticateJWT, isAdmin } = require('../middleware/authenticateJWT'); // Import the authentication and role middlewares
const { getAllRestaurants, getRestaurantById, getDiscountedRestaurant, addRestaurant, editRestaurant, deleteRestaurant } = require('../controllers/restaurantController');  // Import the restaurant controller
const { uploadImage } = require('../utils/uploadFile');
const { pool } = require('../config/db'); // Assuming pool is set up for PostgreSQL

const router = express.Router();

// Get all restaurants (accessible by admins and restaurant owners)
router.post('/get-all-restaurants', authenticateJWT, getAllRestaurants);

router.post('/get-restaurant-by-id/:id', authenticateJWT, getRestaurantById);

router.post('/get-discounted-restaurant', authenticateJWT, getDiscountedRestaurant);


// Add a new restaurant (accessible by admins only)
router.post('/add-restaurant', authenticateJWT, isAdmin, uploadImage.single('restaurant_logo'), addRestaurant);

// Edit an existing restaurant (accessible by admins and restaurant owners who own the restaurant)
router.put('/edit-restaurant/:id', authenticateJWT, uploadImage.single('restaurant_logo'), (req, res, next) => {
    const restaurantId = req.params.id;
    if (req.user.role === 'admin') {
        return next();
    }
    if (req.user.role === 'restaurant_owner') {
        // Check if the user is the restaurant owner
        const query = 'SELECT * FROM restaurants WHERE id = $1 AND owner_id = $2';
        pool.query(query, [restaurantId, req.user.id])
            .then(result => {
                if (result.rows.length > 0) {
                    return next();
                } else {
                    return res.status(403).json({ code: 403, status: 'unauthorized', message: 'Unauthorized access' });
                }
            })
            .catch(error => {
                console.error(error);
                res.status(500).json({ code: 500, status: 'fail', message: 'Error checking ownership' });
            });
    }

}, editRestaurant);

// Delete a restaurant (accessible by admins and restaurant owners who own the restaurant)
router.delete('/delete-restaurant/:id', authenticateJWT, (req, res, next) => {
    const restaurantId = req.params.id;
    if (req.user.role === 'admin') {
        return next();
    }

    // Check if the user is the restaurant owner
    const query = 'SELECT * FROM restaurants WHERE id = $1 AND owner_id = $2';
    pool.query(query, [restaurantId, req.user.id])
        .then(result => {
            if (result.rows.length > 0) {
                return next();
            } else {
                return res.status(403).json({ code: 403, status: 'unauthorized', message: 'Unauthorized access' });
            }
        })
        .catch(error => {
            console.error(error);
            res.status(500).json({ code: 500, status: 'fail', message: 'Error checking ownership' });
        });
}, deleteRestaurant);

module.exports = router;
