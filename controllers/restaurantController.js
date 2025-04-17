const { pool } = require('../config/db'); // Assuming pool is set up for PostgreSQL

// Get DeliveryFee
const getDeliveryFee = async (distance) => {
    try {
        const query = `SELECT minimum_km, fixed_fee, per_km_price FROM delivery_fee_config LIMIT 1`;
        const result = await pool.query(query);

        if (result.rows.length === 0) {
            throw new Error("Delivery fee configuration not found");
        }

        const { minimum_km, fixed_fee, per_km_price } = result.rows[0];

        if (distance <= minimum_km) {
            return parseFloat(fixed_fee);
        }

        // Calculate additional fee based on distance beyond the minimum
        const extraKm = distance - minimum_km;
        const additionalFee = parseFloat(extraKm) * parseFloat(per_km_price);
        return parseFloat((parseFloat(fixed_fee) + parseFloat(additionalFee)).toFixed(2));
    } catch (error) {
        console.error("Error calculating delivery fee:", error);
        return 0; // Default to zero if there's an issue
    }
};

// Fetch All Restaurants
const getAllRestaurants = async (req, res) => {
    try {
        const userId = req.user.id;
        const { status, lat, lng, radius = 100 } = req.body;

        let query = `
            SELECT 
                r.*, 
                COALESCE(ROUND(AVG(rr.star_rating), 1), 0.0) AS average_rating,
                COALESCE(COUNT(rr.id), 0) AS total_reviews,
                (
                    6371 * acos(
                        cos(radians($1)) * cos(radians(r.lat)) *
                        cos(radians(r.lng) - radians($2)) +
                        sin(radians($1)) * sin(radians(r.lat))
                    )
                ) AS distance,
                EXISTS (
                    SELECT 1 FROM restaurant_wishlists uw
                    WHERE uw.restaurant_id = r.id AND uw.user_id = $3
                ) AS is_wishlisted,
                EXISTS (
                    SELECT 1 FROM coupons c
                    WHERE c.restaurant_id = r.id 
                    AND CURRENT_DATE BETWEEN c.created_at AND c.valid_till
                ) AS is_promo
            FROM restaurants r
            LEFT JOIN restaurant_reviews rr ON r.id = rr.restaurant_id
        `;

        const filters = [];
        const values = [lat, lng, userId];

        if (status !== undefined) {
            filters.push(`r.status = $${values.length + 1}`);
            values.push(status);
        }
        if (lat && lng) {
            filters.push(`(
                6371 * acos(
                    cos(radians($1)) * cos(radians(r.lat)) *
                    cos(radians(r.lng) - radians($2)) +
                    sin(radians($1)) * sin(radians(r.lat))
                )
            ) <= $${values.length + 1}`);
            values.push(radius);
        }

        if (filters.length > 0) {
            query += ' WHERE ' + filters.join(' AND ');
        }

        query += `
            GROUP BY r.id
            ORDER BY distance ASC;
        `;

        const result = await pool.query(query, values);

        // Compute delivery fee for each restaurant
        const restaurantsWithDeliveryFee = await Promise.all(result.rows.map(async (row) => {
            const distance = row.distance !== null ? parseFloat(row.distance.toFixed(2)) : null;
            const deliveryFee = distance !== null ? await getDeliveryFee(distance) : 0;
            return { ...row, distance, deliveryFee };
        }));

        res.status(200).json({
            code: 200,
            status: 'success',
            message: 'Restaurants fetched successfully',
            data: restaurantsWithDeliveryFee,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            code: 500,
            status: 'fail',
            message: 'Failed to fetch restaurants',
        });
    }
};

const getRestaurantById = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { lat, lng } = req.body;

        if (!id) {
            return res.status(400).json({
                code: 400,
                status: 'fail',
                message: 'Restaurant ID is required',
            });
        }

        let query = `
            SELECT 
                r.*, 
                COALESCE(ROUND(AVG(rr.star_rating), 1), 0.0) AS average_rating,
                COALESCE(COUNT(rr.id), 0) AS total_reviews,
                (
                    6371 * acos(
                        cos(radians($1)) * cos(radians(r.lat)) *
                        cos(radians(r.lng) - radians($2)) +
                        sin(radians($1)) * sin(radians(r.lat))
                    )
                ) AS distance,
                EXISTS (
                    SELECT 1 FROM restaurant_wishlists uw
                    WHERE uw.restaurant_id = r.id AND uw.user_id = $3
                ) AS is_wishlisted
            FROM restaurants r
            LEFT JOIN restaurant_reviews rr ON r.id = rr.restaurant_id
            WHERE r.id = $4
            GROUP BY r.id;
        `;

        const values = [lat || 0, lng || 0, userId, id];

        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({
                code: 404,
                status: 'fail',
                message: 'Restaurant not found',
            });
        }

        const restaurant = result.rows[0];
        const distance = restaurant.distance !== null ? parseFloat(restaurant.distance.toFixed(2)) : null;
        const deliveryFee = distance !== null ? await getDeliveryFee(distance) : 0;

        res.status(200).json({
            code: 200,
            status: 'success',
            message: 'Restaurant fetched successfully',
            data: { ...restaurant, distance, deliveryFee },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            code: 500,
            status: 'fail',
            message: 'Failed to fetch restaurant',
        });
    }
};

const getDiscountedRestaurant = async (req, res) => {
    try {
        const userId = req.user.id;
        const { lat, lng, radius = 100 } = req.body;

        if (!lat || !lng) {
            return res.status(400).json({
                code: 400,
                status: 'fail',
                message: 'Latitude and longitude are required',
            });
        }

        let query = `
            SELECT 
                r.*,
                ARRAY_AGG(DISTINCT d.discount_percentage) AS discounts,
                COALESCE(ROUND(AVG(rr.star_rating), 1), 0.0) AS average_rating,
                COALESCE(COUNT(DISTINCT rr.id), 0) AS total_reviews,
                (
                    6371 * acos(
                        cos(radians($1)) * cos(radians(r.lat)) *
                        cos(radians(r.lng) - radians($2)) +
                        sin(radians($1)) * sin(radians(r.lat))
                    )
                ) AS distance,
                EXISTS (
                    SELECT 1 FROM restaurant_wishlists uw
                    WHERE uw.restaurant_id = r.id AND uw.user_id = $3
                ) AS is_wishlisted
            FROM restaurants r
            LEFT JOIN restaurant_reviews rr ON r.id = rr.restaurant_id
            LEFT JOIN coupons d ON r.id = d.restaurant_id
            WHERE d.discount_percentage IS NOT NULL 
            AND (
                6371 * acos(
                    cos(radians($1)) * cos(radians(r.lat)) *
                    cos(radians(r.lng) - radians($2)) +
                    sin(radians($1)) * sin(radians(r.lat))
                )
            ) <= $4
            GROUP BY r.id
            ORDER BY distance ASC;
        `;

        const values = [lat, lng, userId, radius];

        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({
                code: 404,
                status: 'fail',
                message: 'No nearby restaurants with discounts found',
            });
        }

        const restaurantData = await Promise.all(result.rows.map(async (restaurant) => {
            const distance = restaurant.distance !== null ? parseFloat(restaurant.distance.toFixed(2)) : null;
            const deliveryFee = distance !== null ? await getDeliveryFee(distance) : 0;
            return {
                ...restaurant,
                distance,
                deliveryFee,
                discounts: restaurant.discounts.filter((discount) => discount !== null),
            };
        }));

        res.status(200).json({
            code: 200,
            status: 'success',
            message: 'Discounted nearby restaurants fetched successfully',
            data: restaurantData,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            code: 500,
            status: 'fail',
            message: 'Failed to fetch discounted restaurants',
        });
    }
};




// Add a new restaurant
const addRestaurant = async (req, res) => {

    try {
        const { name, address, state, city, lat, lng, phone_number, email, owner_id } = req.body;
        const restaurant_logo = req.file ? req.file.location : null;  // Get the image URL from the uploaded file, if any

        if (!name || !address || !state || !city || !lat || !lng || !phone_number || !email || !owner_id) {
            return res.status(400).json({ code: 400, status: "fail", message: 'All fields are required' });
        }
        // Check if a restaurant with the same name already exists
        const checkNameResult = await pool.query(
            'SELECT * FROM restaurants WHERE name = $1',
            [name]
        );
        if (checkNameResult.rows.length > 0) {
            return res.status(400).json({ code: 400, status: "fail", message: 'Restaurant name already exists' });
        }
        const result = await pool.query(
            'INSERT INTO restaurants (name, address, state, city, lat, lng, phone_number, email, logo, owner_id) VALUES ($1, $2, $3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',
            [name, address, state, city, lat, lng, phone_number, email, restaurant_logo, owner_id]
        );
        res.status(200).json({ code: 200, status: "success", message: 'Restaurant created successfully', restaurant: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ code: 500, status: "fail", message: 'Failed to create restaurant' });
    }
};

// Edit a restaurant
const editRestaurant = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, address, state, city, lat, lng, phone_number, email, status = true } = req.body;
        const restaurant_logo = req.file ? req.file.location : null;  // Get the image URL from the uploaded file, if any

        // Validate input (at least one field should be provided for update)
        if (!name && !address && !state && !city && !lat && !lng && !phone_number && !email && status === undefined) {
            return res.status(400).json({
                code: 400,
                status: 'fail',
                message: 'At least one field (name, address, state, city, lat, lng, phone_number, email, status) is required to update'
            });
        }

        // Check if a restaurant with the same name already exists (excluding the current restaurant)
        const checkNameResult = await pool.query(
            'SELECT * FROM restaurants WHERE name = $1 AND id != $2',
            [name, id]
        );

        if (checkNameResult.rows.length > 0) {
            return res.status(400).json({
                code: 400,
                status: "fail",
                message: 'Restaurant name already exists'
            });
        }

        // Update the restaurant details
        const result = await pool.query(
            'UPDATE restaurants SET name = $1, address = $2, state = $3, city = $4, lat = $5, lng = $6, phone_number = $7, email = $8, status = $9,logo = $10, updated_at = CURRENT_TIMESTAMP WHERE id = $11 RETURNING *',
            [name, address, state, city, lat, lng, phone_number, email, status, restaurant_logo, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                code: 404,
                status: 'fail',
                message: 'Restaurant not found'
            });
        }

        res.status(200).json({
            code: 200,
            status: "success",
            message: 'Restaurant updated successfully',
            restaurant: result.rows[0]
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            code: 500,
            status: "fail",
            message: 'Failed to update restaurant'
        });
    }
};


// Delete a restaurant
const deleteRestaurant = async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query('DELETE FROM restaurants WHERE id = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Restaurant not found' });
        }

        res.status(200).json({ message: 'Restaurant deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to delete restaurant' });
    }
};

module.exports = {
    getAllRestaurants,
    getRestaurantById,
    getDiscountedRestaurant,
    addRestaurant,
    editRestaurant,
    deleteRestaurant,
};
