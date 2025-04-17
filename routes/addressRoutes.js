const express = require('express');
const { addAddress, getUserAddresses, getAddressById, deleteAddress, updateAddress } = require('../controllers/addressController');
const { authenticateAndAuthorize } = require('../middleware/authenticateJWT');

const router = express.Router();

// Get all addresses for the user
router.post('/get-all-address', authenticateAndAuthorize('user'), getUserAddresses);

// Get address by id for the user
router.post('/get-address-by-id/:id', authenticateAndAuthorize('user'), getAddressById);

// Add address for the user
router.post('/add-address', authenticateAndAuthorize('user'), addAddress);

// Update a specific address
router.put('/edit-address/:id', authenticateAndAuthorize('user'), updateAddress);

// Delete a specific address
router.delete('/delete-address/:id', authenticateAndAuthorize('user'), deleteAddress);


module.exports = router;
