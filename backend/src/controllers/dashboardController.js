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
      recentActivityResult,
    ] = await Promise.all([
      // Count all rooms.
      pool.query('SELECT COUNT(*) AS count FROM room'),
      // Count rooms currently marked as booked.
      pool.query("SELECT COUNT(*) AS count FROM room WHERE status = 'Booked'"),
      // Count rooms currently marked as available.
      pool.query("SELECT COUNT(*) AS count FROM room WHERE status = 'Available'"),
      // Count bookings scheduled for today.
      pool.query('SELECT COUNT(*) AS count FROM booking WHERE booking_date = CURRENT_DATE'),
      // Count bookings for each weekday from Monday to Sunday, including days with no bookings.
      pool.query(`
        SELECT
          wd.label,
          COUNT(booking.booking_id) AS count
        FROM (
          VALUES
            (1, 'Monday'),
            (2, 'Tuesday'),
            (3, 'Wednesday'),
            (4, 'Thursday'),
            (5, 'Friday'),
            (6, 'Saturday'),
            (7, 'Sunday')
        ) AS wd(dow, label)
        LEFT JOIN booking ON EXTRACT(ISODOW FROM booking.booking_date) = wd.dow
        GROUP BY wd.dow, wd.label
        ORDER BY wd.dow ASC
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
      // Combine recent booking and maintenance activity into one chronological feed.
      pool.query(`
        SELECT
          description,
          TO_CHAR(activity_time, 'DD Mon YYYY HH24:MI') AS time
        FROM (
          SELECT
            users.name || ' booked ' || room.room_name AS description,
            booking.created_at AS activity_time
          FROM booking
          JOIN users ON users.user_id = booking.user_id
          JOIN room ON room.room_id = booking.room_id

          UNION ALL

          SELECT
            CASE
              WHEN room.room_id IS NOT NULL THEN 'Maintenance request created for ' || room.room_name
              WHEN inventory.inventory_id IS NOT NULL THEN 'Maintenance request created for ' || inventory.item_name
              ELSE 'Maintenance request created'
            END AS description,
            maintenance.created_at AS activity_time
          FROM maintenance
          LEFT JOIN room ON room.room_id = maintenance.room_id
          LEFT JOIN inventory ON inventory.inventory_id = maintenance.inventory_id
        ) AS activities
        ORDER BY activity_time DESC
        LIMIT 10
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
      recentActivity: recentActivityResult.rows,
    });

  } catch (err) {
    console.error('Dashboard error:', err.message);
    return res.status(500).json({ message: 'Failed to load dashboard data.' });
  }
};

module.exports = { getDashboard };
