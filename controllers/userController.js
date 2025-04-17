const { pool } = require('../config/db');

// Get User Data
const getUser = async (req, res) => {
    try {
        const id = req.user.id;  // Get id from the JWT token
        const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(400).json({
                code: 400,
                status: 'fail',
                message: 'User not found',
            });
        }

        const existingUser = result.rows[0];
        return res.status(200).json({
            code: 200,
            status: 'success',
            data: {
                user: existingUser,
            },
        });
    } catch (error) {
        console.error('Error getting user:', error);
        return res.status(500).json({
            code: 500,
            status: 'fail',
            message: 'An error occurred while fetching user data',
        });
    }
};

// Update User Data
const updateUser = async (req, res) => {
    const id = req.user.id;  // Get id from the JWT toke
    const { name, phone_number, nick_name, email, dob, gender } = req.body;
    // Profile image is being sent through multer (file will be in req.file)
    const profile_image = req.file ? req.file.location : null;  // URL of the uploaded image on S3   
    // Validate that at least one field is provided for the update
    if (!name && !nick_name && !email && !dob && !gender && !profile_image) {
        return res.status(400).json({
            code: 400,
            status: 'fail',
            message: 'At least one field is required to update',
        });
    }

    try {

        const existingNumber = await pool.query('SELECT * FROM users WHERE phone_number = $1 AND id != $2', [phone_number, id]);

        if (existingNumber.rows.length > 0) {
            return res.status(400).json({ code: 400, status: "fail", message: 'Phone number already exists' });
        }
        const existingEmail = await pool.query('SELECT * FROM users WHERE email = $1 AND id != $2', [email, id]);
        if (existingEmail.rows.length > 0) {
            return res.status(400).json({ code: 400, status: "fail", message: 'Email already exists' });
        }
        var is_profile_completed = true;

        // Update the user record in the users table
        const result = await pool.query(
            `UPDATE users
            SET name = COALESCE($1, name),
                email = COALESCE($2, email),
                dob = COALESCE($3, dob),
                gender = COALESCE($4, gender),
                nick_name = COALESCE($5, nick_name),
                profile_image = COALESCE($6, profile_image),
                phone_number = COALESCE($7, phone_number),
                is_profile_completed = COALESCE($8,is_profile_completed),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $9
            RETURNING *`,
            [name, email, dob, gender, nick_name, profile_image, phone_number, is_profile_completed, id]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({
                code: 400,
                status: 'fail',
                message: 'User not found',
            });
        }

        return res.status(200).json({
            code: 200,
            status: 'success',
            message: 'User updated successfully',
            data: result.rows[0],  // Return the updated user data
        });
    } catch (error) {
        console.error('Error updating user:', error);
        return res.status(500).json({
            code: 500,
            status: 'fail',
            message: 'An error occurred while updating user data',
        });
    }
};
// Endpoint to update FCM token for the user
const updateFcmToken = async (req, res) => {
    const userId = req.user.id; // Assuming you're using auth middleware
    const { fcmToken } = req.body;
  
    if (!fcmToken) {
      return res.status(400).json({
        code: 400,
        status: "fail",
        message: "FCM token is required",
      });
    }
  
    try {
      await pool.query(
        `UPDATE users SET fcm_token = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [fcmToken, userId]
      );
  
      res.status(200).json({
        code: 200,
        status: "success",
        message: "FCM token updated successfully",
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        code: 500,
        status: "fail",
        message: "Failed to update FCM token",
      });
    }
  };
  

module.exports = { getUser, updateUser ,updateFcmToken};
