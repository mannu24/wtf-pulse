const router = require('express').Router();
const statsService = require('../services/statsService');

// GET /api/analytics/cross-gym — Revenue comparison all gyms, last 30 days
router.get('/cross-gym', async (req, res) => {
  try {
    const data = await statsService.getCrossGymRevenue();
    res.json(data);
  } catch (err) {
    console.error('GET /api/analytics/cross-gym error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
