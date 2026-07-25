const pool = require('../config/db');

const getRooms = async (req, res) => {
  try {
    const { category, date, time, duration } = req.query;

    let query = 'SELECT * FROM room WHERE org_id = $1 AND status = $2';
    let params = [req.orgId, 'Available'];

    if (category) {
      query += ` AND category = $${params.length + 1}`;
      params.push(category);
    }

    // Only apply availability filter when date + time + duration are all provided
    if (date && time && duration) {
      // Compute end_time from start_time + duration (minutes)
      const [h, m] = time.split(':').map(Number);
      const totalMins = h * 60 + m + parseInt(duration, 10);
      const endH = Math.floor(totalMins / 60) % 24;
      const endM = totalMins % 60;
      const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

      // Exclude rooms that have a conflicting booking on this date/time range
      // Overlap condition: existing booking's window intersects with requested [time, endTime)
      // A conflict exists when:
      //   existing.start < requested.end  AND  existing.end > requested.start
      // We also handle overnight bookings with the CASE interval trick
      query += ` AND room_id NOT IN (
        SELECT room_id FROM booking
        WHERE status != 'cancelled'
        AND booking_date = $${params.length + 1}::date
        AND (
          start_time < $${params.length + 3}::time
          AND (
            end_time + CASE WHEN end_time <= start_time THEN interval '1 day' ELSE interval '0' END
          ) > $${params.length + 2}::time
        )
      )`;
      params.push(date, time, endTime);
    }

    query += ' ORDER BY room_name ASC';
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
  const { room_name, category, amenities } = req.body;
  if (!room_name || !category) {
    return res.status(400).json({ message: 'room_name and category are required.' });
  }
  try {
    const result = await pool.query(`INSERT INTO room (org_id, room_name, category, amenities, status) VALUES ($1, $2, $3, $4, 'Available') RETURNING *`, [req.orgId, room_name, category, JSON.stringify(amenities || [])]);
    return res.status(201).json({ message: 'Room created successfully.', room: result.rows[0] });
  } catch (err) {
    console.error('Create room error:', err.message);
    return res.status(500).json({ message: 'Server error.' });
  }
};

const updateRoom = async (req, res) => {
  const { id } = req.params;
  const { room_name, category, amenities, status } = req.body;
  try {
    const result = await pool.query(`UPDATE room SET room_name = COALESCE($1, room_name), category = COALESCE($2, category), amenities = COALESCE($3, amenities), status = COALESCE($4, status) WHERE room_id = $5 AND org_id = $6 RETURNING *`, [room_name, category, JSON.stringify(amenities || null), status, id, req.orgId]);
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