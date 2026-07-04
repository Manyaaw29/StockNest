const express = require('express');
const router  = express.Router();

const { getDashboard } = require('../controllers/dashboardController');

// GET /api/dashboard — public (mock data)
router.get('/', getDashboard);

module.exports = router;
