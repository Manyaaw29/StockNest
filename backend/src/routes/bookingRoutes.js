const express = require('express');
const router = express.Router();

const { createBooking, getBookings, getBookingById, updateBooking, deleteBooking } = require('../controllers/bookingController');
const { authMiddleware } = require('../middleware/authMiddleware');

// GET /api/bookings - Get user's bookings (any logged-in user)
router.get('/', authMiddleware, getBookings);

// GET /api/bookings/:id - Get one booking (any logged-in user)
router.get('/:id', authMiddleware, getBookingById);

// POST /api/bookings - Create booking (any logged-in user)
router.post('/', authMiddleware, createBooking);

// PUT /api/bookings/:id - Update booking (any logged-in user)
router.put('/:id', authMiddleware, updateBooking);

// DELETE /api/bookings/:id - Cancel booking (any logged-in user)
router.delete('/:id', authMiddleware, deleteBooking);

module.exports = router;