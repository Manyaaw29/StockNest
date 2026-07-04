const express = require('express');
const router  = express.Router();

const { register, login, getMe } = require('../controllers/authController');
const { authMiddleware, checkRole } = require('../middleware/authMiddleware');

// POST /api/auth/register  — register new user accounts (public)
router.post('/register', register);

// POST /api/auth/login  — public
router.post('/login', login);

// GET  /api/auth/me  — any logged-in user can get their own info
router.get('/me', authMiddleware, getMe);

module.exports = router;