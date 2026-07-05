const { verifyToken } = require('../config/jwt');

// Protect routes - verify JWT token
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'No token provided.' });
  }
  
  try {
    const decoded = verifyToken(token);
    req.userId = decoded.user_id;
    req.userEmail = decoded.email;
    req.userRole = decoded.role;
    req.orgId = decoded.org_id;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token.' });
  }
};

// Check user role
const checkRole = (allowedRoles) => {
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