const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes                        = require('./routes/authRoutes');
const userRoutes                        = require('./routes/userRoutes');
const dashboardRoutes                   = require('./routes/dashboardRoutes');
const organizationRoutes                = require('./routes/organizationRoutes');
const maintenanceRoutes                 = require('./routes/maintenanceRoutes');
const inventoryRoutes                   = require('./routes/inventoryRoutes');
const roomRoutes                        = require('./routes/roomRoutes');
const bookingRoutes                     = require('./routes/bookingRoutes');
const assetRoutes                       = require('./routes/assetRoutes');
const clientRoutes                      = require('./routes/clientRoutes');

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth',          authRoutes);
app.use('/api/users',         userRoutes);
app.use('/api/dashboard',     dashboardRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/maintenance',   maintenanceRoutes);
app.use('/api/inventory',     inventoryRoutes);
app.use('/api/rooms',         roomRoutes);
app.use('/api/bookings',      bookingRoutes);
app.use('/api/assets',        assetRoutes);
app.use('/api/clients',       clientRoutes);

app.get('/health', async (req, res) => {
  const pool = require('./config/db');
  try {
    await pool.query('SELECT 1');
    res.json({
      status: 'UP',
      database: 'CONNECTED',
      server: 'HEALTHY',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({
      status: 'DOWN',
      database: 'DISCONNECTED',
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/test', (req, res) => {
    res.json({ message: 'StockNest Backend is Running!' });
});

const PORT = process.env.PORT || process.env.SERVER_PORT || 5000;
app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
});