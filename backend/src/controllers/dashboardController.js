const pool = require('../config/db');

// ─────────────────────────────────────────────
// GET /api/dashboard
// Returns summary stats for the Workspace Dashboard
// ─────────────────────────────────────────────
const getDashboard = async (req, res) => {
  try {
    const [
      totalRoomsResult,
      occupiedRoomsResult,
      availableRoomsResult,
      todayBookingsResult,
      bookingTrendResult,
      occupancyResult,
      upcomingBookingsResult,
      roomAvailabilityResult,
    ] = await Promise.all([
      // Count all rooms.
      pool.query('SELECT COUNT(*) AS count FROM room'),
      // Count rooms currently marked as booked.
      pool.query("SELECT COUNT(*) AS count FROM room WHERE status = 'Booked'"),
      // Count rooms currently marked as available.
      pool.query("SELECT COUNT(*) AS count FROM room WHERE status = 'Available'"),
      // Count bookings scheduled for today.
      pool.query('SELECT COUNT(*) AS count FROM booking WHERE booking_date = CURRENT_DATE'),
      // Count bookings for each of the last seven days, including days with no bookings.
      pool.query(`
        SELECT
          TO_CHAR(days.booking_date, 'FMDy') AS label,
          COUNT(booking.booking_id) AS count
        FROM generate_series(
          CURRENT_DATE - INTERVAL '6 days',
          CURRENT_DATE,
          INTERVAL '1 day'
        ) AS days(booking_date)
        LEFT JOIN booking ON booking.booking_date = days.booking_date::date
        GROUP BY days.booking_date
        ORDER BY days.booking_date ASC
      `),
      // Count rooms by every defined room status, including statuses with no rooms.
      pool.query(`
        SELECT
          statuses.status::text AS label,
          COUNT(room.room_id) AS count
        FROM unnest(enum_range(NULL::room_status)) WITH ORDINALITY AS statuses(status, sort_order)
        LEFT JOIN room ON room.status = statuses.status
        GROUP BY statuses.status, statuses.sort_order
        ORDER BY statuses.sort_order ASC
      `),
      // Fetch the next five upcoming bookings with their room and booking user details.
      pool.query(`
        SELECT
          room.room_name AS room,
          TO_CHAR(booking.start_time, 'HH24:MI') || ' - ' || TO_CHAR(booking.end_time, 'HH24:MI') AS time,
          users.name AS "bookedBy",
          '' AS purpose,
          booking.status::text AS status
        FROM booking
        JOIN room ON room.room_id = booking.room_id
        JOIN users ON users.user_id = booking.user_id
        WHERE booking.booking_date >= CURRENT_DATE
        ORDER BY booking.booking_date ASC, booking.start_time ASC
        LIMIT 5
      `),
      // List room utilization percentages using room names as availability labels.
      pool.query(`
        SELECT
          room_name AS floor,
          utilization_pct::double precision AS percentage
        FROM room
        ORDER BY room_name ASC
      `),
    ]);

    return res.status(200).json({
      summary: {
        totalRooms: parseInt(totalRoomsResult.rows[0].count, 10),
        occupiedRooms: parseInt(occupiedRoomsResult.rows[0].count, 10),
        availableRooms: parseInt(availableRoomsResult.rows[0].count, 10),
        todayBookings: parseInt(todayBookingsResult.rows[0].count, 10),
        trends: {
          totalRooms: null,
          occupiedRooms: null,
          availableRooms: null,
          todayBookings: null,
        },
      },
      bookingTrend: {
        labels: bookingTrendResult.rows.map((row) => row.label),
        datasets: [{
          label: 'Bookings',
          data: bookingTrendResult.rows.map((row) => parseInt(row.count, 10)),
        }],
      },
      occupancy: {
        labels: occupancyResult.rows.map((row) => row.label),
        datasets: [{
          data: occupancyResult.rows.map((row) => parseInt(row.count, 10)),
        }],
      },
      upcomingBookings: upcomingBookingsResult.rows,
      roomAvailability: roomAvailabilityResult.rows,
      recentActivity: [],
    });

  } catch (err) {
    console.error('Dashboard error:', err.message);
    return res.status(500).json({ message: 'Failed to load dashboard data.' });
  }
};

module.exports = { getDashboard };
