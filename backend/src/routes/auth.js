const express = require('express');
const router = express.Router();
const { register, login, getMe } = require('../controllers/authController');
const { authMiddleware } = require('../middleware/authMiddleware');

// Public routes (no authentication needed)
router.post('/register', register);           // POST /api/auth/register
router.post('/login', login);                 // POST /api/auth/login

// Protected routes (require JWT token)
router.get('/me', authMiddleware, getMe);    // GET /api/auth/me

module.exports = router;