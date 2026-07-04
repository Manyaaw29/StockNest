const express = require('express');
const router  = express.Router();

const {
  getOrganizations,
  createOrganization,
  getOrganizationById,
  updateOrganization,
  deleteOrganization,
} = require('../controllers/organizationController');

// GET /api/organizations
router.get('/', getOrganizations);

// POST /api/organizations
router.post('/', createOrganization);

// GET /api/organizations/:id
router.get('/:id', getOrganizationById);

// PUT /api/organizations/:id
router.put('/:id', updateOrganization);

// DELETE /api/organizations/:id
router.delete('/:id', deleteOrganization);

module.exports = router;
