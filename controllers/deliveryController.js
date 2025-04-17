const { pool } = require('../config/db'); // Assuming pool is set up for PostgreSQL

// Create Delivery Fee
const createDeliveryFee = async (req, res) => {
    try {
        const { minimum_km, fixed_fee, per_km_price } = req.body;

        if (!minimum_km || !fixed_fee || !per_km_price) {
            return res.status(400).json({
                status: "fail",
                message: "All fields (minimum_km, fixed_fee, per_km_price) are required.",
            });
        }

        // Check if a delivery fee configuration already exists
        const checkQuery = `SELECT * FROM delivery_fee_config LIMIT 1`;
        const checkResult = await pool.query(checkQuery);

        if (checkResult.rows.length > 0) {
            // Update the existing configuration
            const updateQuery = `
                UPDATE delivery_fee_config 
                SET minimum_km = $1, fixed_fee = $2, per_km_price = $3 
                WHERE id = $4 
                RETURNING *`;
            const result = await pool.query(updateQuery, [
                minimum_km,
                fixed_fee,
                per_km_price,
                checkResult.rows[0].id,
            ]);

            return res.status(200).json({
                status: "success",
                message: "Delivery fee configuration updated successfully.",
                data: result.rows[0],
            });
        } else {
            // Insert a new configuration if none exists
            const insertQuery = `
                INSERT INTO delivery_fee_config (minimum_km, fixed_fee, per_km_price)
                VALUES ($1, $2, $3) RETURNING *`;
            const result = await pool.query(insertQuery, [minimum_km, fixed_fee, per_km_price]);

            return res.status(201).json({
                status: "success",
                message: "Delivery fee configuration created successfully.",
                data: result.rows[0],
            });
        }
    } catch (error) {
        console.error("Error creating or updating delivery fee configuration:", error);
        res.status(500).json({
            code: 500,
            status: "fail",
            message: "Failed to create or update delivery fee configuration.",
        });
    }
};


// Get All Delivery Partners
const getDeliveryFee = async (req, res) => {
    try {
        const result = await pool.query(`SELECT * FROM delivery_fee_config`);

        res.status(200).json({
            code: 200,
            status: "success",
            data: result.rows,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            code: 500,
            status: "fail",
            message: "Failed to fetch delivery partners",
        });
    }
};


module.exports = {
    createDeliveryFee,
    getDeliveryFee
};