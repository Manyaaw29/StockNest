const pool = require('../config/db');

const getRooms = async (req, res) => {
  try {
    const { capacity, booking_date, start_time, end_time } = req.query;
    let query = 'SELECT * FROM room WHERE org_id = $1 AND status = $2';
    let params = [req.orgId, 'Available'];
    if (capacity) {
      query += ` AND capacity >= $${params.length + 1}`;
      params.push(parseInt(capacity));
    }
    if (booking_date && start_time && end_time) {
      query += ` AND room_id NOT IN (SELECT room_id FROM booking WHERE booking_date = $${params.length + 1} AND start_time < $${params.length + 2} AND end_time > $${params.length + 3} AND status != 'cancelled')`;
      params.push(booking_date, end_time, start_time);
    }
    const result = await pool.query(query, params);
    return res.status(200).json({ message: 'Rooms retrieved successfully.', rooms: result.rows });
  } catch (err) {
    console.error('Get rooms error:', err.message);
    return res.status(500).json({ message: 'Server error.' });
  }
};

const getRoomById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM room WHERE room_id = $1 AND org_id = $2', [id, req.orgId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Room not found.' });
    }
    return res.status(200).json({ room: result.rows[0] });
  } catch (err) {
    console.error('Get room error:', err.message);
    return res.status(500).json({ message: 'Server error.' });
  }
};

const createRoom = async (req, res) => {
  const { room_name, capacity, amenities } = req.body;
  if (!room_name || !capacity) {
    return res.status(400).json({ message: 'room_name and capacity are required.' });
  }
  try {
    const result = await pool.query(`INSERT INTO room (org_id, room_name, capacity, amenities, status) VALUES ($1, $2, $3, $4, 'Available') RETURNING *`, [req.orgId, room_name, capacity, JSON.stringify(amenities || [])]);
    return res.status(201).json({ message: 'Room created successfully.', room: result.rows[0] });
  } catch (err) {
    console.error('Create room error:', err.message);
    return res.status(500).json({ message: 'Server error.' });
  }
};

const updateRoom = async (req, res) => {
  const { id } = req.params;
  const { room_name, capacity, amenities, status } = req.body;
  try {
    const result = await pool.query(`UPDATE room SET room_name = COALESCE($1, room_name), capacity = COALESCE($2, capacity), amenities = COALESCE($3, amenities), status = COALESCE($4, status) WHERE room_id = $5 AND org_id = $6 RETURNING *`, [room_name, capacity, JSON.stringify(amenities || null), status, id, req.orgId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Room not found.' });
    }
    return res.status(200).json({ message: 'Room updated successfully.', room: result.rows[0] });
  } catch (err) {
    console.error('Update room error:', err.message);
    return res.status(500).json({ message: 'Server error.' });
  }
};

const deleteRoom = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM room WHERE room_id = $1 AND org_id = $2 RETURNING *', [id, req.orgId]);
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