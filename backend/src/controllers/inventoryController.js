const pool = require('../config/db');
const { sendLowStockAlert } = require('../services/emailService');

// ═══════════════════════════════════════════════════════
// INVENTORY CONTROLLER
// Manages consumable inventory items, scoped to org.
// Auto-computes status from stock levels and fires
// SendGrid email alerts on Low Stock / Out of Stock.
// ═══════════════════════════════════════════════════════

// ─────────────────────────────────────────────
// HELPER: computeStatus
// Derives the inventory_status enum value from stock numbers.
//   current_stock = 0              → 'Out of Stock'
//   current_stock < reorder_point  → 'Low Stock'
//   current_stock >= reorder_point → 'In Stock'
// ─────────────────────────────────────────────
function computeStatus(currentStock, reorderPoint) {
  const stock   = parseFloat(currentStock)  || 0;
  const reorder = parseFloat(reorderPoint) || 0;
  if (stock <= 0)       return 'Out of Stock';
  if (stock < reorder)  return 'Low Stock';
  return 'In Stock';
}

// ─────────────────────────────────────────────
// INTERNAL HELPER: triggerLowStockAlert
// Silently fires a SendGrid email for an item;
// logs errors but does NOT throw so that the
// main request still returns a success response.
// ─────────────────────────────────────────────
async function triggerLowStockAlert(item) {
  try {
    await sendLowStockAlert({
      itemName:     item.item_name,
      sku:          item.sku,
      category:     item.category,
      currentStock: item.current_stock,
      reorderPoint: item.reorder_point,
      unit:         item.unit,
      status:       item.status,
      supplierEmail: item.supplier_email,
    });
    console.log(`📧 Low stock alert sent → "${item.item_name}" (${item.status})`);
  } catch (err) {
    console.error(`❌ Alert email failed for "${item.item_name}":`, err.message);
  }
}


// ═══════════════════════════════════════════════════════
// GET /api/inventory
// Returns all inventory items for the user's org.
// Optional query params: ?status=&category=&search=
// ═══════════════════════════════════════════════════════
const getInventory = async (req, res) => {
  const { status, category, search } = req.query;

  try {
    let query = `
      SELECT inventory_id, org_id, sku, item_name, category, unit,
             current_stock, reorder_point, monthly_consumption,
             consumption_history, status, supplier_email, created_at
      FROM   inventory
      WHERE  org_id = $1
    `;
    const params = [req.user.org_id];
    let idx = 2;

    if (status) {
      query += ` AND status = $${idx++}`;
      params.push(status);
    }
    if (category) {
      query += ` AND category = $${idx++}`;
      params.push(category);
    }
    if (search) {
      query += ` AND (item_name ILIKE $${idx} OR sku ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }

    query += ' ORDER BY inventory_id ASC';

    const result = await pool.query(query, params);
    return res.status(200).json({ inventory: result.rows });
  } catch (err) {
    console.error('getInventory error:', err.message);
    return res.status(500).json({ message: 'Server error fetching inventory.' });
  }
};


// ═══════════════════════════════════════════════════════
// GET /api/inventory/:id
// Returns a single inventory item scoped to the org.
// ═══════════════════════════════════════════════════════
const getInventoryById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT * FROM inventory WHERE inventory_id = $1 AND org_id = $2`,
      [id, req.user.org_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Inventory item not found.' });
    }
    return res.status(200).json({ item: result.rows[0] });
  } catch (err) {
    console.error('getInventoryById error:', err.message);
    return res.status(500).json({ message: 'Server error fetching inventory item.' });
  }
};


// ═══════════════════════════════════════════════════════
// POST /api/inventory
// Creates a new consumable inventory item.
// Body: { item_name*, sku, category, unit,
//         current_stock, reorder_point,
//         monthly_consumption, supplier_email }
// * required
// ═══════════════════════════════════════════════════════
const createInventoryItem = async (req, res) => {
  const {
    item_name, sku, category, unit,
    current_stock, reorder_point, monthly_consumption, supplier_email,
  } = req.body;

  if (!item_name) {
    return res.status(400).json({ message: 'item_name is required.' });
  }

  const stockVal   = parseFloat(current_stock)       || 0;
  const reorderVal = parseFloat(reorder_point)       || 0;
  const monthlyVal = parseFloat(monthly_consumption) || 0;
  const status     = computeStatus(stockVal, reorderVal);

  try {
    const result = await pool.query(
      `INSERT INTO inventory
         (org_id, sku, item_name, category, unit,
          current_stock, reorder_point, monthly_consumption, status, supplier_email)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        req.user.org_id,
        sku          || null,
        item_name,
        category     || 'General',
        unit         || 'Units',
        stockVal,
        reorderVal,
        monthlyVal,
        status,
        supplier_email || null,
      ]
    );

    const newItem = result.rows[0];

    // Fire alert immediately if item starts below threshold
    if (status !== 'In Stock') {
      await triggerLowStockAlert(newItem);
    }

    return res.status(201).json({
      message: 'Inventory item created successfully.',
      item:    newItem,
    });
  } catch (err) {
    console.error('createInventoryItem error:', err.message);
    if (err.code === '23505') {
      return res.status(409).json({ message: 'An item with this SKU already exists.' });
    }
    return res.status(500).json({ message: 'Server error creating inventory item.' });
  }
};


// ═══════════════════════════════════════════════════════
// PUT /api/inventory/:id
// Updates an existing item. Status is auto-recomputed.
// If status worsens (In Stock → Low/Out), alert fires.
// Body: { item_name, sku, category, unit,
//         current_stock, reorder_point,
//         monthly_consumption, supplier_email }
// ═══════════════════════════════════════════════════════
const updateInventoryItem = async (req, res) => {
  const { id } = req.params;
  const {
    item_name, sku, category, unit,
    current_stock, reorder_point, monthly_consumption, supplier_email,
  } = req.body;

  try {
    // Ownership check + fetch prev state
    const existing = await pool.query(
      'SELECT * FROM inventory WHERE inventory_id = $1 AND org_id = $2',
      [id, req.user.org_id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Inventory item not found.' });
    }

    const prev = existing.rows[0];

    // Merge incoming values with existing ones for status computation
    const newStock   = current_stock   !== undefined ? parseFloat(current_stock)       : parseFloat(prev.current_stock);
    const newReorder = reorder_point   !== undefined ? parseFloat(reorder_point)       : parseFloat(prev.reorder_point);
    const newStatus  = computeStatus(newStock, newReorder);

    const result = await pool.query(
      `UPDATE inventory
       SET item_name           = COALESCE($1,  item_name),
           sku                 = COALESCE($2,  sku),
           category            = COALESCE($3,  category),
           unit                = COALESCE($4,  unit),
           current_stock       = COALESCE($5,  current_stock),
           reorder_point       = COALESCE($6,  reorder_point),
           monthly_consumption = COALESCE($7,  monthly_consumption),
           supplier_email      = COALESCE($8,  supplier_email),
           status              = $9
       WHERE inventory_id = $10 AND org_id = $11
       RETURNING *`,
      [
        item_name, sku, category, unit,
        current_stock !== undefined ? parseFloat(current_stock) : null,
        reorder_point !== undefined ? parseFloat(reorder_point) : null,
        monthly_consumption !== undefined ? parseFloat(monthly_consumption) : null,
        supplier_email,
        newStatus,
        id, req.user.org_id,
      ]
    );

    const updated = result.rows[0];

    // Alert only when status worsens from a healthy state
    const statusWorsened =
      prev.status === 'In Stock' && newStatus !== 'In Stock';

    if (statusWorsened) {
      await triggerLowStockAlert(updated);
      return res.status(200).json({
        message:       `Item updated. ⚠️ Status changed to "${newStatus}" — alert sent.`,
        item:          updated,
        alert_sent:    true,
      });
    }

    return res.status(200).json({
      message: 'Inventory item updated successfully.',
      item:    updated,
    });
  } catch (err) {
    console.error('updateInventoryItem error:', err.message);
    return res.status(500).json({ message: 'Server error updating inventory item.' });
  }
};


// ═══════════════════════════════════════════════════════
// DELETE /api/inventory/:id
// Permanently removes an inventory item.
// Admin only (enforced at route level).
// ═══════════════════════════════════════════════════════
const deleteInventoryItem = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'DELETE FROM inventory WHERE inventory_id = $1 AND org_id = $2 RETURNING inventory_id, item_name',
      [id, req.user.org_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Inventory item not found.' });
    }
    return res.status(200).json({
      message: `Item "${result.rows[0].item_name}" deleted successfully.`,
    });
  } catch (err) {
    console.error('deleteInventoryItem error:', err.message);
    return res.status(500).json({ message: 'Server error deleting inventory item.' });
  }
};


// ═══════════════════════════════════════════════════════
// PATCH /api/inventory/:id/adjust
// Adds or removes stock for a single item.
// Logs each movement to consumption_history (JSONB).
// Auto-triggers alert if stock crosses the threshold.
//
// Body: { adjustment: number, reason?: string }
//   adjustment > 0 → restock
//   adjustment < 0 → consumption / removal
// ═══════════════════════════════════════════════════════
const adjustStock = async (req, res) => {
  const { id }                 = req.params;
  const { adjustment, reason } = req.body;

  if (adjustment === undefined || isNaN(Number(adjustment))) {
    return res.status(400).json({ message: 'adjustment (number) is required.' });
  }
  if (Number(adjustment) === 0) {
    return res.status(400).json({ message: 'adjustment cannot be zero.' });
  }

  try {
    const existing = await pool.query(
      'SELECT * FROM inventory WHERE inventory_id = $1 AND org_id = $2',
      [id, req.user.org_id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Inventory item not found.' });
    }

    const item      = existing.rows[0];
    const delta     = parseFloat(adjustment);
    const newStock  = Math.max(0, parseFloat(item.current_stock) + delta);
    const newStatus = computeStatus(newStock, parseFloat(item.reorder_point));

    // Build consumption_history entry
    const historyEntry = {
      date:        new Date().toISOString().split('T')[0],
      adjustment:  delta,
      reason:      reason || (delta > 0 ? 'Restock' : 'Consumption'),
      stock_after: newStock,
      adjusted_by: req.user.user_id,
    };
    const history = [...(Array.isArray(item.consumption_history) ? item.consumption_history : []), historyEntry];

    const result = await pool.query(
      `UPDATE inventory
       SET current_stock       = $1,
           status              = $2,
           consumption_history = $3::jsonb
       WHERE inventory_id = $4 AND org_id = $5
       RETURNING *`,
      [newStock, newStatus, JSON.stringify(history), id, req.user.org_id]
    );

    const updated = result.rows[0];

    // Alert when status worsens
    const statusWorsened = item.status === 'In Stock' && newStatus !== 'In Stock';
    if (statusWorsened) {
      await triggerLowStockAlert(updated);
      return res.status(200).json({
        message:    `Stock adjusted. ⚠️ Item is now "${newStatus}" — alert sent.`,
        item:       updated,
        alert_sent: true,
      });
    }

    return res.status(200).json({
      message: `Stock ${delta > 0 ? 'increased' : 'decreased'} by ${Math.abs(delta)}. New stock: ${newStock} ${item.unit}.`,
      item:    updated,
    });
  } catch (err) {
    console.error('adjustStock error:', err.message);
    return res.status(500).json({ message: 'Server error adjusting stock.' });
  }
};


// ═══════════════════════════════════════════════════════
// GET /api/inventory/alerts
// Returns all Low Stock and Out of Stock items for the org,
// sorted by urgency (Out of Stock first).
// Includes shortage quantity for each item.
// ═══════════════════════════════════════════════════════
const getLowStockAlerts = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT inventory_id, sku, item_name, category, unit,
              current_stock, reorder_point, status, supplier_email, created_at
       FROM   inventory
       WHERE  org_id = $1
         AND  status IN ('Low Stock', 'Out of Stock')
       ORDER BY
         CASE status
           WHEN 'Out of Stock' THEN 1
           WHEN 'Low Stock'    THEN 2
           ELSE 3
         END,
         item_name ASC`,
      [req.user.org_id]
    );

    const alerts = result.rows.map((item) => ({
      ...item,
      shortage: Math.max(0, parseFloat(item.reorder_point) - parseFloat(item.current_stock)),
      urgency:  item.status === 'Out of Stock' ? 'Critical' : 'Warning',
    }));

    return res.status(200).json({
      total_alerts: alerts.length,
      alerts,
    });
  } catch (err) {
    console.error('getLowStockAlerts error:', err.message);
    return res.status(500).json({ message: 'Server error fetching alerts.' });
  }
};


// ═══════════════════════════════════════════════════════
// POST /api/inventory/alerts/notify
// Manually triggers email notifications for ALL items
// currently in Low Stock or Out of Stock status.
// Admin / Manager only (enforced at route level).
// ═══════════════════════════════════════════════════════
const sendAlertEmails = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM inventory
       WHERE org_id = $1 AND status IN ('Low Stock', 'Out of Stock')`,
      [req.user.org_id]
    );

    if (result.rows.length === 0) {
      return res.status(200).json({ message: 'All items are sufficiently stocked. No alerts sent.' });
    }

    const sent   = [];
    const failed = [];

    for (const item of result.rows) {
      try {
        await triggerLowStockAlert(item);
        sent.push(item.item_name);
      } catch {
        failed.push(item.item_name);
      }
    }

    return res.status(200).json({
      message:      `Alert emails processed for ${result.rows.length} item(s).`,
      sent_count:   sent.length,
      failed_count: failed.length,
      sent,
      failed,
    });
  } catch (err) {
    console.error('sendAlertEmails error:', err.message);
    return res.status(500).json({ message: 'Server error sending alert emails.' });
  }
};


module.exports = {
  getInventory,
  getInventoryById,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  adjustStock,
  getLowStockAlerts,
  sendAlertEmails,
};
