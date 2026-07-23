const pool = require('../config/db');

// ═══════════════════════════════════════════════════════
// MAINTENANCE CONTROLLER
// Handles CRUD operations for service requests. Integrates with
// PostgreSQL to automate Space Status Sync and authorize Admin actions.
// ═══════════════════════════════════════════════════════

// ─────────────────────────────────────────────
// GET /api/maintenance
// Viva Tip: Retrieves all tickets belonging to the logged-in user's organization
// ─────────────────────────────────────────────
const getMaintenance = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT m.request_id, m.room_id, m.inventory_id, m.assigned_to,
              m.status, m.priority, m.cost, m.deadline, m.description, m.created_at,
              r.room_name,
              i.item_name,
              u.name AS assigned_to_name
       FROM maintenance m
       LEFT JOIN room r ON m.room_id = r.room_id
       LEFT JOIN inventory i ON m.inventory_id = i.inventory_id
       LEFT JOIN users u ON m.assigned_to = u.user_id
       WHERE r.org_id = $1 OR i.org_id = $1 OR (m.room_id IS NULL AND m.inventory_id IS NULL)
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
      `SELECT m.request_id, m.room_id, m.inventory_id, m.assigned_to,
              m.status, m.priority, m.cost, m.deadline, m.description, m.created_at,
              r.room_name, r.org_id AS room_org_id,
              i.item_name, i.org_id AS inventory_org_id,
              u.name AS assigned_to_name
       FROM maintenance m
       LEFT JOIN room r ON m.room_id = r.room_id
       LEFT JOIN inventory i ON m.inventory_id = i.inventory_id
       LEFT JOIN users u ON m.assigned_to = u.user_id
       WHERE m.request_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Maintenance request not found.' });
    }

    const row = result.rows[0];

    // Verify ownership
    const belongsToOrg =
      (row.room_org_id && row.room_org_id === req.user.org_id) ||
      (row.inventory_org_id && row.inventory_org_id === req.user.org_id);

    if (row.room_id && row.inventory_id && !belongsToOrg) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    return res.status(200).json({ maintenance: row });
  } catch (err) {
    console.error('getMaintenanceById error:', err.message);
    return res.status(500).json({ message: 'Server error fetching maintenance request.' });
  }
};

// ─────────────────────────────────────────────
// POST /api/maintenance
// Creates a new maintenance ticket
// ─────────────────────────────────────────────
const createMaintenance = async (req, res) => {
  const { room_id, inventory_id, assigned_to, priority, cost, deadline, description } = req.body;

  if (!room_id && !inventory_id) {
    return res.status(400).json({ message: 'Either room_id or inventory_id is required.' });
  }

  try {
    // Viva Tip: Verify the user owns the space before letting them submit a ticket
    if (room_id) {
      const roomCheck = await pool.query(
        'SELECT room_id FROM room WHERE room_id = $1 AND org_id = $2',
        [room_id, req.user.org_id]
      );
      if (roomCheck.rows.length === 0) {
        return res.status(403).json({ message: 'Room/Space not found or unauthorized.' });
      }
    }

    // Validate inventory ownership
    if (inventory_id) {
      const invCheck = await pool.query(
        'SELECT inventory_id FROM inventory WHERE inventory_id = $1 AND org_id = $2',
        [inventory_id, req.user.org_id]
      );
      if (invCheck.rows.length === 0) {
        return res.status(403).json({ message: 'Inventory item not found or unauthorized.' });
      }
    }

    const result = await pool.query(
      `INSERT INTO maintenance (room_id, inventory_id, assigned_to, status, priority, cost, deadline, description)
       VALUES ($1, $2, $3, 'Pending', $4, $5, $6, $7)
       RETURNING *`,
      [
        room_id || null,
        inventory_id || null,
        assigned_to || null,
        priority || 'Medium',
        cost || null,
        deadline || null,
        description || null,
      ]
    );

    const ticket = result.rows[0];

    // Viva Tip [AUTOMATED TRIGGER]: Mark the space 'Under Maintenance' immediately in the database
    if (room_id) {
      await pool.query(
        `UPDATE room SET status = 'Under Maintenance' WHERE room_id = $1`,
        [room_id]
      );
    }

    return res.status(201).json({
      message: 'Maintenance ticket created successfully.',
      maintenance: ticket,
    });
  } catch (err) {
    console.error('createMaintenance error:', err.message);
    return res.status(500).json({ message: 'Server error creating maintenance ticket.' });
  }
};

// ─────────────────────────────────────────────
// PUT /api/maintenance/:id
// Updates a maintenance ticket
// ─────────────────────────────────────────────
const updateMaintenance = async (req, res) => {
  const { id } = req.params;
  const { status, priority, cost, deadline, assigned_to, description } = req.body;

  const allowedStatuses = ['Pending', 'In Progress', 'Resolved', 'Closed'];
  if (status && !allowedStatuses.includes(status)) {
    return res.status(400).json({ message: `Invalid status. Must be one of: ${allowedStatuses.join(', ')}` });
  }

  try {
    // Validate ownership
    const existing = await pool.query(
      `SELECT m.request_id, m.room_id, r.org_id AS room_org, i.org_id AS inv_org
       FROM maintenance m
       LEFT JOIN room r ON m.room_id = r.room_id
       LEFT JOIN inventory i ON m.inventory_id = i.inventory_id
       WHERE m.request_id = $1`,
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Maintenance request not found.' });
    }

    const row = existing.rows[0];
    const belongsToOrg =
      (!row.room_org && !row.inv_org) ||
      (row.room_org && row.room_org === req.user.org_id) ||
      (row.inv_org && row.inv_org === req.user.org_id);

    if (!belongsToOrg) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const result = await pool.query(
      `UPDATE maintenance
       SET status      = COALESCE($1, status),
           priority    = COALESCE($2, priority),
           cost        = COALESCE($3, cost),
           deadline    = COALESCE($4, deadline),
           assigned_to = COALESCE($5, assigned_to),
           description = COALESCE($6, description)
       WHERE request_id = $7
       RETURNING *`,
      [status, priority, cost, deadline, assigned_to, description, id]
    );

    const updatedMaint = result.rows[0];

    // Status sync logic for rooms/spaces
    if (updatedMaint.room_id) {
      if (status === 'Resolved' || status === 'Closed') {
        // Restore room status to Available if no other open tickets remain
        const otherCheck = await pool.query(
          `SELECT request_id FROM maintenance 
           WHERE room_id = $1 AND request_id != $2 AND status IN ('Pending', 'In Progress')`,
          [updatedMaint.room_id, id]
        );
        if (otherCheck.rows.length === 0) {
          await pool.query(
            `UPDATE room SET status = 'Available' WHERE room_id = $1`,
            [updatedMaint.room_id]
          );
        }
      } else if (status === 'Pending' || status === 'In Progress') {
        await pool.query(
          `UPDATE room SET status = 'Under Maintenance' WHERE room_id = $1`,
          [updatedMaint.room_id]
        );
      }
    }

    return res.status(200).json({
      message: 'Maintenance ticket updated successfully.',
      maintenance: updatedMaint,
    });
  } catch (err) {
    console.error('updateMaintenance error:', err.message);
    return res.status(500).json({ message: 'Server error updating maintenance ticket.' });
  }
};

// ─────────────────────────────────────────────
// DELETE /api/maintenance/:id
// Deletes a maintenance ticket
// ─────────────────────────────────────────────
const deleteMaintenance = async (req, res) => {
  const { id } = req.params;
  try {
    const existing = await pool.query(
      `SELECT m.request_id, m.room_id, r.org_id AS room_org, i.org_id AS inv_org
       FROM maintenance m
       LEFT JOIN room r ON m.room_id = r.room_id
       LEFT JOIN inventory i ON m.inventory_id = i.inventory_id
       WHERE m.request_id = $1`,
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Maintenance request not found.' });
    }

    const row = existing.rows[0];
    const belongsToOrg =
      (!row.room_org && !row.inv_org) ||
      (row.room_org && row.room_org === req.user.org_id) ||
      (row.inv_org && row.inv_org === req.user.org_id);

    if (!belongsToOrg) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    await pool.query('DELETE FROM maintenance WHERE request_id = $1', [id]);

    // Viva Tip [AUTOMATED TRIGGER]: When ticket is deleted, check if any other open tickets remain. If none, restore Space to 'Available'
    if (row.room_id) {
      const otherCheck = await pool.query(
        `SELECT request_id FROM maintenance 
         WHERE room_id = $1 AND status IN ('Pending', 'In Progress')`
      );
      if (otherCheck.rows.length === 0) {
        await pool.query(
          `UPDATE room SET status = 'Available' WHERE room_id = $1`,
          [row.room_id]
        );
      }
    }

    return res.status(200).json({ message: `Maintenance request #${id} deleted successfully.` });
  } catch (err) {
    console.error('deleteMaintenance error:', err.message);
    return res.status(500).json({ message: 'Server error deleting maintenance request.' });
  }
};

module.exports = {
  getMaintenance,
  getMaintenanceById,
  createMaintenance,
  updateMaintenance,
  deleteMaintenance,
};
