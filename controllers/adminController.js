const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const { generateOtp } = require('../utils/generateOtp');
// const { sendOtp } = require('../utils/sendOtp');

// Send OTP to the user's phone number
const sendOtpToPhone = async (req, res) => {
    const { phone_number } = req.body;

    if (!phone_number) {
        return res.status(400).json({ code: 400, status: 'fail', message: 'Phone number is required' });
    }

    const userResult = await pool.query('SELECT * FROM admins WHERE phone_number = $1', [phone_number]);
    if (userResult.rows.length === 0) {
        return res.status(400).json({ code: 400, status: 'fail', message: 'Admin not found' });

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
        const userResult = await pool.query('SELECT * FROM admins WHERE phone_number = $1', [phone_number]);

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
            const role = existingUser.role_id == 1 ? 'admin' : 'restaurant_owner'
            const token = jwt.sign({ id: userResult.rows[0].id, role }, process.env.JWT_SECRET, { expiresIn: '30d' });

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

// Add admin
const addAdmin = async (req, res) => {
    const { name, phone_number, email, role_id } = req.body;

    if (!name || !phone_number || !email || !role_id) {
        return res.status(400).json({ code: 400, status: 'fail', message: 'All fields are required' });
    }
    try {
        // Check number is in the database
        const numberExists = await pool.query('SELECT * FROM admins WHERE phone_number = $1 ORDER BY created_at DESC LIMIT 1', [phone_number]);
        if (numberExists.rows.length !== 0) {
            return res.status(400).json({ code: 400, status: 'fail', message: 'Number already exists' });
        }

        // Check number is in the database
        const emailExists = await pool.query('SELECT * FROM admins WHERE email = $1 ORDER BY created_at DESC LIMIT 1', [email]);
        if (emailExists.rows.length !== 0) {
            return res.status(400).json({ code: 400, status: 'fail', message: 'Email already exists' });
        }

        await pool.query(`INSERT INTO admins (name,phone_number,email,role_id) VALUES ($1,$2,$3,$4)`, [name, phone_number, email, role_id]);

        return res.status(200).json({
            code: 200,
            status: 'success',
            message: 'Admin created successfully'
        });
    } catch (error) {
        console.error('Error verifying OTP:', error);
        return res.status(500).json({
            code: 500,
            status: 'fail',
            message: 'An error occurred while verifying the OTP',
        });
    }
};
// Add admin
const getAllAdmin = async (req, res) => {
    try {
        // Check number is in the database
        const admins = await pool.query('SELECT * FROM admins where role_id= 2 ORDER BY created_at DESC ');
        return res.status(200).json({
            code: 200,
            status: 'success',
            message: 'Admin created successfully',
            data: admins.rows
        });
    } catch (error) {
        return res.status(500).json({
            code: 500,
            status: 'fail',
            message: 'An error occurred while fetching the admin',
        });
    }
};

module.exports = { sendOtpToPhone, verifyOtp, addAdmin, getAllAdmin };
