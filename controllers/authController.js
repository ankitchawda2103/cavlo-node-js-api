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
        const userResult = await pool.query('SELECT * FROM users WHERE phone_number = $1', [phone_number]);

        // OTP is valid, generate JWT token

        if (userResult.rows.length === 0) {
            // New user, create user entry
            const newUser = await pool.query(
                `INSERT INTO users (phone_number,via)
                 VALUES ($1,'number')
                 RETURNING id, phone_number`,
                [phone_number]
            );
            const createdUser = newUser.rows[0];
            const token = jwt.sign({ id: createdUser.id, role: 'user' }, process.env.JWT_SECRET, { expiresIn: '30d' });
            // Return response indicating the user is new and provide the token
            return res.status(200).json({
                code: 200,
                status: 'success',
                message: 'OTP verified successfully',
                data: {
                    user: createdUser,  // User data after creation
                    token
                },
            });
        } else {
            // Existing user, check if basic details are filled
            const existingUser = userResult.rows[0];
            const token = jwt.sign({ id: userResult.rows[0].id, role: 'user' }, process.env.JWT_SECRET, { expiresIn: '30d' });

            return res.status(200).json({
                code: 200,
                status: 'success',
                message: 'OTP verified successfully',
                data: {
                    user: existingUser,  // Return existing user data
                    token,
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

// Login With Google and generate JWT token
const socailLogin = async (req, res) => {
    const { email, via } = req.body;

    if (!email) {
        return res.status(400).json({ code: 400, status: 'fail', message: 'Email is required' });
    }
    try {
        // Check OTP in the database
        const emailResult = await pool.query('SELECT * FROM users WHERE email = $1 ', [email]);

        if (emailResult.rows.length === 0) {
            const newUser = await pool.query(
                `INSERT INTO users (email,via)
                 VALUES ($1,$2)
                 RETURNING id, email`,
                [email, via]
            );

            const createdUser = newUser.rows[0];
            const token = jwt.sign({ id: createdUser.id, role: 'user' }, process.env.JWT_SECRET, { expiresIn: '30d' });

            // Return response indicating the user is new and provide the token
            return res.status(200).json({
                code: 200,
                status: 'success',
                message: 'OTP verified successfully',
                data: {
                    user: createdUser,  // User data after creation
                    token,
                },
            });
        } else {
            const existingUser = emailResult.rows[0];
            if (existingUser.via !== via) {
                return res.status(400).json({ code: 400, status: 'fail', message: 'Please use different method to login' });
            }
            const token = jwt.sign({ id: emailResult.rows[0].id, role: 'user' }, process.env.JWT_SECRET, { expiresIn: '30d' });

            return res.status(200).json({
                code: 200,
                status: 'success',
                message: 'OTP verified successfully',
                data: {
                    user: existingUser,  // Return existing user data
                    token,
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

module.exports = { sendOtpToPhone, verifyOtp, socailLogin };
