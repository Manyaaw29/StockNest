const pool = require('../config/db');

// Get all assets for a specific room
const getAssetsByRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    
    // Check if room exists and belongs to the org
    const roomCheck = await pool.query('SELECT * FROM room WHERE room_id = $1 AND org_id = $2', [roomId, req.orgId]);
    if (roomCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Room not found.' });
    }

    const result = await pool.query('SELECT * FROM asset WHERE room_id = $1 AND org_id = $2 ORDER BY asset_id ASC', [roomId, req.orgId]);
    
    return res.status(200).json({
      message: 'Assets retrieved successfully.',
      assets: result.rows
    });
  } catch (err) {
    console.error('Get assets by room error:', err.message);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// Transfer an asset to a different room
const transferAsset = async (req, res) => {
  try {
    const { assetId, targetRoomId, reason } = req.body;
    const userId = req.user?.id || req.userId; // Depending on how authMiddleware sets the user ID

    if (!assetId || !targetRoomId) {
      return res.status(400).json({ message: 'assetId and targetRoomId are required.' });
    }

    // Check asset exists
    const assetCheck = await pool.query('SELECT * FROM asset WHERE asset_id = $1 AND org_id = $2', [assetId, req.orgId]);
    if (assetCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Asset not found.' });
    }
    const currentRoomId = assetCheck.rows[0].room_id;

    // Verify the target room belongs to the org
    const roomCheck = await pool.query('SELECT * FROM room WHERE room_id = $1 AND org_id = $2', [targetRoomId, req.orgId]);
    if (roomCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Target room not found.' });
    }

    // Update the asset's room_id
    const updateResult = await pool.query(
      'UPDATE asset SET room_id = $1 WHERE asset_id = $2 AND org_id = $3 RETURNING *',
      [targetRoomId, assetId, req.orgId]
    );

    // Insert into transfer_history
    await pool.query(
      'INSERT INTO transfer_history (org_id, asset_id, from_room_id, to_room_id, initiated_by, reason) VALUES ($1, $2, $3, $4, $5, $6)',
      [req.orgId, assetId, currentRoomId, targetRoomId, userId, reason || 'Transferred']
    );

    return res.status(200).json({
      message: 'Asset transferred successfully.',
      asset: updateResult.rows[0]
    });
  } catch (err) {
    console.error('Transfer asset error:', err.message);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// Get transfer history for a specific room
const getTransferHistory = async (req, res) => {
  try {
    const { roomId } = req.params;
    
    // Fetch transfers where the room is either the source or destination
    const query = `
      SELECT th.*, 
             a.name as asset_name, 
             r1.room_name as from_room_name, 
             r2.room_name as to_room_name,
             u.name as initiated_by_name
      FROM transfer_history th
      JOIN asset a ON th.asset_id = a.asset_id
      LEFT JOIN room r1 ON th.from_room_id = r1.room_id
      LEFT JOIN room r2 ON th.to_room_id = r2.room_id
      LEFT JOIN users u ON th.initiated_by = u.user_id
      WHERE th.org_id = $1 AND (th.from_room_id = $2 OR th.to_room_id = $2)
      ORDER BY th.transfer_date DESC
      LIMIT 50
    `;
    
    const result = await pool.query(query, [req.orgId, roomId]);
    
    return res.status(200).json({
      message: 'Transfer history retrieved successfully.',
      history: result.rows
    });
  } catch (err) {
    console.error('Get transfer history error:', err.message);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// Register a new asset in a specific room
const registerAsset = async (req, res) => {
  try {
    const { roomId, name, category } = req.body;
    
    if (!roomId || !name || !category) {
      return res.status(400).json({ message: 'roomId, name, and category are required.' });
    }

    // Verify room
    const roomCheck = await pool.query('SELECT * FROM room WHERE room_id = $1 AND org_id = $2', [roomId, req.orgId]);
    if (roomCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Room not found.' });
    }

    const result = await pool.query(
      'INSERT INTO asset (org_id, room_id, name, category, condition_level, current_value, status) VALUES ($1, $2, $3, $4, 100, 0, $5) RETURNING *',
      [req.orgId, roomId, name, category, 'Active']
    );

    return res.status(201).json({
      message: 'Asset registered successfully.',
      asset: result.rows[0]
    });
  } catch (err) {
    console.error('Register asset error:', err.message);
    return res.status(500).json({ message: 'Server error.' });
  }
};

module.exports = {
  getAssetsByRoom,
  transferAsset,
  getTransferHistory,
  registerAsset
};
