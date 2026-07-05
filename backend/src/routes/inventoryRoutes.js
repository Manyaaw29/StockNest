const express = require('express');
const router  = express.Router();

const { authMiddleware, checkRole } = require('../middleware/authMiddleware');
const {
  getInventory,
  getInventoryById,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  adjustStock,
  getLowStockAlerts,
  sendAlertEmails,
} = require('../controllers/inventoryController');

// All inventory routes require a valid JWT
router.use(authMiddleware);

// ─────────────────────────────────────────────
// Alert routes
// Must be declared BEFORE /:id routes so Express
// doesn't treat "alerts" as an :id param value.
// ─────────────────────────────────────────────
router.get('/alerts',          getLowStockAlerts);                              // GET  /api/inventory/alerts
router.post('/alerts/notify',  checkRole('Admin', 'Manager'), sendAlertEmails); // POST /api/inventory/alerts/notify

// ─────────────────────────────────────────────
// CRUD routes
// ─────────────────────────────────────────────
router.get('/',     getInventory);                                               // GET    /api/inventory
router.get('/:id',  getInventoryById);                                           // GET    /api/inventory/:id
router.post('/',    checkRole('Admin', 'Manager'), createInventoryItem);         // POST   /api/inventory
router.put('/:id',  checkRole('Admin', 'Manager'), updateInventoryItem);         // PUT    /api/inventory/:id
router.delete('/:id', checkRole('Admin'),          deleteInventoryItem);         // DELETE /api/inventory/:id

// ─────────────────────────────────────────────
// Stock adjustment route
// Staff can adjust stock (consume/restock), but
// only Admins & Managers can create or delete.
// ─────────────────────────────────────────────
router.patch('/:id/adjust', checkRole('Admin', 'Manager', 'Staff'), adjustStock); // PATCH /api/inventory/:id/adjust

module.exports = router;
