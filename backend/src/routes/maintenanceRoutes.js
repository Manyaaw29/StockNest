const express = require('express');
const { authMiddleware, checkRole } = require('../middleware/authMiddleware');

const {
  getMaintenance,
  getMaintenanceById,
  createMaintenance,
  updateMaintenance,
  deleteMaintenance,
} = require('../controllers/maintenanceController');

const router = express.Router();

// All maintenance routes require authentication
router.use(authMiddleware);

router.get('/',    getMaintenance);                                       // GET    /api/maintenance
router.get('/:id', getMaintenanceById);                                   // GET    /api/maintenance/:id
router.post('/',   checkRole('Admin', 'Manager'), createMaintenance);     // POST   /api/maintenance
router.put('/:id', checkRole('Admin', 'Manager'), updateMaintenance);     // PUT    /api/maintenance/:id
router.delete('/:id', checkRole('Admin', 'Manager'), deleteMaintenance);     // DELETE /api/maintenance/:id

module.exports = router;
