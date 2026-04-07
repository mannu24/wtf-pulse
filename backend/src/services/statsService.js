const prisma = require('../db/prisma');

const statsService = {
  async getLiveOccupancy(gymId) {
    const result = await prisma.checkin.count({
      where: { gymId, checkedOut: null },
    });
    return result;
  },

  async getTodayRevenue(gymId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const result = await prisma.payment.aggregate({
      where: { gymId, paidAt: { gte: today } },
      _sum: { amount: true },
    });
    return Number(result._sum.amount || 0);
  },

  async getRecentEvents(gymId, limit = 20) {
    const checkins = await prisma.checkin.findMany({
      where: { gymId },
      include: { member: { select: { name: true } } },
      orderBy: { checkedIn: 'desc' },
      take: limit,
    });
    return checkins.map((c) => ({
      type: c.checkedOut ? 'checkout' : 'checkin',
      memberName: c.member.name,
      timestamp: c.checkedOut || c.checkedIn,
      gymId: c.gymId,
    }));
  },

  async getPeakHours(gymId) {
    const rows = await prisma.$queryRaw`
      SELECT day_of_week, hour, checkin_count, avg_duration_min
      FROM gym_hourly_stats
      WHERE gym_id = ${gymId}::uuid
      ORDER BY day_of_week, hour
    `;
    return rows;
  },

  async getRevenueByPlan(gymId, dateRange) {
    const days = dateRange === '7d' ? 7 : dateRange === '90d' ? 90 : 30;
    const since = new Date(Date.now() - days * 86400000);
    const result = await prisma.payment.groupBy({
      by: ['planType'],
      where: { gymId, paidAt: { gte: since } },
      _sum: { amount: true },
      _count: true,
    });
    return result.map((r) => ({
      planType: r.planType,
      total: Number(r._sum.amount || 0),
      count: r._count,
    }));
  },

  async getChurnRisk(gymId) {
    const now = new Date();
    const d45 = new Date(now.getTime() - 45 * 86400000);
    const d60 = new Date(now.getTime() - 60 * 86400000);

    const members = await prisma.member.findMany({
      where: {
        gymId,
        status: 'active',
        lastCheckinAt: { lt: d45 },
      },
      select: { id: true, name: true, lastCheckinAt: true },
      orderBy: { lastCheckinAt: 'asc' },
    });

    return members.map((m) => ({
      ...m,
      riskLevel: m.lastCheckinAt && m.lastCheckinAt < d60 ? 'critical' : 'high',
    }));
  },

  async getNewVsRenewal(gymId, dateRange) {
    const days = dateRange === '7d' ? 7 : dateRange === '90d' ? 90 : 30;
    const since = new Date(Date.now() - days * 86400000);
    const result = await prisma.member.groupBy({
      by: ['memberType'],
      where: { gymId, joinedAt: { gte: since } },
      _count: true,
    });
    return result.map((r) => ({ memberType: r.memberType, count: r._count }));
  },

  async getCrossGymRevenue() {
    const since = new Date(Date.now() - 30 * 86400000);
    const result = await prisma.payment.groupBy({
      by: ['gymId'],
      where: { paidAt: { gte: since } },
      _sum: { amount: true },
    });

    const gyms = await prisma.gym.findMany({ select: { id: true, name: true } });
    const gymMap = Object.fromEntries(gyms.map((g) => [g.id, g.name]));

    return result
      .map((r) => ({
        gymId: r.gymId,
        gymName: gymMap[r.gymId] || 'Unknown',
        revenue: Number(r._sum.amount || 0),
      }))
      .sort((a, b) => b.revenue - a.revenue);
  },
};

module.exports = statsService;
