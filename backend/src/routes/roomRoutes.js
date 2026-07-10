const express = require('express');
const router = express.Router();

const { getRooms, getRoomById, createRoom, updateRoom, deleteRoom } = require('../controllers/roomController');
const { authMiddleware, checkRole } = require('../middleware/authMiddleware');

// GET /api/rooms - List all rooms (any logged-in user)
router.get('/', authMiddleware, getRooms);

// GET /api/rooms/:id - Get one room (any logged-in user)
router.get('/:id', authMiddleware, getRoomById);

// POST /api/rooms - Create room (Admin only)
router.post('/', authMiddleware, checkRole('Admin'), createRoom);

// PUT /api/rooms/:id - Update room (Admin only)
router.put('/:id', authMiddleware, checkRole('Admin'), updateRoom);

// DELETE /api/rooms/:id - Delete room (Admin only)
router.delete('/:id', authMiddleware, checkRole('Admin'), deleteRoom);

module.exports = router;