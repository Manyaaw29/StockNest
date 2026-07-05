const express = require('express');
const { authMiddleware, checkRole } = require('../middleware/authMiddleware');

const {
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
} = require('../controllers/assetController');

// ─────────────────────────────────────────────
// Assets Router
// Base: /api/assets
// ─────────────────────────────────────────────
const assetsRouter = express.Router();

// All asset routes require a valid JWT
assetsRouter.use(authMiddleware);

assetsRouter.get('/',    getAssets);                                  // GET    /api/assets
assetsRouter.get('/:id', getAssetById);                               // GET    /api/assets/:id
assetsRouter.post('/',   checkRole('Admin', 'Manager'), createAsset); // POST   /api/assets
assetsRouter.put('/:id', checkRole('Admin', 'Manager'), updateAsset); // PUT    /api/assets/:id
assetsRouter.delete('/:id', checkRole('Admin'),         deleteAsset); // DELETE /api/assets/:id

// ─────────────────────────────────────────────
// Maintenance Router
// Base: /api/maintenance
// ─────────────────────────────────────────────
const maintenanceRouter = express.Router();

// All maintenance routes require a valid JWT
maintenanceRouter.use(authMiddleware);

maintenanceRouter.get('/',    getMaintenance);                                       // GET    /api/maintenance
maintenanceRouter.get('/:id', getMaintenanceById);                                   // GET    /api/maintenance/:id
maintenanceRouter.post('/',   checkRole('Admin', 'Manager'), createMaintenance);     // POST   /api/maintenance
maintenanceRouter.put('/:id', checkRole('Admin', 'Manager'), updateMaintenance);     // PUT    /api/maintenance/:id
maintenanceRouter.delete('/:id', checkRole('Admin'),         deleteMaintenance);     // DELETE /api/maintenance/:id

module.exports = { assetsRouter, maintenanceRouter };
