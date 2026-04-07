const prisma = require('../db/prisma');

const anomalyService = {
  async detectZeroCheckins() {
    const twoHoursAgo = new Date(Date.now() - 2 * 3600000);
    const gyms = await prisma.gym.findMany({ where: { status: 'active' } });
    const anomalies = [];

    for (const gym of gyms) {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      if (currentTime < gym.opensAt || currentTime > gym.closesAt) continue;

      const recentCheckins = await prisma.checkin.count({
        where: { gymId: gym.id, checkedIn: { gte: twoHoursAgo } },
      });

      if (recentCheckins === 0) {
        const existing = await prisma.anomaly.findFirst({
          where: { gymId: gym.id, type: 'zero_checkins', resolved: false },
        });
        if (!existing) {
          const anomaly = await prisma.anomaly.create({
            data: {
              gymId: gym.id,
              type: 'zero_checkins',
              severity: 'warning',
              message: `No check-ins at ${gym.name} in the last 2 hours during operating hours`,
            },
          });
          anomalies.push({ ...anomaly, gymName: gym.name });
        }
      } else {
        // Auto-resolve if check-ins resumed
        await prisma.anomaly.updateMany({
          where: { gymId: gym.id, type: 'zero_checkins', resolved: false },
          data: { resolved: true, resolvedAt: new Date() },
        });
      }
    }
    return anomalies;
  },

  async detectCapacityBreach() {
    const gyms = await prisma.gym.findMany({ where: { status: 'active' } });
    const anomalies = [];

    for (const gym of gyms) {
      const occupancy = await prisma.checkin.count({
        where: { gymId: gym.id, checkedOut: null },
      });
      const pct = occupancy / gym.capacity;

      if (pct > 0.9) {
        const existing = await prisma.anomaly.findFirst({
          where: { gymId: gym.id, type: 'capacity_breach', resolved: false },
        });
        if (!existing) {
          const anomaly = await prisma.anomaly.create({
            data: {
              gymId: gym.id,
              type: 'capacity_breach',
              severity: 'critical',
              message: `${gym.name} at ${Math.round(pct * 100)}% capacity (${occupancy}/${gym.capacity})`,
            },
          });
          anomalies.push({ ...anomaly, gymName: gym.name });
        }
      } else if (pct < 0.85) {
        // Auto-resolve when below 85%
        const resolved = await prisma.anomaly.findMany({
          where: { gymId: gym.id, type: 'capacity_breach', resolved: false },
        });
        if (resolved.length > 0) {
          await prisma.anomaly.updateMany({
            where: { gymId: gym.id, type: 'capacity_breach', resolved: false },
            data: { resolved: true, resolvedAt: new Date() },
          });
          resolved.forEach((a) => anomalies.push({ ...a, resolved: true, gymName: gym.name }));
        }
      }
    }
    return anomalies;
  },

  async detectRevenueDrop() {
    const gyms = await prisma.gym.findMany({ where: { status: 'active' } });
    const anomalies = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today.getTime() + 86400000);
    const lastWeekStart = new Date(today.getTime() - 7 * 86400000);
    const lastWeekEnd = new Date(lastWeekStart.getTime() + 86400000);

    for (const gym of gyms) {
      const [todayRev, lastWeekRev] = await Promise.all([
        prisma.payment.aggregate({
          where: { gymId: gym.id, paidAt: { gte: today, lt: tomorrow } },
          _sum: { amount: true },
        }),
        prisma.payment.aggregate({
          where: { gymId: gym.id, paidAt: { gte: lastWeekStart, lt: lastWeekEnd } },
          _sum: { amount: true },
        }),
      ]);

      const todayTotal = Number(todayRev._sum.amount || 0);
      const lastWeekTotal = Number(lastWeekRev._sum.amount || 0);

      if (lastWeekTotal > 0 && todayTotal < lastWeekTotal * 0.7) {
        const existing = await prisma.anomaly.findFirst({
          where: { gymId: gym.id, type: 'revenue_drop', resolved: false },
        });
        if (!existing) {
          const anomaly = await prisma.anomaly.create({
            data: {
              gymId: gym.id,
              type: 'revenue_drop',
              severity: 'warning',
              message: `Revenue at ${gym.name} today (₹${todayTotal}) is <70% of last ${today.toLocaleDateString('en-US', { weekday: 'long' })} (₹${lastWeekTotal})`,
            },
          });
          anomalies.push({ ...anomaly, gymName: gym.name });
        }
      } else if (lastWeekTotal > 0 && todayTotal >= lastWeekTotal * 0.8) {
        // Auto-resolve when within 20%
        await prisma.anomaly.updateMany({
          where: { gymId: gym.id, type: 'revenue_drop', resolved: false },
          data: { resolved: true, resolvedAt: new Date() },
        });
      }
    }
    return anomalies;
  },
};

module.exports = anomalyService;
