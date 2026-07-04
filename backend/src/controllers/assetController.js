const pool = require('../config/db');

// ═══════════════════════════════════════════════════════
// ASSETS CONTROLLER
// All queries are scoped to req.user.org_id for security
// ═══════════════════════════════════════════════════════

// ─────────────────────────────────────────────
// GET /api/assets
// Returns all assets belonging to the user's org
// ─────────────────────────────────────────────
const getAssets = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT asset_id, name, condition_level, current_value,
              service_history, last_service_date, status, org_id
       FROM asset
       WHERE org_id = $1
       ORDER BY asset_id ASC`,
      [req.user.org_id]
    );
    return res.status(200).json({ assets: result.rows });
  } catch (err) {
    console.error('getAssets error:', err.message);
    return res.status(500).json({ message: 'Server error fetching assets.' });
  }
};

// ─────────────────────────────────────────────
// GET /api/assets/:id
// Returns a single asset, scoped to user's org
// ─────────────────────────────────────────────
const getAssetById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT asset_id, name, condition_level, current_value,
              service_history, last_service_date, status, org_id
       FROM asset
       WHERE asset_id = $1 AND org_id = $2`,
      [id, req.user.org_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Asset not found.' });
    }
    return res.status(200).json({ asset: result.rows[0] });
  } catch (err) {
    console.error('getAssetById error:', err.message);
    return res.status(500).json({ message: 'Server error fetching asset.' });
  }
};

// ─────────────────────────────────────────────
// POST /api/assets
// Creates a new asset for the user's org
// Body: { name, condition_level, current_value, status }
// ─────────────────────────────────────────────
const createAsset = async (req, res) => {
  const { name, condition_level, current_value, status } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Asset name is required.' });
  }

  const allowedStatuses = ['Active', 'In-Maintenance', 'Damaged', 'Retired', 'Lost'];
  if (status && !allowedStatuses.includes(status)) {
    return res.status(400).json({ message: `Invalid status. Must be one of: ${allowedStatuses.join(', ')}` });
  }

  try {
    const result = await pool.query(
      `INSERT INTO asset (org_id, name, condition_level, current_value, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        req.user.org_id,
        name,
        condition_level ?? 100,
        current_value ?? null,
        status || 'Active',
      ]
    );

    const newAsset = result.rows[0];

    // Auto-schedule maintenance if condition is already below 50 on creation
    if (newAsset.condition_level < 50) {
      await autoScheduleMaintenance(newAsset.asset_id, newAsset.condition_level);
    }

    return res.status(201).json({
      message: 'Asset created successfully.',
      asset: newAsset,
    });
  } catch (err) {
    console.error('createAsset error:', err.message);
    return res.status(500).json({ message: 'Server error creating asset.' });
  }
};

// ─────────────────────────────────────────────
// PUT /api/assets/:id
// Updates an existing asset
// Body: { name, condition_level, current_value, status, last_service_date }
// AUTO-SCHEDULE: If condition_level drops below 50, creates maintenance request
// ─────────────────────────────────────────────
const updateAsset = async (req, res) => {
  const { id } = req.params;
  const { name, condition_level, current_value, status, last_service_date } = req.body;

  try {
    // Fetch the asset first to check ownership and get previous condition
    const existing = await pool.query(
      'SELECT * FROM asset WHERE asset_id = $1 AND org_id = $2',
      [id, req.user.org_id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Asset not found.' });
    }

    const oldAsset = existing.rows[0];
    const prevCondition = oldAsset.condition_level;

    const result = await pool.query(
      `UPDATE asset
       SET name             = COALESCE($1, name),
           condition_level  = COALESCE($2, condition_level),
           current_value    = COALESCE($3, current_value),
           status           = COALESCE($4, status),
           last_service_date = COALESCE($5, last_service_date)
       WHERE asset_id = $6 AND org_id = $7
       RETURNING *`,
      [name, condition_level, current_value, status, last_service_date, id, req.user.org_id]
    );

    const updatedAsset = result.rows[0];

    // ── Auto-schedule logic ─────────────────────────────────
    // If condition just dropped below 50 (and wasn't already below 50 before),
    // automatically create a High-priority maintenance request.
    if (
      condition_level !== undefined &&
      prevCondition >= 50 &&
      updatedAsset.condition_level < 50
    ) {
      const scheduled = await autoScheduleMaintenance(updatedAsset.asset_id, updatedAsset.condition_level);
      return res.status(200).json({
        message: `Asset updated. ⚠️ Condition below 50 — maintenance auto-scheduled (Request #${scheduled.request_id}).`,
        asset: updatedAsset,
        maintenance_scheduled: scheduled,
      });
    }

    return res.status(200).json({
      message: 'Asset updated successfully.',
      asset: updatedAsset,
    });
  } catch (err) {
    console.error('updateAsset error:', err.message);
    return res.status(500).json({ message: 'Server error updating asset.' });
  }
};

// ─────────────────────────────────────────────
// DELETE /api/assets/:id
// Deletes an asset belonging to the user's org
// ─────────────────────────────────────────────
const deleteAsset = async (req, res) => {
  const { id } = req.params;
  try {
    // Delete associated maintenance records first to satisfy foreign key constraints
    await pool.query('DELETE FROM maintenance WHERE asset_id = $1', [id]);

    const result = await pool.query(
      'DELETE FROM asset WHERE asset_id = $1 AND org_id = $2 RETURNING asset_id, name',
      [id, req.user.org_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Asset not found.' });
    }
    return res.status(200).json({
      message: `Asset "${result.rows[0].name}" deleted successfully.`,
    });
  } catch (err) {
    console.error('deleteAsset error:', err.message);
    return res.status(500).json({ message: 'Server error deleting asset.' });
  }
};

// ─────────────────────────────────────────────
// HELPER: autoScheduleMaintenance
// Called internally when condition_level < 50.
// Creates a High-priority Pending maintenance request
// with a deadline 7 days from now.
// ─────────────────────────────────────────────
const autoScheduleMaintenance = async (assetId, conditionLevel) => {
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + 7);

  const result = await pool.query(
    `INSERT INTO maintenance (asset_id, status, priority, deadline)
     VALUES ($1, 'Pending', 'High', $2)
     RETURNING *`,
    [assetId, deadline.toISOString().split('T')[0]]
  );

  console.log(
    `🔧 Auto-scheduled maintenance for asset #${assetId} (condition: ${conditionLevel}) — Request #${result.rows[0].request_id}`
  );
  return result.rows[0];
};


// ═══════════════════════════════════════════════════════
// MAINTENANCE CONTROLLER
// Scoped to the org via asset/room ownership checks
// ═══════════════════════════════════════════════════════

// ─────────────────────────────────────────────
// GET /api/maintenance
// Returns all maintenance requests for the org
// ─────────────────────────────────────────────
const getMaintenance = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT m.request_id, m.asset_id, m.room_id, m.assigned_to,
              m.status, m.priority, m.cost, m.deadline, m.created_at,
              a.name AS asset_name,
              r.room_name,
              u.name AS assigned_to_name
       FROM maintenance m
       LEFT JOIN asset a ON m.asset_id = a.asset_id
       LEFT JOIN room  r ON m.room_id  = r.room_id
       LEFT JOIN users u ON m.assigned_to = u.user_id
       WHERE (a.org_id = $1 OR r.org_id = $1)
          OR (m.asset_id IS NULL AND m.room_id IS NULL)
       ORDER BY m.created_at DESC`,
      [req.user.org_id]
    );
    return res.status(200).json({ maintenance: result.rows });
  } catch (err) {
    console.error('getMaintenance error:', err.message);
    return res.status(500).json({ message: 'Server error fetching maintenance requests.' });
  }
};

// ─────────────────────────────────────────────
// GET /api/maintenance/:id
// Returns a single maintenance request
// ─────────────────────────────────────────────
const getMaintenanceById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT m.request_id, m.asset_id, m.room_id, m.assigned_to,
              m.status, m.priority, m.cost, m.deadline, m.created_at,
              a.name AS asset_name, a.org_id AS asset_org_id,
              r.room_name,         r.org_id AS room_org_id,
              u.name AS assigned_to_name
       FROM maintenance m
       LEFT JOIN asset a ON m.asset_id = a.asset_id
       LEFT JOIN room  r ON m.room_id  = r.room_id
       LEFT JOIN users u ON m.assigned_to = u.user_id
       WHERE m.request_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Maintenance request not found.' });
    }

    const row = result.rows[0];

    // Ensure the request belongs to this org
    const belongsToOrg =
      row.asset_org_id === req.user.org_id ||
      row.room_org_id  === req.user.org_id;

    if (!belongsToOrg) {
      return res.status(403).json({ message: 'Access denied. This request belongs to another organization.' });
    }

    return res.status(200).json({ maintenance: row });
  } catch (err) {
    console.error('getMaintenanceById error:', err.message);
    return res.status(500).json({ message: 'Server error fetching maintenance request.' });
  }
};

// ─────────────────────────────────────────────
// POST /api/maintenance
// Manually create a maintenance request
// Body: { asset_id?, room_id?, priority, deadline, assigned_to? }
// ─────────────────────────────────────────────
const createMaintenance = async (req, res) => {
  const { asset_id, room_id, assigned_to, priority, cost, deadline } = req.body;

  if (!asset_id && !room_id) {
    return res.status(400).json({ message: 'Either asset_id or room_id is required.' });
  }

  try {
    // Validate asset belongs to org
    if (asset_id) {
      const assetCheck = await pool.query(
        'SELECT asset_id FROM asset WHERE asset_id = $1 AND org_id = $2',
        [asset_id, req.user.org_id]
      );
      if (assetCheck.rows.length === 0) {
        return res.status(403).json({ message: 'Asset not found or does not belong to your organization.' });
      }
    }

    // Validate room belongs to org
    if (room_id) {
      const roomCheck = await pool.query(
        'SELECT room_id FROM room WHERE room_id = $1 AND org_id = $2',
        [room_id, req.user.org_id]
      );
      if (roomCheck.rows.length === 0) {
        return res.status(403).json({ message: 'Room not found or does not belong to your organization.' });
      }
    }

    const result = await pool.query(
      `INSERT INTO maintenance (asset_id, room_id, assigned_to, status, priority, cost, deadline)
       VALUES ($1, $2, $3, 'Pending', $4, $5, $6)
       RETURNING *`,
      [
        asset_id || null,
        room_id || null,
        assigned_to || null,
        priority || 'Medium',
        cost || null,
        deadline || null,
      ]
    );

    return res.status(201).json({
      message: 'Maintenance request created successfully.',
      maintenance: result.rows[0],
    });
  } catch (err) {
    console.error('createMaintenance error:', err.message);
    return res.status(500).json({ message: 'Server error creating maintenance request.' });
  }
};

// ─────────────────────────────────────────────
// PUT /api/maintenance/:id
// Update a maintenance request (status, cost, assigned_to, etc.)
// Body: { status?, priority?, cost?, deadline?, assigned_to? }
// ─────────────────────────────────────────────
const updateMaintenance = async (req, res) => {
  const { id } = req.params;
  const { status, priority, cost, deadline, assigned_to } = req.body;

  const allowedStatuses = ['Pending', 'In Progress', 'Resolved', 'Closed'];
  if (status && !allowedStatuses.includes(status)) {
    return res.status(400).json({ message: `Invalid status. Must be one of: ${allowedStatuses.join(', ')}` });
  }

  try {
    // First verify ownership
    const existing = await pool.query(
      `SELECT m.request_id, a.org_id AS asset_org, r.org_id AS room_org
       FROM maintenance m
       LEFT JOIN asset a ON m.asset_id = a.asset_id
       LEFT JOIN room  r ON m.room_id  = r.room_id
       WHERE m.request_id = $1`,
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Maintenance request not found.' });
    }

    const row = existing.rows[0];
    if (row.asset_org !== req.user.org_id && row.room_org !== req.user.org_id) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const result = await pool.query(
      `UPDATE maintenance
       SET status      = COALESCE($1, status),
           priority    = COALESCE($2, priority),
           cost        = COALESCE($3, cost),
           deadline    = COALESCE($4, deadline),
           assigned_to = COALESCE($5, assigned_to)
       WHERE request_id = $6
       RETURNING *`,
      [status, priority, cost, deadline, assigned_to, id]
    );

    return res.status(200).json({
      message: 'Maintenance request updated successfully.',
      maintenance: result.rows[0],
    });
  } catch (err) {
    console.error('updateMaintenance error:', err.message);
    return res.status(500).json({ message: 'Server error updating maintenance request.' });
  }
};

// ─────────────────────────────────────────────
// DELETE /api/maintenance/:id
// Deletes a maintenance request
// ─────────────────────────────────────────────
const deleteMaintenance = async (req, res) => {
  const { id } = req.params;
  try {
    // Ownership check
    const existing = await pool.query(
      `SELECT m.request_id, a.org_id AS asset_org, r.org_id AS room_org
       FROM maintenance m
       LEFT JOIN asset a ON m.asset_id = a.asset_id
       LEFT JOIN room  r ON m.room_id  = r.room_id
       WHERE m.request_id = $1`,
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Maintenance request not found.' });
    }

    const row = existing.rows[0];
    if (row.asset_org !== req.user.org_id && row.room_org !== req.user.org_id) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    await pool.query('DELETE FROM maintenance WHERE request_id = $1', [id]);

    return res.status(200).json({ message: `Maintenance request #${id} deleted successfully.` });
  } catch (err) {
    console.error('deleteMaintenance error:', err.message);
    return res.status(500).json({ message: 'Server error deleting maintenance request.' });
  }
};

module.exports = {
  // Assets
  getAssets,
  getAssetById,
  createAsset,
  updateAsset,
  deleteAsset,
  // Maintenance
  getMaintenance,
  getMaintenanceById,
  createMaintenance,
  updateMaintenance,
  deleteMaintenance,
};
