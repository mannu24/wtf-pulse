const prisma = require('../db/prisma');
const { broadcast } = require('../websocket/wsServer');

let intervalId = null;
let currentSpeed = 1;

const simulatorService = {
  start(wss, speed = 1) {
    if (intervalId) clearInterval(intervalId);
    currentSpeed = speed;
    const intervalMs = 2000 / speed;

    intervalId = setInterval(async () => {
      try {
        await generateEvent(wss);
      } catch (err) {
        console.error('Simulator event error:', err);
      }
    }, intervalMs);
  },

  stop() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  },

  async reset() {
    this.stop();
    // Clear open check-ins (set checked_out), preserve historical
    const now = new Date();
    await prisma.checkin.updateMany({
      where: { checkedOut: null },
      data: { checkedOut: now, durationMin: 60 },
    });
    // Clear non-resolved anomalies
    await prisma.anomaly.updateMany({
      where: { resolved: false },
      data: { resolved: true, resolvedAt: now },
    });
  },

  isRunning() {
    return intervalId !== null;
  },

  getSpeed() {
    return currentSpeed;
  },
};

async function generateEvent(wss) {
  const gyms = await prisma.gym.findMany({ where: { status: 'active' } });
  const gym = gyms[Math.floor(Math.random() * gyms.length)];

  // 60% chance check-in, 30% check-out, 10% payment
  const roll = Math.random();

  if (roll < 0.6) {
    // Check-in: pick a random member not currently checked in
    const member = await prisma.member.findFirst({
      where: {
        gymId: gym.id,
        status: 'active',
        checkins: { none: { checkedOut: null } },
      },
    });
    if (!member) return;

    const checkin = await prisma.checkin.create({
      data: { memberId: member.id, gymId: gym.id, checkedIn: new Date() },
    });

    await prisma.member.update({
      where: { id: member.id },
      data: { lastCheckinAt: new Date() },
    });

    const occupancy = await prisma.checkin.count({ where: { gymId: gym.id, checkedOut: null } });

    broadcast(wss, 'CHECKIN_EVENT', {
      gym_id: gym.id,
      member_name: member.name,
      timestamp: new Date().toISOString(),
      current_occupancy: occupancy,
      capacity_pct: Math.round((occupancy / gym.capacity) * 100),
    });
  } else if (roll < 0.9) {
    // Check-out: pick a random open check-in
    const openCheckin = await prisma.checkin.findFirst({
      where: { gymId: gym.id, checkedOut: null },
      include: { member: { select: { name: true } } },
    });
    if (!openCheckin) return;

    const now = new Date();
    const durationMin = Math.round((now - openCheckin.checkedIn) / 60000);

    await prisma.checkin.update({
      where: { id: openCheckin.id },
      data: { checkedOut: now, durationMin },
    });

    const occupancy = await prisma.checkin.count({ where: { gymId: gym.id, checkedOut: null } });

    broadcast(wss, 'CHECKOUT_EVENT', {
      gym_id: gym.id,
      member_name: openCheckin.member.name,
      timestamp: now.toISOString(),
      current_occupancy: occupancy,
      capacity_pct: Math.round((occupancy / gym.capacity) * 100),
    });
  } else {
    // Payment event
    const member = await prisma.member.findFirst({
      where: { gymId: gym.id, status: 'active' },
      orderBy: { joinedAt: 'desc' },
    });
    if (!member) return;

    const amounts = { monthly: 1499, quarterly: 3999, annual: 11999 };
    const amount = amounts[member.planType] || 1499;

    await prisma.payment.create({
      data: {
        memberId: member.id,
        gymId: gym.id,
        amount,
        planType: member.planType,
        paymentType: 'renewal',
        paidAt: new Date(),
      },
    });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayRev = await prisma.payment.aggregate({
      where: { gymId: gym.id, paidAt: { gte: todayStart } },
      _sum: { amount: true },
    });

    broadcast(wss, 'PAYMENT_EVENT', {
      gym_id: gym.id,
      amount,
      plan_type: member.planType,
      member_name: member.name,
      today_total: Number(todayRev._sum.amount || 0),
    });
  }
}

module.exports = simulatorService;
