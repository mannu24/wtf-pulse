require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { setupWebSocket } = require('./websocket/wsServer');
const { authMiddleware } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const gymRoutes = require('./routes/gyms');
const anomalyRoutes = require('./routes/anomalies');
const analyticsRoutes = require('./routes/analytics');
const simulatorRoutes = require('./routes/simulator');
const { startAnomalyDetector } = require('./jobs/anomalyDetector');
const { startMatViewRefresh } = require('./jobs/matViewRefresh');

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

// Health check (public)
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Auth routes (public)
app.use('/api/auth', authRoutes);

// Protected routes
app.use('/api/gyms', authMiddleware, gymRoutes);
app.use('/api/anomalies', authMiddleware, anomalyRoutes);
app.use('/api/analytics', authMiddleware, analyticsRoutes);
app.use('/api/simulator', authMiddleware, simulatorRoutes);

// WebSocket
const wss = setupWebSocket(server);
app.set('wss', wss);

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
  startAnomalyDetector(wss);
  startMatViewRefresh();
});

module.exports = { app, server };
