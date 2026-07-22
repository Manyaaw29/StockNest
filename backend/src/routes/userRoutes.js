const express = require('express');
const router  = express.Router();
const { getUsers, updateUser } = require('../controllers/authController');
const { authMiddleware, checkRole } = require('../middleware/authMiddleware');

// GET /api/users - Get all users in the organization (Restricted to Admins and Managers)
router.get('/', authMiddleware, checkRole('Admin', 'Manager'), getUsers);

// PUT /api/users/:id - Update user details (Admins can update anyone, Staff/Managers can update themselves)
router.put('/:id', authMiddleware, updateUser);

module.exports = router;
