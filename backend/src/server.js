const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes                        = require('./routes/authRoutes');
const dashboardRoutes                   = require('./routes/dashboardRoutes');
const organizationRoutes                = require('./routes/organizationRoutes');
const { assetsRouter, maintenanceRouter } = require('./routes/assets');
const inventoryRoutes                   = require('./routes/inventoryRoutes');

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth',          authRoutes);
app.use('/api/dashboard',     dashboardRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/assets',        assetsRouter);
app.use('/api/maintenance',   maintenanceRouter);
app.use('/api/inventory',     inventoryRoutes);

app.get('/api/test', (req, res) => {
    res.json({ message: 'StockNest Backend is Running!' });
});

const PORT = process.env.SERVER_PORT || 5000;
app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
});