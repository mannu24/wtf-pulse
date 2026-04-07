const router = require('express').Router();
const prisma = require('../db/prisma');

// GET /api/anomalies — Active anomalies, newest first
router.get('/', async (req, res) => {
  try {
    const { gym_id, severity } = req.query;
    const where = {};
    if (gym_id) where.gymId = gym_id;
    if (severity) where.severity = severity;

    const anomalies = await prisma.anomaly.findMany({
      where,
      include: { gym: { select: { name: true } } },
      orderBy: { detectedAt: 'desc' },
    });
    res.json(anomalies);
  } catch (err) {
    console.error('GET /api/anomalies error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/anomalies/:id/dismiss — Dismiss warning anomalies only
router.patch('/:id/dismiss', async (req, res) => {
  try {
    const { id } = req.params;
    const anomaly = await prisma.anomaly.findUnique({ where: { id } });
    if (!anomaly) return res.status(404).json({ error: 'Anomaly not found' });
    if (anomaly.severity === 'critical') {
      return res.status(403).json({ error: 'Cannot dismiss critical anomalies' });
    }

    const updated = await prisma.anomaly.update({
      where: { id },
      data: { dismissed: true, resolved: true, resolvedAt: new Date() },
    });
    res.json(updated);
  } catch (err) {
    console.error('PATCH /api/anomalies/:id/dismiss error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
