const { pool } = require('../config/db'); // Assuming pool is set up for PostgreSQL

// Get all coupons API
const getAllCoupons = async (req, res) => {
    try {
        const { status, restaurant_id, is_special, only_active = false } = req.body;
        let query = 'SELECT * FROM coupons WHERE 1=1';
        const queryParams = [];

        // Filter by status if provided
        if (status !== undefined) {
            query += ' AND status = $' + (queryParams.length + 1);
            queryParams.push(status);
        }

        // Filter by restaurant_id if provided
        if (restaurant_id) {
            query += ' AND restaurant_id = $' + (queryParams.length + 1);
            queryParams.push(restaurant_id);
        }

        // Filter by is_special if provided
        if (is_special !== undefined) {
            query += ' AND is_special = $' + (queryParams.length + 1);
            queryParams.push(is_special);
        }

        // Filter for active coupons if only_active is true
        if (only_active) {
            query += ' AND (valid_till IS NULL OR valid_till >= CURRENT_DATE)';
        }

        query += ' ORDER BY created_at DESC';

        const result = await pool.query(query, queryParams);

        res.status(200).json({
            code: 200,
            status: 'success',
            message: 'Coupons fetched successfully',
            data: result.rows,
        });
    } catch (error) {
        console.error('Error fetching coupons:', error);
        res.status(500).json({ code: 500, status: 'fail', message: 'Failed to fetch coupons' });
    }
};

// Get single coupon by ID API
const getCouponById = async (req, res) => {
    const { id } = req.params;
    const { only_active = false } = req.body; // Allow filtering by active status via query parameter

    try {
        let query = 'SELECT * FROM coupons WHERE id = $1';
        const queryParams = [id];

        // Filter for active coupons if only_active is true
        if (only_active === 'true') {
            query += ' AND (valid_till IS NULL OR valid_till >= CURRENT_DATE)';
        }

        const result = await pool.query(query, queryParams);

        if (result.rows.length === 0) {
            return res.status(400).json({ code: 400, status: 'fail', message: 'Coupon not found or expired' });
        }

        res.status(200).json({
            code: 200,
            status: 'success',
            message: 'Coupon fetched successfully',
            data: result.rows[0],
        });
    } catch (error) {
        console.error('Error fetching coupon:', error);
        res.status(500).json({ code: 500, status: 'fail', message: 'Failed to fetch coupon' });
    }
};
// Get coupon by restaurant ID API

const getCouponByRestaurant = async (req, res) => {
    const { restaurant_id, only_active = false } = req.body; // Allow filtering by active status via query parameter

    try {
        let query = 'SELECT * FROM coupons WHERE restaurant_id = $1';
        const queryParams = [restaurant_id];

        // Filter for active coupons if only_active is true
        if (only_active === true) {
            query += ' AND (valid_till IS NULL OR valid_till >= CURRENT_DATE)';
        }

        const result = await pool.query(query, queryParams);

        if (result.rows.length === 0) {
            return res.status(400).json({ code: 400, status: 'fail', message: 'Coupon not found or expired' });
        }

        res.status(200).json({
            code: 200,
            status: 'success',
            message: 'Coupon fetched successfully',
            data: result.rows,
        });
    } catch (error) {
        console.error('Error fetching coupon:', error);
        res.status(500).json({ code: 500, status: 'fail', message: 'Failed to fetch coupon' });
    }
};

// Coupon creation API
const createCoupon = async (req, res) => {
    const {
        title,
        restaurant_id,
        description,
        coupon_code,
        discount_percentage,
        max_discount_amount = 0,
        min_order_amount = 0,
        per_user_usage_limit = 1,
        valid_till,
        is_special = false,
        status = true
    } = req.body;

    const image = req.files?.['image']?.[0]?.location || null;

    if (!title || !discount_percentage || !coupon_code || !description || !restaurant_id) {
        return res.status(400).json({
            code: 400,
            status: "fail",
            message: "Title, discount_percentage, coupon_code, description, and restaurant_id are required"
        });
    }

    try {
        // Check if a coupon with the same code exists for the restaurant
        const existingCoupon = await pool.query(
            'SELECT * FROM coupons WHERE coupon_code = $1 AND restaurant_id = $2',
            [coupon_code, restaurant_id]
        );

        if (existingCoupon.rows.length > 0) {
            return res.status(400).json({ code: 400, status: "fail", message: "Coupon code already exists" });
        }

        const result = await pool.query(
            `INSERT INTO coupons (
                title, coupon_code, description, image, discount_percentage,
                min_order_amount, max_discount_amount, per_user_usage_limit, restaurant_id,
                valid_till, is_special, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
            [title, coupon_code, description, image, discount_percentage,
                min_order_amount, max_discount_amount, per_user_usage_limit, restaurant_id,
                valid_till, is_special, status]
        );

        res.status(200).json({
            code: 200,
            status: "success",
            message: "Coupon created successfully",
            data: result.rows[0]
        });
    } catch (error) {
        console.error("Error creating coupon:", error);
        res.status(500).json({ code: 500, status: "fail", message: "Failed to create coupon" });
    }
};

// Update coupon API
const updateCoupon = async (req, res) => {
    const { id } = req.params;
    const {
        title, coupon_code, description, discount_percentage, min_order_amount,
        max_discount_amount, per_user_usage_limit, restaurant_id, valid_till, is_special, status
    } = req.body;

    const image = req.files?.['image']?.[0]?.location || null;

    if (!title && !coupon_code && !description && !discount_percentage && !restaurant_id && 
        !valid_till && !is_special && !status && !max_discount_amount &&
        !max_discount_amount && !per_user_usage_limit && !image) {
        return res.status(400).json({ code: 400, status: "fail", message: "At least one field is required to update" });
    }

    try {
        if (coupon_code) {
            const existingCoupon = await pool.query(
                'SELECT * FROM coupons WHERE coupon_code = $1 AND id != $2 AND restaurant_id = $3',
                [coupon_code, id, restaurant_id]
            );
            if (existingCoupon.rows.length > 0) {
                return res.status(400).json({ code: 400, status: "fail", message: "Coupon code already exists" });
            }
        }

        const result = await pool.query(
            `UPDATE coupons 
             SET title = COALESCE($1, title), coupon_code = COALESCE($2, coupon_code),
                 description = COALESCE($3, description), discount_percentage = COALESCE($4, discount_percentage),
                 min_order_amount = COALESCE($5, min_order_amount), max_discount_amount = COALESCE($6, max_discount_amount),
                 per_user_usage_limit = COALESCE($7, per_user_usage_limit), restaurant_id = COALESCE($8, restaurant_id),
                 valid_till = COALESCE($9, valid_till), is_special = COALESCE($10, is_special), 
                 status = COALESCE($11, status), image = COALESCE($12, image), updated_at = CURRENT_TIMESTAMP 
             WHERE id = $13 RETURNING *`,
            [title, coupon_code, description, discount_percentage, min_order_amount, max_discount_amount, per_user_usage_limit, 
             restaurant_id, valid_till, is_special, status, image, id]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ code: 400, status: "fail", message: "Coupon not found" });
        }

        res.status(200).json({
            code: 200,
            status: "success",
            message: "Coupon updated successfully",
            data: result.rows[0]
        });
    } catch (error) {
        console.error("Error updating coupon:", error);
        res.status(500).json({ code: 500, status: "fail", message: "Failed to update coupon" });
    }
};


// Delete coupon API
const deleteCoupon = async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query('DELETE FROM coupons WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(400).json({ code: 400, status: 'fail', message: 'Coupon not found' });
        }
        res.status(200).json({
            code: 200,
            status: 'success',
            message: 'Coupon deleted successfully',
            data: result.rows[0],
        });
    } catch (error) {
        console.error('Error deleting coupon:', error);
        res.status(500).json({ code: 500, status: 'fail', message: 'Failed to delete coupon' });
    }
};

const applyCoupon = async (req, res) => {
    try {
        const userId = req.user.id
        const { restaurantId, couponCode, totalAmount } = req.body
        // Fetch the coupon from DB
        const couponQuery = `
            SELECT * FROM coupons 
            WHERE coupon_code = $1 AND restaurant_id = $2 AND status = true AND (valid_till IS NULL OR valid_till >= CURRENT_DATE)
        `;
        const couponResult = await pool.query(couponQuery, [couponCode, restaurantId]);

        if (couponResult.rows.length === 0) {
            return { success: false, message: "Invalid or expired coupon" };
        }

        const coupon = couponResult.rows[0];

        // Check if the order meets the minimum order amount requirement
        if (totalAmount < coupon.min_order_amount) {
            return { success: false, message: `Order must be at least ${coupon.min_order_amount} to apply this coupon` };
        }

        // Check user redemption history for the coupon
        const redemptionQuery = `
            SELECT redemption_count FROM coupon_redemptions 
            WHERE user_id = $1 AND coupon_id = $2
        `;
        const redemptionResult = await pool.query(redemptionQuery, [userId, coupon.id]);

        if (redemptionResult.rows.length > 0) {
            const redemptionCount = redemptionResult.rows[0].redemption_count;
            if (redemptionCount >= 1) {
                return { success: false, message: "You have already used this coupon" };
            }
        }

        // Calculate the discount amount
        let discountAmount = (totalAmount * coupon.discount_percentage) / 100;
        if (coupon.max_discount_amount !== null && discountAmount > coupon.max_discount_amount) {
            discountAmount = coupon.max_discount_amount;
        }

        // Record the coupon redemption for the user
        if (redemptionResult.rows.length === 0) {
            await pool.query(
                `INSERT INTO coupon_redemptions (user_id, coupon_id, redemption_count) VALUES ($1, $2, 1)`,
                [userId, coupon.id]
            );
        } else {
            await pool.query(
                `UPDATE coupon_redemptions SET redemption_count = redemption_count + 1, last_used = NOW() WHERE user_id = $1 AND coupon_id = $2`,
                [userId, coupon.id]
            );
        }

        return {
            success: true,
            discountAmount,
            message: `Coupon applied successfully. Discount: ${discountAmount}`,
        };
    } catch (error) {
        console.error(error);
        return { success: false, message: "Failed to apply coupon" };
    }
};


module.exports = { getAllCoupons, getCouponById, getCouponByRestaurant, createCoupon, updateCoupon, deleteCoupon, applyCoupon };