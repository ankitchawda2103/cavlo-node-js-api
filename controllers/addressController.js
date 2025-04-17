const { pool } = require('../config/db');

// Get All User Addresses
const getUserAddresses = async (req, res) => {
    const user_id = req.user.id;  // Assuming user ID is available in the JWT token

    try {
        const result = await pool.query('SELECT * FROM user_addresses WHERE user_id = $1', [user_id]);
        res.status(200).json({
            code: 200,
            status: 'success',
            message: 'Addresses fetched successfully',
            data: result.rows,
        });
    } catch (error) {
        console.error('Error fetching addresses:', error);
        res.status(500).json({ code: 500, status: 'fail', message: 'Failed to fetch addresses' });
    }
};

// Get All User Addresses
const getAddressById = async (req, res) => {
    const user_id = req.user.id;  // Assuming user ID is available in the JWT token
    const { id } = req.params;  // Assuming user ID is available in the JWT token

    try {
        const result = await pool.query('SELECT * FROM user_addresses WHERE user_id = $1 AND id = $2', [user_id, id]);
        if (result.rows.length == 0) {
            return res.status(400).json({
                code: 400,
                status: 'fail',
                message: 'Addresses not found',
            });
        }
        res.status(200).json({
            code: 200,
            status: 'success',
            message: 'Addresses fetched successfully',
            data: result.rows[0],
        });
    } catch (error) {
        console.error('Error fetching addresses:', error);
        res.status(500).json({ code: 500, status: 'fail', message: 'Failed to fetch addresses' });
    }
};

// Add User Address
const addAddress = async (req, res) => {
    const { address, apartment_number, street_name, postal_code, address_type, is_default, lat, lng } = req.body;
    const user_id = req.user.id;  // Assuming user ID is available in the JWT token

    // Validate required fields
    if (!address || !street_name || !address_type) {
        return res.status(400).json({ code: 400, status: 'fail', message: 'Address, street name, and address type are required' });
    }

    // If is_default is true, check if the user already has a default address
    if (is_default) {
        const updateDefaultResult = await pool.query(
            'UPDATE user_addresses SET is_default = false WHERE user_id = $1 AND is_default = true RETURNING *',
            [user_id]
        );
    }

    try {
        // Insert the new address into the database
        const result = await pool.query(
            `INSERT INTO user_addresses (user_id, address, apartment_number, street_name, postal_code, address_type, is_default, lat, lng)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
            [user_id, address, apartment_number, street_name, postal_code, address_type, is_default, lat, lng]
        );

        res.status(200).json({
            code: 200,
            status: 'success',
            message: 'Address added successfully',
            data: result.rows[0],
        });
    } catch (error) {
        console.error('Error adding address:', error);
        res.status(500).json({ code: 500, status: 'fail', message: 'Failed to add address' });
    }
};

// Update User Address
const updateAddress = async (req, res) => {
    const { id } = req.params;
    const { address, apartment_number, street_name, postal_code, address_type, is_default, lat, lng } = req.body;
    const user_id = req.user.id;

    try {
        // If the address is being set as default, ensure no other default address exists
        // If is_default is true, check if the user already has a default address
        if (is_default) {
            const updateDefaultResult = await pool.query(
                'UPDATE user_addresses SET is_default = false WHERE user_id = $1 AND is_default = true RETURNING *',
                [user_id]
            );
        }


        const result = await pool.query(
            `UPDATE user_addresses SET address = COALESCE($1, address), apartment_number = COALESCE($2, apartment_number),
            street_name = COALESCE($3, street_name), postal_code = COALESCE($4, postal_code), address_type = COALESCE($5, address_type),
            is_default = COALESCE($6, is_default), lat = COALESCE($7, lat), lng = COALESCE($8, lng), updated_at = CURRENT_TIMESTAMP
            WHERE id = $9 AND user_id = $10 RETURNING *`,
            [address, apartment_number, street_name, postal_code, address_type, is_default, lat, lng, id, user_id]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ code: 400, status: "fail", message: 'Address not found or does not belong to this user' });
        }

        res.status(200).json({
            code: 200,
            status: 'success',
            message: 'Address updated successfully',
            data: result.rows[0],
        });
    } catch (error) {
        console.error('Error updating address:', error);
        res.status(500).json({ code: 500, status: "fail", message: 'Failed to update address' });
    }
};


// Delete User Address
const deleteAddress = async (req, res) => {
    const { id } = req.params;
    const user_id = req.user.id;

    try {
        const result = await pool.query('DELETE FROM user_addresses WHERE id = $1 AND user_id = $2 RETURNING *', [id, user_id]);

        if (result.rows.length === 0) {
            return res.status(400).json({ code: 400, status: "fail", message: 'Address not found' });
        }

        res.status(200).json({
            code: 200,
            status: 'success',
            message: 'Address deleted successfully',
            data: result.rows[0],
        });
    } catch (error) {
        console.error('Error deleting address:', error);
        res.status(500).json({ code: 500, status: "fail", message: 'Failed to delete address' });
    }
};


module.exports = { addAddress, getUserAddresses, getAddressById, deleteAddress, updateAddress };
