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
      lowStockResult,
      pendingMaintenanceResult
    ] = await Promise.all([
      // Count all rooms.
      pool.query('SELECT COUNT(*) AS count FROM room'),
      // Count rooms currently marked as booked (dynamic based on being occupied AT THIS MOMENT).
      pool.query(`
        SELECT COUNT(DISTINCT room_id) AS count FROM booking 
        WHERE status != 'cancelled' 
        AND CURRENT_TIMESTAMP BETWEEN 
          (booking_date + start_time) AT TIME ZONE 'Asia/Kolkata'
          AND 
          (booking_date + end_time + CASE WHEN end_time < start_time THEN interval '1 day' ELSE interval '0 day' END) AT TIME ZONE 'Asia/Kolkata'
      `),
      // Count rooms currently marked as available (dynamic).
      pool.query(`
        SELECT (SELECT COUNT(*) FROM room) 
        - (SELECT COUNT(DISTINCT room_id) FROM booking 
           WHERE status != 'cancelled' 
           AND CURRENT_TIMESTAMP BETWEEN 
             (booking_date + start_time) AT TIME ZONE 'Asia/Kolkata'
             AND 
             (booking_date + end_time + CASE WHEN end_time < start_time THEN interval '1 day' ELSE interval '0 day' END) AT TIME ZONE 'Asia/Kolkata'
          ) 
        - (SELECT COUNT(*) FROM room WHERE status = 'Under Maintenance') AS count
      `),
      // Count bookings scheduled for today.
      pool.query(`SELECT COUNT(*) AS count FROM booking WHERE booking_date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date`),
      // Count bookings overlapping each hour of today (IST) — for the hourly bar chart.
      pool.query(`
        SELECT
          hours.h AS hour,
          COUNT(b.booking_id) AS count
        FROM generate_series(0, 23) AS hours(h)
        LEFT JOIN booking b ON
          b.booking_date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date
          AND b.status != 'cancelled'
          AND (
            -- Normal booking (start <= end): overlaps hour H if start <= H and end > H
            (b.end_time >= b.start_time
              AND EXTRACT(HOUR FROM b.start_time)::int <= hours.h
              AND EXTRACT(HOUR FROM b.end_time)::int > hours.h)
            OR
            -- Overnight booking (end < start): covers hour H if H >= start OR H < end
            (b.end_time < b.start_time
              AND (EXTRACT(HOUR FROM b.start_time)::int <= hours.h
                OR EXTRACT(HOUR FROM b.end_time)::int > hours.h))
          )
        GROUP BY hours.h
        ORDER BY hours.h ASC
      `),
      // Count rooms by status dynamically for right now.
      pool.query(`
        SELECT 'Booked' AS label, COUNT(DISTINCT room_id) AS count FROM booking 
        WHERE status != 'cancelled'
        AND CURRENT_TIMESTAMP BETWEEN 
          (booking_date + start_time) AT TIME ZONE 'Asia/Kolkata'
          AND 
          (booking_date + end_time + CASE WHEN end_time < start_time THEN interval '1 day' ELSE interval '0 day' END) AT TIME ZONE 'Asia/Kolkata'
        UNION ALL
        SELECT 'Under Maintenance' AS label, COUNT(room_id) AS count FROM room WHERE status = 'Under Maintenance'
        UNION ALL
        SELECT 'Available' AS label, 
          (SELECT COUNT(*) FROM room) 
          - (SELECT COUNT(DISTINCT room_id) FROM booking 
             WHERE status != 'cancelled' 
             AND CURRENT_TIMESTAMP BETWEEN 
               (booking_date + start_time) AT TIME ZONE 'Asia/Kolkata'
               AND 
               (booking_date + end_time + CASE WHEN end_time < start_time THEN interval '1 day' ELSE interval '0 day' END) AT TIME ZONE 'Asia/Kolkata'
            ) 
          - (SELECT COUNT(*) FROM room WHERE status = 'Under Maintenance') AS count
      `),
      // Fetch the next five upcoming bookings with their room and booking user details.
      pool.query(`
        SELECT
          room.room_name AS room,
          TO_CHAR(booking.start_time, 'HH12:MI AM') || ' - ' || TO_CHAR(booking.end_time, 'HH12:MI AM') AS time,
          users.name AS "bookedBy",
          booking.status::text AS status,
          booking.booking_date,
          booking.end_time,
          ROUND(EXTRACT(EPOCH FROM (booking.end_time - booking.start_time + CASE WHEN booking.end_time < booking.start_time THEN interval '1 day' ELSE interval '0 day' END))/3600.0, 1) AS duration_hours
        FROM booking
        JOIN room ON room.room_id = booking.room_id
        JOIN users ON users.user_id = booking.user_id
        WHERE booking.status != 'cancelled'
          AND (
            booking.booking_date > (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date
            OR (booking.booking_date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date AND booking.end_time > (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::time)
          )
        ORDER BY booking.booking_date ASC, booking.start_time ASC
        LIMIT 5
      `),
      // Calculate real room utilization percentages grouped by category based on today's bookings (assuming 8 hour workday per room).
      pool.query(`
        SELECT
          r.category AS floor,
          COALESCE(
            SUM(EXTRACT(EPOCH FROM (b.end_time - b.start_time + CASE WHEN b.end_time < b.start_time THEN interval '1 day' ELSE interval '0 day' END))/3600) / (COUNT(DISTINCT r.room_id) * 8.0) * 100,
            0
          )::double precision AS percentage
        FROM room r
        LEFT JOIN booking b ON r.room_id = b.room_id 
          AND b.booking_date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date 
          AND b.status != 'cancelled'
        GROUP BY r.category
        ORDER BY r.category ASC
      `),
      // Combine recent booking and maintenance activity into one chronological feed.
      pool.query(`
        SELECT
          description,
          TO_CHAR(activity_time, 'DD Mon YYYY HH24:MI') AS time
        FROM (
          SELECT
            users.name || ' booked ' || room.room_name AS description,
            (booking.booking_date + booking.start_time)::timestamp AS activity_time
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
      // Fetch low stock alerts
      pool.query(`
        SELECT item_name, current_stock, unit 
        FROM inventory 
        WHERE current_stock <= reorder_point OR status = 'Low Stock' 
        ORDER BY current_stock ASC 
        LIMIT 3
      `),
      // Fetch pending maintenance alerts
      pool.query(`
        SELECT m.request_id, m.description, m.priority,
               CASE 
                 WHEN r.room_id IS NOT NULL THEN r.room_name 
                 WHEN i.inventory_id IS NOT NULL THEN i.item_name 
                 ELSE 'General' 
               END as location
        FROM maintenance m
        LEFT JOIN room r ON m.room_id = r.room_id
        LEFT JOIN inventory i ON m.inventory_id = i.inventory_id
        WHERE m.status IN ('Pending', 'In Progress')
        ORDER BY m.created_at ASC
        LIMIT 3
      `)
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
        labels: bookingTrendResult.rows.map((row) => parseInt(row.hour, 10)),
        datasets: [{
          label: 'Rooms booked',
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
      alerts: {
        lowStock: lowStockResult ? lowStockResult.rows : [],
        maintenance: pendingMaintenanceResult ? pendingMaintenanceResult.rows : [],
      }
    });

  } catch (err) {
    console.error('Dashboard error:', err.message);
    return res.status(500).json({ message: 'Failed to load dashboard data.' });
  }
};

module.exports = { getDashboard };
