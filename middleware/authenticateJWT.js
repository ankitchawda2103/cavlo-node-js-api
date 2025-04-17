const jwt = require('jsonwebtoken');

// Middleware to verify JWT token
const authenticateJWT = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
        return res.status(403).json({
            code: 403,
            status: 'unauthorized',
            message: 'No token provided. Authorization denied.',
        });
    }

    try {
        // Verify the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;  // Store the decoded token (i.e., phone_number)
        next();
    } catch (error) {
        return res.status(403).json({
            code: 403,
            status: 'unauthorized',
            message: 'Invalid or expired token',
        });
    }
};

// Middleware to check if the user is an Admin
const isUser = (req, res, next) => {
    if (req.user && req.user.role === 'user') {
        next(); // Allow access to the route if the user is an admin
    } else {
        return res.status(403).json({
            code: 403,
            status: 'unauthorized',
            message: 'Access denied. Admins only.',
        });
    }
};

// Middleware to check if the user is an Admin
const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next(); // Allow access to the route if the user is an admin
    } else {
        return res.status(403).json({
            code: 403,
            status: 'unauthorized',
            message: 'Access denied. Admins only.',
        });
    }
};

// Middleware to check if the user is a Staff member
const isStaff = (req, res, next) => {
    if (req.user && req.user.role === 'staff') {
        next(); // Allow access to the route if the user is a staff member
    } else {
        return res.status(403).json({
            code: 403,
            status: 'unauthorized',
            message: 'Access denied. Staff only.',
        });
    }
};

// Middleware to check if the user is a Restaurant Owner
const isRestaurantOwner = (req, res, next) => {
    if (req.user && req.user.role === 'restaurant_owner') {
        next(); // Allow access to the route if the user is a restaurant owner
    } else {
        return res.status(403).json({
            code: 403,
            status: 'unauthorized',
            message: 'Access denied. Restaurant owners only.',
        });
    }
};

// Combine authentication and role-checking middleware
const authenticateAndAuthorize = (role) => {
    return [authenticateJWT, role === 'admin' ? isAdmin : role === 'restaurant_owner' ? isRestaurantOwner : role === 'user' ? isUser :
        (req, res) => res.status(403).json({
            code: 403,
            status: 'unauthorized',
            message: 'Access denied',
        })
    ];
};

module.exports = { authenticateJWT, isAdmin, isStaff, isRestaurantOwner, authenticateAndAuthorize };
