const router = require('express').Router();
const simulatorService = require('../services/simulatorService');

// POST /api/simulator/start
router.post('/start', (req, res) => {
  try {
    const { speed } = req.body;
    const wss = req.app.get('wss');
    simulatorService.start(wss, speed || 1);
    res.json({ status: 'running', speed: speed || 1 });
  } catch (err) {
    console.error('POST /api/simulator/start error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/simulator/stop
router.post('/stop', (req, res) => {
  try {
    simulatorService.stop();
    res.json({ status: 'stopped' });
  } catch (err) {
    console.error('POST /api/simulator/stop error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/simulator/reset
router.post('/reset', async (req, res) => {
  try {
    await simulatorService.reset();
    res.json({ status: 'reset' });
  } catch (err) {
    console.error('POST /api/simulator/reset error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
