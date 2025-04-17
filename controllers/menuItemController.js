const { pool } = require('../config/db'); // Assuming a PostgreSQL connection pool

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

// Get all menu items
const getAllMenuItems = async (req, res) => {
    try {
        const { lat, lng, radius = 100 } = req.body;
        const values = [lat, lng, radius];

        const query = `
            SELECT 
                mi.*, 
                r.id AS restaurant_id,
                r.name AS restaurant_name,
                r.lat AS restaurant_lat,
                r.lng AS restaurant_lng,
                r.logo AS restaurant_logo,
                c.name AS category_name,
                (
                    6371 * acos(
                        cos(radians($1)) * cos(radians(r.lat)) *
                        cos(radians(r.lng) - radians($2)) +
                        sin(radians($1)) * sin(radians(r.lat))
                    )
                ) AS distance
            FROM menu_items mi
            JOIN categories c ON mi.category_id = c.id
            JOIN restaurants r ON mi.restaurant_id = r.id
            WHERE mi.is_available = true
            AND (
                6371 * acos(
                    cos(radians($1)) * cos(radians(r.lat)) *
                    cos(radians(r.lng) - radians($2)) +
                    sin(radians($1)) * sin(radians(r.lat))
                )
            ) <= $3
            ORDER BY distance ASC;
        `;

        const result = await pool.query(query, values);

        const menuItems = await Promise.all(result.rows.map(async (item) => ({
            ...item,
            distance: parseFloat(item.distance.toFixed(2)),
            delivery_fee: await getDeliveryFee(item.distance)
        })));

        return res.status(200).json({
            code: 200,
            status: "success",
            message: "Menu items fetched successfully",
            data: menuItems
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ code: 500, status: "fail", message: "Failed to fetch menu items" });
    }
};

// Get all menu items by category
const getAllMenuItemsByCategory = async (req, res) => {
    try {
        const { categoryId } = req.params;
        const { lat, lng, radius = 100 } = req.body;
        const values = [lat, lng, radius, categoryId];

        const query = `
            SELECT 
                mi.*, 
                r.id AS restaurant_id,
                r.name AS restaurant_name,
                r.lat AS restaurant_lat,
                r.lng AS restaurant_lng,
                r.logo AS restaurant_logo,
                c.name AS category_name,
                (
                    6371 * acos(
                        cos(radians($1)) * cos(radians(r.lat)) *
                        cos(radians(r.lng) - radians($2)) +
                        sin(radians($1)) * sin(radians(r.lat))
                    )
                ) AS distance
            FROM menu_items mi
            JOIN categories c ON mi.category_id = c.id
            JOIN restaurants r ON mi.restaurant_id = r.id
            WHERE mi.is_available = true AND mi.category_id = $4
            AND (
                6371 * acos(
                    cos(radians($1)) * cos(radians(r.lat)) *
                    cos(radians(r.lng) - radians($2)) +
                    sin(radians($1)) * sin(radians(r.lat))
                )
            ) <= $3
            ORDER BY distance ASC;
        `;

        const result = await pool.query(query, values);

        const menuItems = await Promise.all(result.rows.map(async (item) => ({
            ...item,
            distance: parseFloat(item.distance.toFixed(2)),
            delivery_fee: await getDeliveryFee(item.distance)
        })));

        return res.status(200).json({
            code: 200,
            status: "success",
            message: "Menu items fetched successfully",
            data: menuItems
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ code: 500, status: "fail", message: "Failed to fetch menu items" });
    }
};

// Get all menu items by restaurant
const getAllMenuItemsByRestaurant = async (req, res) => {
    try {
        const { restaurantId } = req.params;
        const { lat, lng, radius = 100 } = req.body;
        const values = [lat, lng, radius, restaurantId];
       
        // Query to fetch menu items with category and restaurant details
        const query = `
            SELECT 
                mi.*, 
                r.id AS restaurant_id,
                r.name AS restaurant_name,
                r.lat AS restaurant_lat,
                r.lng AS restaurant_lng,
                r.logo AS restaurant_logo,
                c.id AS category_id,
                c.name AS category_name,
                 (
                    6371 * acos(
                        cos(radians($1)) * cos(radians(r.lat)) *
                        cos(radians(r.lng) - radians($2)) +
                        sin(radians($1)) * sin(radians(r.lat))
                    )
                ) AS distance
            FROM menu_items mi
            JOIN categories c ON mi.category_id = c.id
            JOIN restaurants r ON mi.restaurant_id = r.id
            WHERE mi.is_available = true AND mi.restaurant_id = $4
            AND (
                6371 * acos(
                    cos(radians($1)) * cos(radians(r.lat)) *
                    cos(radians(r.lng) - radians($2)) +
                    sin(radians($1)) * sin(radians(r.lat))
                )
            ) <= $3;
        `;
        const result = await pool.query(query, values);

        // Group items by category
        const categoryWiseMenu = {};

        for (const item of result.rows) {
            const categoryId = item.category_id;
            const categoryName = item.category_name;
        
            if (!categoryWiseMenu[categoryId]) {
                categoryWiseMenu[categoryId] = {
                    category_id: categoryId,
                    category_name: categoryName,
                    items: []
                };
            }
        
            // Fetch delivery fee asynchronously
            const deliveryFee = await getDeliveryFee(item.distance);
        
            categoryWiseMenu[categoryId].items.push({
                id: item.id,
                name: item.name,
                description: item.description,
                price: item.price,
                image: item.image,
                is_available: item.is_available,
                distance: parseFloat(item.distance.toFixed(2)),
                delivery_fee: deliveryFee
            });
        }
        
        const categories = Object.values(categoryWiseMenu);
        res.status(200).json({
            code: 200,
            status: "success",
            message: "Menu items fetched successfully",
            data: {
                restaurant: {
                    id: result.rows[0]?.restaurant_id || null,
                    name: result.rows[0]?.restaurant_name || null,
                    lat: result.rows[0]?.restaurant_lat || null,
                    lng: result.rows[0]?.restaurant_lng || null,
                    logo: result.rows[0]?.restaurant_logo || null
                },
                categories
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ code: 500, status: "fail", message: "Failed to fetch menu items" });
    }
};

// Add a new menu item
const addMenuItem = async (req, res) => {
    const { restaurant_id, name, description, price, category_id, is_vegetarian } = req.body;
    const item_image = req.file ? req.file.location : null;
    const userId = req.user.id; // Authenticated user's ID
    try {
        if (!restaurant_id || !name || !price || !category_id) {
            return res.status(400).json({ code: 400, status: "fail", message: "Required fields are missing" });
        }
        // Verify ownership of the restaurant
        const restaurantQuery = 'SELECT id, owner_id FROM restaurants WHERE id = $1';
        const restaurantResult = await pool.query(restaurantQuery, [restaurant_id]);

        if (restaurantResult.rows.length === 0) {
            return res.status(400).json({
                code: 400,
                status: 'fail',
                message: 'Restaurant not found',
            });
        }

        const restaurant = restaurantResult.rows[0];
        if (restaurant.owner_id !== userId) {
            return res.status(403).json({
                code: 403,
                status: 'fail',
                message: 'Unauthorized: You do not own this restaurant',
            });
        }

        const result = await pool.query(
            `INSERT INTO menu_items (restaurant_id, name, description, price, category_id, image, is_vegetarian, is_available)
             VALUES ($1, $2, $3, $4, $5, $6, $7, true) RETURNING *`,
            [restaurant_id, name, description, price, category_id, item_image, is_vegetarian]
        );

        res.status(200).json({
            code: 200,
            status: "success",
            message: "Menu item added successfully",
            data: result.rows[0]
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ code: 500, status: "fail", message: "Failed to add menu item" });
    }
};

// Edit an existing menu item
const editMenuItem = async (req, res) => {
    const { id } = req.params;
    const { restaurant_id, name, description, price, category_id, is_vegetarian, is_available } = req.body;
    const item_image = req.file ? req.file.location : null;
    const userId = req.user.id; // Authenticated user's ID

    try {
        if (!restaurant_id && !name && !description && !price && !category_id && is_vegetarian === undefined && is_available === undefined) {
            return res.status(400).json({ code: 400, status: "fail", message: "No fields provided to update" });
        }

        const restaurantQuery = 'SELECT id, owner_id FROM restaurants WHERE id = $1';
        const restaurantResult = await pool.query(restaurantQuery, [restaurant_id]);

        if (restaurantResult.rows.length === 0) {
            return res.status(400).json({
                code: 400,
                status: 'fail',
                message: 'Restaurant not found',
            });
        }

        const restaurant = restaurantResult.rows[0];
        if (restaurant.owner_id !== userId) {
            return res.status(403).json({
                code: 403,
                status: 'fail',
                message: 'Unauthorized: You do not own this restaurant',
            });
        }
        const result = await pool.query(
            `UPDATE menu_items SET 
             name = COALESCE($1, name),
             description = COALESCE($2, description),
             price = COALESCE($3, price),
             category_id = COALESCE($4, category_id),
             image = COALESCE($5, image),
             is_vegetarian = COALESCE($6, is_vegetarian),
             is_available = COALESCE($7, is_available),
             updated_at = CURRENT_TIMESTAMP
             WHERE id = $8 RETURNING *`,
            [name, description, price, category_id, item_image, is_vegetarian, is_available, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ code: 404, status: "fail", message: "Menu item not found" });
        }

        res.status(200).json({
            code: 200,
            status: "success",
            message: "Menu item updated successfully",
            menuItem: result.rows[0]
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ code: 500, status: "fail", message: "Failed to update menu item" });
    }
};

// Delete a menu item
const deleteMenuItem = async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query('DELETE FROM menu_items WHERE id = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ code: 404, status: "fail", message: "Menu item not found" });
        }

        res.status(200).json({
            code: 200,
            status: "success",
            message: "Menu item deleted successfully"
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ code: 500, status: "fail", message: "Failed to delete menu item" });
    }
};

module.exports = { getAllMenuItems, getAllMenuItemsByCategory, getAllMenuItemsByRestaurant, addMenuItem, editMenuItem, deleteMenuItem };
