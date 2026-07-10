const pool = require('../config/db');

// ─────────────────────────────────────────────
// POST /api/bookings - Create booking
// ─────────────────────────────────────────────
const createBooking = async (req, res) => {
  const { room_id, booking_date, start_time, end_time, attendees } = req.body;
  
  if (!room_id || !booking_date || !start_time || !end_time) {
    return res.status(400).json({ message: 'room_id, booking_date, start_time, end_time are required.' });
  }
  
  try {
    // Check if room exists
    const roomCheck = await pool.query('SELECT * FROM room WHERE room_id = $1', [room_id]);
    if (roomCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Room not found.' });
    }
    
    // Check for conflicts
    const conflictCheck = await pool.query(
      `SELECT * FROM booking 
       WHERE room_id = $1 AND booking_date = $2 
       AND start_time < $4 AND end_time > $3
       AND status != 'cancelled'`,
      [room_id, booking_date, start_time, end_time]
    );
    
    if (conflictCheck.rows.length > 0) {
      return res.status(409).json({ message: 'Room is already booked for this time.' });
    }
    
    // Create booking
    const result = await pool.query(
      `INSERT INTO booking (user_id, room_id, booking_date, start_time, end_time, attendees, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'confirmed')
       RETURNING *`,
      [req.userId, room_id, booking_date, start_time, end_time, attendees || 1]
    );
    
    return res.status(201).json({
      message: 'Booking created successfully.',
      booking: result.rows[0]
    });
  } catch (err) {
    console.error('Create booking error:', err.message);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// ─────────────────────────────────────────────
// GET /api/bookings - Get user's bookings
// ─────────────────────────────────────────────
const getBookings = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.*, r.room_name FROM booking b
       JOIN room r ON b.room_id = r.room_id
       WHERE b.user_id = $1
       ORDER BY b.booking_date DESC`,
      [req.userId]
    );
    
    return res.status(200).json({
      message: 'Bookings retrieved successfully.',
      bookings: result.rows
    });
  } catch (err) {
    console.error('Get bookings error:', err.message);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// ─────────────────────────────────────────────
// GET /api/bookings/:id - Get one booking
// ─────────────────────────────────────────────
const getBookingById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `SELECT b.*, r.room_name FROM booking b
       JOIN room r ON b.room_id = r.room_id
       WHERE b.booking_id = $1 AND b.user_id = $2`,
      [id, req.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Booking not found.' });
    }
    
    return res.status(200).json({ booking: result.rows[0] });
  } catch (err) {
    console.error('Get booking error:', err.message);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// ─────────────────────────────────────────────
// PUT /api/bookings/:id - Update booking
// ─────────────────────────────────────────────
const updateBooking = async (req, res) => {
  const { id } = req.params;
  const { booking_date, start_time, end_time, attendees, status } = req.body;
  
  try {
    const result = await pool.query(
      `UPDATE booking 
       SET booking_date = COALESCE($1, booking_date),
           start_time = COALESCE($2, start_time),
           end_time = COALESCE($3, end_time),
           attendees = COALESCE($4, attendees),
           status = COALESCE($5, status)
       WHERE booking_id = $6 AND user_id = $7
       RETURNING *`,
      [booking_date, start_time, end_time, attendees, status, id, req.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Booking not found.' });
    }
    
    return res.status(200).json({
      message: 'Booking updated successfully.',
      booking: result.rows[0]
    });
  } catch (err) {
    console.error('Update booking error:', err.message);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// ─────────────────────────────────────────────
// DELETE /api/bookings/:id - Cancel booking
// ─────────────────────────────────────────────
const deleteBooking = async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await pool.query(
      'UPDATE booking SET status = $1 WHERE booking_id = $2 AND user_id = $3 RETURNING *',
      ['cancelled', id, req.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Booking not found.' });
    }
    
    return res.status(200).json({ message: 'Booking cancelled successfully.' });
  } catch (err) {
    console.error('Delete booking error:', err.message);
    return res.status(500).json({ message: 'Server error.' });
  }
};

module.exports = { createBooking, getBookings, getBookingById, updateBooking, deleteBooking };