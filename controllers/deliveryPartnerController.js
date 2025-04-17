const { pool } = require('../config/db'); // Assuming pool is set up for PostgreSQL
const { generateOtp } = require('../utils/generateOtp');
const jwt = require('jsonwebtoken');

// Send OTP to the user's phone number
const sendOtpToPhone = async (req, res) => {
    const { phone_number } = req.body;

    if (!phone_number) {
        return res.status(400).json({ code: 400, status: 'fail', message: 'Phone number is required' });
    }

    const userResult = await pool.query('SELECT * FROM delivery_partners WHERE phone_number = $1', [phone_number]);
    if (userResult.rows.length === 0) {
        return res.status(400).json({ code: 400, status: 'fail', message: 'Partner not found' });
    }
    const otp = generateOtp();
    //   const otpSent = await sendOtp(phone_number, otp);

    //   if (otpSent) {
    // Store OTP in the database with expiration time
    await pool.query('INSERT INTO otps (phone_number, otp) VALUES ($1, $2)', [phone_number, otp]);

    return res.status(200).json({ code: 200, status: 'success', message: 'OTP sent successfully' });
    //   }

    //   return res.status(500).json({ message: 'Failed to send OTP' });
};

// Verify OTP and generate JWT token
const verifyOtp = async (req, res) => {
    const { phone_number, otp } = req.body;

    if (!phone_number || !otp) {
        return res.status(400).json({ code: 400, status: 'fail', message: 'Phone number and OTP are required' });
    }
    try {
        // Check OTP in the database
        const otpResult = await pool.query('SELECT * FROM otps WHERE phone_number = $1 ORDER BY created_at DESC LIMIT 1', [phone_number]);

        if (otpResult.rows.length === 0 || otpResult.rows[0].otp !== otp) {
            return res.status(400).json({ code: 400, status: 'fail', message: 'Invalid OTP' });
        }


        // Remove OTP after successful verification
        await pool.query('DELETE FROM otps WHERE phone_number = $1', [phone_number]);

        // Check if the user exists
        const userResult = await pool.query('SELECT * FROM delivery_partners WHERE phone_number = $1', [phone_number]);
        // OTP is valid, generate JWT token
        if (userResult.rows.length === 0) {
            return res.status(400).json({
                code: 400,
                status: 'fail',
                message: 'OTP expired sent again'
            });
        } else {
            // Existing user, check if basic details are filled
            const existingUser = userResult.rows[0];
            const token = jwt.sign({ id: userResult.rows[0].id }, process.env.JWT_SECRET, { expiresIn: '30d' });
            return res.status(200).json({
                code: 200,
                status: 'success',
                message: 'OTP verified successfully',
                data: {
                    user: existingUser,
                    token
                },
            });
        }

    } catch (error) {
        console.error('Error verifying OTP:', error);
        return res.status(500).json({
            code: 500,
            status: 'fail',
            message: 'An error occurred while verifying the OTP',
        });
    }
};

// Create Delivery Partner
const createDeliveryPartner = async (req, res) => {
    try {
        const { name, phone_number, email, vehicle_details } = req.body;
        const profile_image = req.file ? req.file.location : null;  // URL of the uploaded image on S3   

        if (!name || !phone_number) {
            return res.status(400).json({
                code: 400,
                status: "fail",
                message: "Name and Phone Number are required",
            });
        }

        const result = await pool.query(
            `INSERT INTO delivery_partners (name, phone_number, email, vehicle_details, profile_image)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [name, phone_number, email, vehicle_details, profile_image]
        );

        res.status(200).json({
            code: 200,
            status: "success",
            message: "Delivery partner created successfully",
            data: result.rows[0],
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            code: 500,
            status: "fail",
            message: "Failed to create delivery partner",
        });
    }
};

// Get All Delivery Partners
const getAllDeliveryPartners = async (req, res) => {
    try {
        const result = await pool.query(`SELECT * FROM delivery_partners`);

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

// Get Delivery Partner by ID
const getDeliveryPartnerById = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `SELECT * FROM delivery_partners WHERE id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({
                code: 400,
                status: "fail",
                message: "Delivery partner not found",
            });
        }

        res.status(200).json({
            code: 200,
            status: "success",
            data: result.rows[0],
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            code: 500,
            status: "fail",
            message: "Failed to fetch delivery partner",
        });
    }
};

// Update Delivery Partner
const updateDeliveryPartner = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, phone_number, email, vehicle_details, status } = req.body;
        const profile_image = req.file ? req.file.location : null;  // URL of the uploaded image on S3   

        const result = await pool.query(
            `UPDATE delivery_partners 
             SET name = COALESCE($1, name),
                 phone_number = COALESCE($2, phone_number),
                 email = COALESCE($3, email),
                 vehicle_details = COALESCE($4, vehicle_details),
                 profile_image = COALESCE($5, profile_image),
                 status = COALESCE($6, status),
                 updated_at = NOW()
             WHERE id = $7 RETURNING *`,
            [name, phone_number, email, vehicle_details, profile_image, status, id]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({
                code: 400,
                status: "fail",
                message: "Delivery partner not found",
            });
        }

        res.status(200).json({
            code: 200,
            status: "success",
            message: "Delivery partner updated successfully",
            data: result.rows[0],
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            code: 500,
            status: "fail",
            message: "Failed to update delivery partner",
        });
    }
};

// Delete Delivery Partner
const deleteDeliveryPartner = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `DELETE FROM delivery_partners WHERE id = $1 RETURNING *`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({
                code: 400,
                status: "fail",
                message: "Delivery partner not found",
            });
        }

        res.status(200).json({
            code: 200,
            status: "success",
            message: "Delivery partner deleted successfully",
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            code: 500,
            status: "fail",
            message: "Failed to delete delivery partner",
        });
    }
};

module.exports = {
    sendOtpToPhone,
    verifyOtp,
    createDeliveryPartner,
    getAllDeliveryPartners,
    getDeliveryPartnerById,
    updateDeliveryPartner,
    deleteDeliveryPartner,
};