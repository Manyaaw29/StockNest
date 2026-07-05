const { verifyToken } = require('../config/jwt');

// Protect routes - verify JWT token
const authMiddleware = (req, res, next) => {
    try {
        // Get token from headers
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No token provided'
            });
        }

        // Verify token
        const decoded = verifyToken(token);

        if (!decoded) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }

    
        // Attach user info to request
        req.userId = decoded.user_id;   // ✅ CORRECT - matches token
        req.userEmail = decoded.email;
        req.userRole = decoded.role;
        req.orgId = decoded.org_id;

        // Backward compatibility for req.user nested format
        req.user = {
            user_id: decoded.user_id,
            email: decoded.email,
            role: decoded.role,
            org_id: decoded.org_id
        };

        next();
    } catch (error) {
        res.status(401).json({
            success: false,
            message: 'Token verification failed',
            error: error.message
        });
    }
};

// Check user role
const checkRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!allowedRoles.includes(req.userRole)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Insufficient permissions'
            });
        }
        next();
    };
};

module.exports = {
    authMiddleware,
    checkRole
};