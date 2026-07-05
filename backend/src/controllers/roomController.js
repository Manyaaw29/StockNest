const pool = require('../config/db');

// ─────────────────────────────────────────────
// GET /api/rooms - List all rooms
// ─────────────────────────────────────────────
const getRooms = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM room WHERE org_id = $1',
      [req.orgId]  // Filter by user's organization
    );
    
    return res.status(200).json({
      message: 'Rooms retrieved successfully.',
      rooms: result.rows
    });
  } catch (err) {
    console.error('Get rooms error:', err.message);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// ─────────────────────────────────────────────
// GET /api/rooms/:id - Get one room
// ─────────────────────────────────────────────
const getRoomById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM room WHERE room_id = $1 AND org_id = $2',
      [id, req.orgId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Room not found.' });
    }
    
    return res.status(200).json({ room: result.rows[0] });
  } catch (err) {
    console.error('Get room error:', err.message);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// ─────────────────────────────────────────────
// POST /api/rooms - Create room (Admin only)
// ─────────────────────────────────────────────
const createRoom = async (req, res) => {
  const { room_name, capacity, amenities } = req.body;
  
  if (!room_name || !capacity) {
    return res.status(400).json({ message: 'room_name and capacity are required.' });
  }
  
  try {
    const result = await pool.query(
      `INSERT INTO room (org_id, room_name, capacity, amenities, status)
       VALUES ($1, $2, $3, $4, 'Available')
       RETURNING *`,
      [req.orgId, room_name, capacity, JSON.stringify(amenities || [])]  // ← FIXED
    );
    
    return res.status(201).json({
      message: 'Room created successfully.',
      room: result.rows[0]
    });
  } catch (err) {
    console.error('Create room error:', err.message);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// ─────────────────────────────────────────────
// PUT /api/rooms/:id - Update room (Admin only)
// ─────────────────────────────────────────────
const updateRoom = async (req, res) => {
  const { id } = req.params;
  const { room_name, capacity, amenities, status } = req.body;
  
  try {
    const result = await pool.query(
      `UPDATE room 
       SET room_name = COALESCE($1, room_name),
           capacity = COALESCE($2, capacity),
           amenities = COALESCE($3, amenities),
           status = COALESCE($4, status)
       WHERE room_id = $5 AND org_id = $6
       RETURNING *`,
      [room_name, capacity, JSON.stringify(amenities || null), status, id, req.orgId]  // ← FIXED
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Room not found.' });
    }
    
    return res.status(200).json({
      message: 'Room updated successfully.',
      room: result.rows[0]
    });
  } catch (err) {
    console.error('Update room error:', err.message);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// ─────────────────────────────────────────────
// DELETE /api/rooms/:id - Delete room (Admin only)
// ─────────────────────────────────────────────
const deleteRoom = async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await pool.query(
      'DELETE FROM room WHERE room_id = $1 AND org_id = $2 RETURNING *',
      [id, req.orgId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Room not found.' });
    }
    
    return res.status(200).json({ message: 'Room deleted successfully.' });
  } catch (err) {
    console.error('Delete room error:', err.message);
    return res.status(500).json({ message: 'Server error.' });
  }
};

module.exports = { getRooms, getRoomById, createRoom, updateRoom, deleteRoom };