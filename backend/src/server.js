const express = require('express');
const cors = require('cors');
const bookingRoutes = require('./routes/bookingRoutes');
require('dotenv').config();

const authRoutes          = require('./routes/authRoutes');
const dashboardRoutes     = require('./routes/dashboardRoutes');
const organizationRoutes  = require('./routes/organizationRoutes');
const roomRoutes = require('./routes/roomRoutes');
const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth',          authRoutes);
app.use('/api/dashboard',     dashboardRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/bookings', bookingRoutes);
app.get('/api/test', (req, res) => {
    res.json({ message: 'StockNest Backend is Running!' });
});

const PORT = process.env.SERVER_PORT || 5000;
app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
});