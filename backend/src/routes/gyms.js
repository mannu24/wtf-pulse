const router = require('express').Router();
const prisma = require('../db/prisma');
const statsService = require('../services/statsService');

// GET /api/gyms — List all gyms with current_occupancy and today_revenue
router.get('/', async (req, res) => {
  try {
    const gyms = await prisma.gym.findMany({ orderBy: { name: 'asc' } });
    const enriched = await Promise.all(
      gyms.map(async (gym) => {
        const [occupancy, revenue] = await Promise.all([
          statsService.getLiveOccupancy(gym.id),
          statsService.getTodayRevenue(gym.id),
        ]);
        return { ...gym, currentOccupancy: occupancy, todayRevenue: revenue };
      })
    );
    res.json(enriched);
  } catch (err) {
    console.error('GET /api/gyms error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/gyms/:id/live — Single gym live snapshot
router.get('/:id/live', async (req, res) => {
  try {
    const { id } = req.params;
    const gym = await prisma.gym.findUnique({ where: { id } });
    if (!gym) return res.status(404).json({ error: 'Gym not found' });

    const [occupancy, revenue, recentEvents, anomalies] = await Promise.all([
      statsService.getLiveOccupancy(id),
      statsService.getTodayRevenue(id),
      statsService.getRecentEvents(id),
      prisma.anomaly.findMany({
        where: { gymId: id, resolved: false },
        orderBy: { detectedAt: 'desc' },
      }),
    ]);

    res.json({
      ...gym,
      currentOccupancy: occupancy,
      todayRevenue: revenue,
      recentEvents,
      anomalies,
    });
  } catch (err) {
    console.error('GET /api/gyms/:id/live error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/gyms/:id/analytics
router.get('/:id/analytics', async (req, res) => {
  try {
    const { id } = req.params;
    const dateRange = req.query.dateRange || '30d';
    const gym = await prisma.gym.findUnique({ where: { id } });
    if (!gym) return res.status(404).json({ error: 'Gym not found' });

    const [peakHours, revenueByPlan, churnRisk, newVsRenewal] = await Promise.all([
      statsService.getPeakHours(id),
      statsService.getRevenueByPlan(id, dateRange),
      statsService.getChurnRisk(id),
      statsService.getNewVsRenewal(id, dateRange),
    ]);

    res.json({ peakHours, revenueByPlan, churnRisk, newVsRenewal });
  } catch (err) {
    console.error('GET /api/gyms/:id/analytics error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
