const { pool } = require('../config/db'); // Assuming pool is set up for PostgreSQL

// Add from cart
const addToCart = async (req, res) => {
    try {
        const userId = req.user.id;
        const { restaurant_id, item_id, quantity = 1 } = req.body;

        if (!restaurant_id || !item_id) {
            return res.status(400).json({
                code: 400,
                status: 'fail',
                message: 'Restaurant ID and Item ID are required',
            });
        }

        // Check if the cart contains items from a different restaurant
        const checkQuery = `
            SELECT DISTINCT restaurant_id 
            FROM cart 
            WHERE user_id = $1
        `;
        const checkResult = await pool.query(checkQuery, [userId]);

        if (checkResult.rows.length > 0 && checkResult.rows[0].restaurant_id !== restaurant_id) {
            // If the restaurant is different, clear the cart
            await pool.query(`DELETE FROM cart WHERE user_id = $1`, [userId]);
        }

        // Check if the product already exists in the cart
        const productQuery = `
            SELECT * 
            FROM cart 
            WHERE user_id = $1 AND item_id = $2
        `;
        const productResult = await pool.query(productQuery, [userId, item_id]);

        if (productResult.rows.length > 0) {
            // Update the quantity if the product exists
            await pool.query(
                `UPDATE cart 
                 SET quantity = quantity + $1, updated_at = NOW() 
                 WHERE user_id = $2 AND item_id = $3`,
                [quantity, userId, item_id]
            );
        } else {
            // Add the product to the cart
            await pool.query(
                `INSERT INTO cart (user_id, restaurant_id, item_id, quantity) 
                 VALUES ($1, $2, $3, $4)`,
                [userId, restaurant_id, item_id, quantity]
            );
        }

        res.status(200).json({
            code: 200,
            status: 'success',
            message: 'Item added to cart successfully',
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            code: 500,
            status: 'fail',
            message: 'Failed to add item to cart',
        });
    }
};


// Remove from cart
const removeFromCart = async (req, res) => {
    try {
        const userId = req.user.id;
        const { item_id } = req.body;

        if (!item_id) {
            return res.status(400).json({
                code: 400,
                status: 'fail',
                message: 'Item ID is required',
            });
        }

        // Check if the product exists in the cart
        const productQuery = `
            SELECT * 
            FROM cart 
            WHERE user_id = $1 AND item_id = $2
        `;
        const productResult = await pool.query(productQuery, [userId, item_id]);

        if (productResult.rows.length === 0) {
            return res.status(404).json({
                code: 404,
                status: 'fail',
                message: 'Product not found in cart',
            });
        }

        // If quantity is greater than 1, decrease it; otherwise, remove the item
        if (productResult.rows[0].quantity > 1) {
            await pool.query(
                `UPDATE cart 
                 SET quantity = quantity - 1, updated_at = NOW() 
                 WHERE user_id = $1 AND item_id = $2`,
                [userId, item_id]
            );
        } else {
            await pool.query(
                `DELETE FROM cart 
                 WHERE user_id = $1 AND item_id = $2`,
                [userId, item_id]
            );
        }

        res.status(200).json({
            code: 200,
            status: 'success',
            message: 'Item removed from cart successfully',
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            code: 500,
            status: 'fail',
            message: 'Failed to remove item from cart',
        });
    }
};


// Get Cart
const getCart = async (req, res) => {
    try {
        const userId = req.user.id;
        const query = `
            SELECT 
                c.*,
                r.name AS restaurant_name,
                r.lat,
                r.lng,
                p.name AS item_name,
                p.price AS item_price,
                p.image AS item_logo
            FROM cart c
            LEFT JOIN restaurants r ON c.restaurant_id = r.id
            LEFT JOIN menu_items p ON c.item_id = p.id
            WHERE c.user_id = $1
        `;

        const result = await pool.query(query, [userId]);

        res.status(200).json({
            code: 200,
            status: 'success',
            message: 'Cart fetched successfully',
            data: result.rows,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            code: 500,
            status: 'fail',
            message: 'Failed to fetch cart',
        });
    }
};


module.exports = {
    addToCart,
    removeFromCart,
    getCart
};
