const pool = require('../config/db');

// ─────────────────────────────────────────────
// GET /api/dashboard
// Returns summary stats for the P5 Dashboard
// ─────────────────────────────────────────────
const getDashboard = async (req, res) => {
  try {
    const [
      totalAssetsResult,
      lowStockResult,
      pendingMaintenanceResult,
      roomUtilizationResult,
    ] = await Promise.all([
      pool.query('SELECT COUNT(*) AS count FROM asset'),
      pool.query("SELECT COUNT(*) AS count FROM inventory WHERE status = 'Low Stock'"),
      pool.query("SELECT COUNT(*) AS count FROM maintenance WHERE status = 'Pending'"),
      pool.query('SELECT COALESCE(AVG(utilization_pct), 0) AS avg FROM room'),
    ]);

    return res.status(200).json({
      totalAssets:        parseInt(totalAssetsResult.rows[0].count, 10),
      lowStock:           parseInt(lowStockResult.rows[0].count, 10),
      pendingMaintenance: parseInt(pendingMaintenanceResult.rows[0].count, 10),
      roomUtilization:    parseFloat(roomUtilizationResult.rows[0].avg),
    });

  } catch (err) {
    console.error('Dashboard error:', err.message);
    return res.status(500).json({ message: 'Failed to load dashboard data.' });
  }
};

module.exports = { getDashboard };
