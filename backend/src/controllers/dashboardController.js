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
        labels: [],
        datasets: [],
      },
      upcomingBookings: [],
      roomAvailability: [],
      recentActivity: [],
    });

  } catch (err) {
    console.error('Dashboard error:', err.message);
    return res.status(500).json({ message: 'Failed to load dashboard data.' });
  }
};

module.exports = { getDashboard };
