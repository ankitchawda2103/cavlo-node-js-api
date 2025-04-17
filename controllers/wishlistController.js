const { pool } = require('../config/db');

// Add restaurant to wishlist
const addToWishlist = async (req, res) => {
    const user_id = req.user.id

    const { restaurant_id } = req.body;

    try {
        const query = `
      INSERT INTO restaurant_wishlists (user_id, restaurant_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id, restaurant_id) DO NOTHING
      RETURNING *;
    `;
        const values = [user_id, restaurant_id];
        const result = await pool.query(query, values);

        if (result.rowCount === 0) {
            return res.status(400).json({ code: 400, status: 'fail', message: 'Restaurant already in wishlist' });
        }

        res.status(200).json({ code: 200, status: 'success', message: 'Restaurant added to wishlist', wishlist: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ code: 500, status: 'fail', message: 'Failed to add restaurant to wishlist' });
    }
};

// Get user's restaurant wishlist
const getWishlist = async (req, res) => {
    const userId = req.user.id; // User ID from request (assumes authentication middleware provides this)
    const { lat, lng } = req.body; // User's location (latitude and longitude)

    if (!lat || !lng) {
        return res.status(400).json({
            code: 400,
            status: 'fail',
            message: 'Latitude and longitude are required',
        });
    }

    try {
        const query = `
            SELECT 
                r.id,
                r.name,
                r.address,
                r.city,
                r.state,
                r.logo,
                (
                    6371 * acos(
                        cos(radians($1)) * cos(radians(r.lat)) *
                        cos(radians(r.lng) - radians($2)) +
                        sin(radians($1)) * sin(radians(r.lat))
                    )
                ) AS distance,
                TRUE AS is_wishlisted -- Since this is the wishlist, all items are wishlisted
            FROM restaurant_wishlists w
            JOIN restaurants r ON w.restaurant_id = r.id
            WHERE w.user_id = $3;
        `;

        const values = [lat, lng, userId];

        const result = await pool.query(query, values);

        // If no restaurants are found in the wishlist
        if (result.rows.length === 0) {
            return res.status(200).json({
                code: 200,
                status: 'success',
                message: 'Wishlist fetched successfully',
                data: []
            });
        }

        // Map results to format the distance
        const wishlistData = result.rows.map((restaurant) => ({
            ...restaurant,
            distance: restaurant.distance !== null
                ? parseFloat(restaurant.distance.toFixed(2)) // Format distance
                : null,
        }));

        res.status(200).json({
            code: 200,
            status: 'success',
            message: 'Wishlist fetched successfully',
            data: wishlistData,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            code: 500,
            status: 'fail',
            message: 'Failed to fetch wishlist',
        });
    }
};


// Remove restaurant from wishlist
const removeFromWishlist = async (req, res) => {
    const user_id = req.user.id

    const { restaurant_id } = req.body;

    try {
        const query = `DELETE FROM restaurant_wishlists WHERE user_id = $1 AND restaurant_id = $2;`;
        const result = await pool.query(query, [user_id, restaurant_id]);

        if (result.rowCount === 0) {
            return res.status(400).json({ code: 400, status: 'fail', message: 'Restaurant not found in wishlist' });
        }

        res.status(200).json({ code: 200, status: 'success', message: 'Restaurant removed from wishlist' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ code: 500, status: 'fail', message: 'Failed to remove restaurant from wishlist' });
    }
};

module.exports = { addToWishlist, getWishlist, removeFromWishlist };
