const express = require('express');
const router = express.Router();
const { getAssetsByRoom, transferAsset, getTransferHistory, registerAsset } = require('../controllers/assetController');
const { authMiddleware } = require('../middleware/authMiddleware');

// GET /api/assets/room/:roomId - List all assets for a room
router.get('/room/:roomId', authMiddleware, getAssetsByRoom);

// GET /api/assets/room/:roomId/history - Get transfer history for a room
router.get('/room/:roomId/history', authMiddleware, getTransferHistory);

// POST /api/assets/transfer - Transfer an asset to a new room
router.post('/transfer', authMiddleware, transferAsset);

// POST /api/assets/register - Register a new asset
router.post('/register', authMiddleware, registerAsset);

module.exports = router;
