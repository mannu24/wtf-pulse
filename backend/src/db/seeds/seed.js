const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

// ─── Gym Data ───
const GYM_DATA = [
  { name: 'WTF Bandra West', city: 'Mumbai', capacity: 300, opensAt: '05:00', closesAt: '23:00' },
  { name: 'WTF Powai', city: 'Mumbai', capacity: 280, opensAt: '05:00', closesAt: '23:00' },
  { name: 'WTF Lajpat Nagar', city: 'Delhi', capacity: 250, opensAt: '05:30', closesAt: '22:30' },
  { name: 'WTF Connaught Place', city: 'Delhi', capacity: 260, opensAt: '06:00', closesAt: '23:00' },
  { name: 'WTF Indiranagar', city: 'Bangalore', capacity: 240, opensAt: '05:00', closesAt: '22:00' },
  { name: 'WTF Koramangala', city: 'Bangalore', capacity: 230, opensAt: '05:30', closesAt: '22:30' },
  { name: 'WTF Banjara Hills', city: 'Hyderabad', capacity: 220, opensAt: '05:00', closesAt: '22:00' },
  { name: 'WTF Noida Sec 18', city: 'Noida', capacity: 200, opensAt: '06:00', closesAt: '22:00' },
  { name: 'WTF Salt Lake', city: 'Kolkata', capacity: 180, opensAt: '05:30', closesAt: '22:00' },
  { name: 'WTF Velachery', city: 'Chennai', capacity: 190, opensAt: '05:00', closesAt: '22:30' },
];

const MEMBER_DIST_PCT = [0.13, 0.11, 0.15, 0.12, 0.11, 0.10, 0.09, 0.08, 0.06, 0.05];
const ACTIVE_PCT = [0.88, 0.86, 0.90, 0.87, 0.89, 0.85, 0.84, 0.82, 0.80, 0.78];
const PLAN_DIST = [
  { monthly: 0.50, quarterly: 0.30, annual: 0.20 },
  { monthly: 0.45, quarterly: 0.35, annual: 0.20 },
  { monthly: 0.55, quarterly: 0.25, annual: 0.20 },
  { monthly: 0.48, quarterly: 0.32, annual: 0.20 },
  { monthly: 0.52, quarterly: 0.28, annual: 0.20 },
  { monthly: 0.50, quarterly: 0.30, annual: 0.20 },
  { monthly: 0.47, quarterly: 0.33, annual: 0.20 },
  { monthly: 0.53, quarterly: 0.27, annual: 0.20 },
  { monthly: 0.50, quarterly: 0.30, annual: 0.20 },
  { monthly: 0.55, quarterly: 0.25, annual: 0.20 },
];

const PLAN_AMOUNTS = { monthly: 1499, quarterly: 3999, annual: 11999 };
const PLAN_DAYS = { monthly: 30, quarterly: 90, annual: 365 };

const HOURLY_MULTIPLIERS = {
  5: 0.3, 6: 0.7, 7: 1.0, 8: 0.8, 9: 0.5, 10: 0.3, 11: 0.2, 12: 0.2,
  13: 0.2, 14: 0.2, 15: 0.3, 16: 0.5, 17: 0.8, 18: 0.9, 19: 0.85,
  20: 0.6, 21: 0.4, 22: 0.2,
};
const DAY_MULTIPLIERS = [0.45, 1.0, 0.9, 0.85, 0.9, 0.8, 0.55]; // Sun-Sat

const FIRST_NAMES = [
  'Aarav','Vivaan','Aditya','Vihaan','Arjun','Sai','Reyansh','Ayaan','Krishna','Ishaan',
  'Ananya','Diya','Myra','Sara','Aanya','Aadhya','Isha','Riya','Priya','Kavya',
  'Rohan','Rahul','Amit','Vikram','Suresh','Rajesh','Deepak','Nikhil','Karan','Manish',
  'Sneha','Pooja','Neha','Meera','Anjali','Divya','Shruti','Nisha','Swati','Tanvi',
  'Harsh','Gaurav','Siddharth','Pranav','Varun','Akash','Mohit','Tushar','Vishal','Sachin',
];
const LAST_NAMES = [
  'Sharma','Patel','Singh','Kumar','Gupta','Reddy','Nair','Joshi','Verma','Iyer',
  'Mehta','Shah','Rao','Das','Pillai','Mishra','Chopra','Bhat','Menon','Agarwal',
  'Banerjee','Chatterjee','Mukherjee','Ghosh','Sen','Bose','Roy','Dutta','Sinha','Thakur',
];

function randomItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randomDate(daysAgoMin, daysAgoMax) {
  const now = Date.now();
  const ms = now - randomInt(daysAgoMin, daysAgoMax) * 86400000 - randomInt(0, 86400000);
  return new Date(ms);
}

async function main() {
  console.log('🌱 Starting seed...');
  const startTime = Date.now();

  // ─── 1. Seed Gyms ───
  console.log('  → Seeding gyms...');
  const gyms = [];
  for (const g of GYM_DATA) {
    const gym = await prisma.gym.upsert({
      where: { id: '00000000-0000-0000-0000-000000000000' }, // force create
      update: {},
      create: { name: g.name, city: g.city, capacity: g.capacity, status: 'active', opensAt: g.opensAt, closesAt: g.closesAt },
    });
    gyms.push(gym);
  }
  // Re-fetch to get actual IDs
  const allGyms = await prisma.gym.findMany({ orderBy: { name: 'asc' } });
  // Map by name for reliable lookup
  const gymByName = {};
  allGyms.forEach(g => gymByName[g.name] = g);
  const orderedGyms = GYM_DATA.map(g => gymByName[g.name]);
  console.log(`  ✓ ${orderedGyms.length} gyms seeded`);

  // ─── 1b. Seed Admin Users ───
  console.log('  → Seeding admin users...');
  const adminPassword = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@wtflivepulse.com' },
    update: {},
    create: {
      email: 'admin@wtflivepulse.com',
      password: adminPassword,
      name: 'Admin',
      role: 'admin',
    },
  });
  await prisma.user.upsert({
    where: { email: 'manager@wtflivepulse.com' },
    update: {},
    create: {
      email: 'manager@wtflivepulse.com',
      password: await bcrypt.hash('manager123', 10),
      name: 'Gym Manager',
      role: 'admin',
    },
  });
  console.log('  ✓ Admin users seeded (admin@wtflivepulse.com / admin123)');

  // ─── 2. Seed Members (5,000) ───
  console.log('  → Seeding members...');
  const TOTAL_MEMBERS = 5000;
  const allMembers = [];
  const usedEmails = new Set();

  for (let gi = 0; gi < orderedGyms.length; gi++) {
    const gym = orderedGyms[gi];
    const count = Math.round(TOTAL_MEMBERS * MEMBER_DIST_PCT[gi]);
    const activePct = ACTIVE_PCT[gi];
    const plans = PLAN_DIST[gi];

    for (let i = 0; i < count; i++) {
      const firstName = randomItem(FIRST_NAMES);
      const lastName = randomItem(LAST_NAMES);
      const name = `${firstName} ${lastName}`;
      let email;
      do {
        email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}+${randomInt(1000, 99999)}@gmail.com`;
      } while (usedEmails.has(email));
      usedEmails.add(email);

      const phone = `${randomInt(7, 9)}${String(randomInt(100000000, 999999999)).padStart(9, '0')}`;

      // Plan type
      const planRoll = Math.random();
      const planType = planRoll < plans.monthly ? 'monthly' : planRoll < plans.monthly + plans.quarterly ? 'quarterly' : 'annual';

      // Member type: 80% new, 20% renewal
      const memberType = Math.random() < 0.8 ? 'new' : 'renewal';

      // Status
      const statusRoll = Math.random();
      let status, joinedAt;
      if (statusRoll < activePct) {
        status = 'active';
        joinedAt = randomDate(1, 90);
      } else if (statusRoll < activePct + 0.08) {
        status = 'inactive';
        joinedAt = randomDate(91, 180);
      } else {
        status = 'frozen';
        joinedAt = randomDate(91, 180);
      }

      const planExpiresAt = new Date(joinedAt.getTime() + PLAN_DAYS[planType] * 86400000);

      allMembers.push({
        gymId: gym.id,
        name,
        email,
        phone,
        planType,
        memberType,
        status,
        joinedAt,
        planExpiresAt,
        lastCheckinAt: null,
      });
    }
  }

  // Batch insert members
  const BATCH = 500;
  for (let i = 0; i < allMembers.length; i += BATCH) {
    await prisma.member.createMany({ data: allMembers.slice(i, i + BATCH), skipDuplicates: true });
    if (i % 2000 === 0) console.log(`    members: ${Math.min(i + BATCH, allMembers.length)}/${allMembers.length}`);
  }
  console.log(`  ✓ ${allMembers.length} members seeded`);

  // Fetch all members with IDs
  const dbMembers = await prisma.member.findMany({ select: { id: true, gymId: true, status: true, planType: true, memberType: true, joinedAt: true } });
  const membersByGym = {};
  dbMembers.forEach(m => {
    if (!membersByGym[m.gymId]) membersByGym[m.gymId] = [];
    membersByGym[m.gymId].push(m);
  });

  // ─── 3. Churn Risk Population ───
  // (Moved to after post-seed consistency update to avoid being overwritten)
  const now = new Date();

  // ─── 4. Check-in History (~270,000 records) ───
  console.log('  → Seeding check-in history (this may take a moment)...');
  let totalCheckins = 0;
  const checkinBatch = [];
  const CHECKIN_BATCH_SIZE = 1000;

  for (let gi = 0; gi < orderedGyms.length; gi++) {
    const gym = orderedGyms[gi];
    const gymMembers = (membersByGym[gym.id] || []).filter(m => m.status === 'active');
    if (gymMembers.length === 0) continue;

    const opensHour = parseInt(gym.opensAt.split(':')[0]);
    const closesHour = parseInt(gym.closesAt.split(':')[0]);

    // 90 days of history
    for (let day = 1; day <= 90; day++) {
      const date = new Date(now.getTime() - day * 86400000);
      const dow = date.getDay(); // 0=Sun
      const dayMult = DAY_MULTIPLIERS[dow];

      for (let hour = opensHour; hour < closesHour; hour++) {
        const hourMult = HOURLY_MULTIPLIERS[hour] || 0.1;
        // Base: ~45 check-ins per hour per gym, scaled by multipliers and gym size
        const baseCount = Math.round(45 * dayMult * hourMult * (gym.capacity / 250));
        const count = Math.max(0, baseCount + randomInt(-1, 1));

        for (let c = 0; c < count; c++) {
          const member = randomItem(gymMembers);
          const checkedIn = new Date(date);
          checkedIn.setHours(hour, randomInt(0, 59), randomInt(0, 59));
          const durationMin = randomInt(45, 90);
          const checkedOut = new Date(checkedIn.getTime() + durationMin * 60000);

          checkinBatch.push({
            memberId: member.id,
            gymId: gym.id,
            checkedIn,
            checkedOut,
            durationMin,
          });

          if (checkinBatch.length >= CHECKIN_BATCH_SIZE) {
            await prisma.checkin.createMany({ data: checkinBatch });
            totalCheckins += checkinBatch.length;
            checkinBatch.length = 0;
            if (totalCheckins % 10000 === 0) console.log(`    checkins: ${totalCheckins}`);
          }
        }
      }
    }
  }
  // Flush remaining
  if (checkinBatch.length > 0) {
    await prisma.checkin.createMany({ data: checkinBatch });
    totalCheckins += checkinBatch.length;
  }
  console.log(`  ✓ ${totalCheckins} historical check-ins seeded`);

  // ─── 5. Pre-seeded Open Check-ins (Currently In Gym) ───
  console.log('  → Seeding open check-ins...');
  const openCheckinConfig = {
    'WTF Bandra West': { min: 275, max: 295 },   // Anomaly B: capacity breach
    'WTF Powai': { min: 25, max: 35 },
    'WTF Lajpat Nagar': { min: 15, max: 25 },
    'WTF Connaught Place': { min: 15, max: 25 },
    'WTF Indiranagar': { min: 15, max: 25 },
    'WTF Koramangala': { min: 15, max: 25 },
    'WTF Banjara Hills': { min: 15, max: 25 },
    'WTF Noida Sec 18': { min: 8, max: 15 },
    'WTF Salt Lake': { min: 8, max: 15 },
    'WTF Velachery': { min: 0, max: 0 },          // Anomaly A: zero check-ins
  };

  for (const gym of orderedGyms) {
    const config = openCheckinConfig[gym.name];
    if (!config || config.max === 0) {
      // Velachery: ensure last checkin > 2h10m ago
      if (gym.name === 'WTF Velachery') {
        const velacheryMembers = (membersByGym[gym.id] || []).filter(m => m.status === 'active');
        if (velacheryMembers.length > 0) {
          const oldCheckin = new Date(now.getTime() - 130 * 60000); // 2h10m ago
          await prisma.checkin.create({
            data: {
              memberId: velacheryMembers[0].id,
              gymId: gym.id,
              checkedIn: new Date(oldCheckin.getTime() - 60 * 60000),
              checkedOut: oldCheckin,
              durationMin: 60,
            },
          });
        }
      }
      continue;
    }

    const count = randomInt(config.min, config.max);
    const gymMembers = (membersByGym[gym.id] || []).filter(m => m.status === 'active');
    const shuffled = [...gymMembers].sort(() => Math.random() - 0.5);
    const openBatch = [];

    for (let i = 0; i < Math.min(count, shuffled.length); i++) {
      const checkedIn = new Date(now.getTime() - randomInt(10, 80) * 60000);
      openBatch.push({
        memberId: shuffled[i].id,
        gymId: gym.id,
        checkedIn,
        checkedOut: null,
        durationMin: null,
      });
    }
    if (openBatch.length > 0) {
      await prisma.checkin.createMany({ data: openBatch });
    }
    console.log(`    ${gym.name}: ${openBatch.length} open check-ins`);
  }
  console.log('  ✓ Open check-ins seeded');

  // ─── 6. Payment History ───
  console.log('  → Seeding payments...');
  const paymentBatch = [];

  for (const member of dbMembers) {
    const amount = PLAN_AMOUNTS[member.planType] || 1499;
    const paidAt = new Date(member.joinedAt.getTime() + randomInt(-5, 5) * 60000);

    paymentBatch.push({
      memberId: member.id,
      gymId: member.gymId,
      amount,
      planType: member.planType,
      paymentType: 'new',
      paidAt,
    });

    // Renewal members get 2nd payment
    if (member.memberType === 'renewal') {
      const renewalDate = new Date(member.joinedAt.getTime() + PLAN_DAYS[member.planType] * 86400000);
      if (renewalDate <= now) {
        paymentBatch.push({
          memberId: member.id,
          gymId: member.gymId,
          amount,
          planType: member.planType,
          paymentType: 'renewal',
          paidAt: renewalDate,
        });
      }
    }
  }

  // Anomaly C — Salt Lake: revenue drop scenario
  // Seed 8-10 payments totalling ≥₹15,000 on same weekday 7 days ago
  const saltLake = gymByName['WTF Salt Lake'];
  if (saltLake) {
    const saltLakeMembers = (membersByGym[saltLake.id] || []).filter(m => m.status === 'active');
    const lastWeekSameDay = new Date(now.getTime() - 7 * 86400000);
    lastWeekSameDay.setHours(10, 0, 0, 0);

    for (let i = 0; i < 10 && i < saltLakeMembers.length; i++) {
      paymentBatch.push({
        memberId: saltLakeMembers[i].id,
        gymId: saltLake.id,
        amount: 1499,
        planType: 'monthly',
        paymentType: 'renewal',
        paidAt: new Date(lastWeekSameDay.getTime() + i * 60000),
      });
    }
    // Today: only 1-2 small payments (≤₹3,000)
    if (saltLakeMembers.length > 10) {
      const today = new Date();
      today.setHours(9, 0, 0, 0);
      paymentBatch.push({
        memberId: saltLakeMembers[10].id,
        gymId: saltLake.id,
        amount: 1499,
        planType: 'monthly',
        paymentType: 'renewal',
        paidAt: today,
      });
    }
  }

  // Batch insert payments
  for (let i = 0; i < paymentBatch.length; i += BATCH) {
    await prisma.payment.createMany({ data: paymentBatch.slice(i, i + BATCH), skipDuplicates: true });
    if (i % 2000 === 0) console.log(`    payments: ${Math.min(i + BATCH, paymentBatch.length)}/${paymentBatch.length}`);
  }
  console.log(`  ✓ ${paymentBatch.length} payments seeded`);

  // ─── 7. Post-Seed Consistency ───
  console.log('  → Updating last_checkin_at from actual checkins...');
  await prisma.$executeRaw`
    UPDATE members m
    SET last_checkin_at = sub.latest
    FROM (
      SELECT member_id, MAX(checked_in) AS latest
      FROM checkins
      GROUP BY member_id
    ) sub
    WHERE m.id = sub.member_id
  `;
  console.log('  ✓ last_checkin_at updated');

  // ─── 7b. Churn Risk Population (after last_checkin_at sync) ───
  console.log('  → Setting churn risk members...');
  const activeMembers = await prisma.member.findMany({
    where: { status: 'active' },
    select: { id: true },
  });
  // Shuffle
  for (let i = activeMembers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [activeMembers[i], activeMembers[j]] = [activeMembers[j], activeMembers[i]];
  }

  let idx = 0;
  // 150+ HIGH risk: last_checkin_at 45-60 days ago
  const highRiskCount = 180;
  for (let i = 0; i < highRiskCount && idx < activeMembers.length; i++, idx++) {
    const daysAgo = randomInt(45, 60);
    await prisma.member.update({
      where: { id: activeMembers[idx].id },
      data: { lastCheckinAt: new Date(now.getTime() - daysAgo * 86400000) },
    });
  }
  // 80+ CRITICAL risk: last_checkin_at 60+ days ago
  const criticalRiskCount = 100;
  for (let i = 0; i < criticalRiskCount && idx < activeMembers.length; i++, idx++) {
    const daysAgo = randomInt(61, 85);
    await prisma.member.update({
      where: { id: activeMembers[idx].id },
      data: { lastCheckinAt: new Date(now.getTime() - daysAgo * 86400000) },
    });
  }
  console.log(`  ✓ Churn risk set (${highRiskCount} high, ${criticalRiskCount} critical)`);

  // ─── 8. Create custom indexes and materialized view ───
  console.log('  → Creating custom indexes and materialized view...');
  try {
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_members_churn_risk ON members (last_checkin_at) WHERE status = 'active'
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_checkins_time_brin ON checkins USING BRIN (checked_in)
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_checkins_live_occupancy ON checkins (gym_id, checked_out) WHERE checked_out IS NULL
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_anomalies_active ON anomalies (gym_id, detected_at DESC) WHERE resolved = FALSE
    `);

    await prisma.$executeRawUnsafe(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS gym_hourly_stats AS
      SELECT
        c.gym_id,
        EXTRACT(DOW FROM c.checked_in)::int AS day_of_week,
        EXTRACT(HOUR FROM c.checked_in)::int AS hour,
        COUNT(*)::int AS checkin_count,
        ROUND(AVG(c.duration_min))::int AS avg_duration_min
      FROM checkins c
      WHERE c.checked_out IS NOT NULL
        AND c.checked_in >= NOW() - INTERVAL '7 days'
      GROUP BY c.gym_id, EXTRACT(DOW FROM c.checked_in), EXTRACT(HOUR FROM c.checked_in)
    `);
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_gym_hourly_stats_unique ON gym_hourly_stats (gym_id, day_of_week, hour)
    `);
    console.log('  ✓ Custom indexes and materialized view created');
  } catch (err) {
    console.log('  ⚠ Some indexes/views may already exist:', err.message);
  }

  // ─── 9. Validation ───
  console.log('\n📊 Validation:');
  const gymCount = await prisma.gym.count();
  const memberCount = await prisma.member.count();
  const checkinCount = await prisma.checkin.count();
  const paymentCount = await prisma.payment.count();
  const activeCount = await prisma.member.count({ where: { status: 'active' } });

  const bandraOccupancy = await prisma.checkin.count({
    where: { gym: { name: 'WTF Bandra West' }, checkedOut: null },
  });
  const velacheryOccupancy = await prisma.checkin.count({
    where: { gym: { name: 'WTF Velachery' }, checkedOut: null },
  });

  const churnHigh = await prisma.member.count({
    where: {
      status: 'active',
      lastCheckinAt: {
        lt: new Date(now.getTime() - 45 * 86400000),
        gte: new Date(now.getTime() - 60 * 86400000),
      },
    },
  });
  const churnCritical = await prisma.member.count({
    where: {
      status: 'active',
      lastCheckinAt: { lt: new Date(now.getTime() - 60 * 86400000) },
    },
  });

  console.log(`  V1: Gyms = ${gymCount} (expected: 10)`);
  console.log(`  V2: Members = ${memberCount} (expected: ~5000)`);
  console.log(`  V3: Check-ins = ${checkinCount} (expected: ~270,000+)`);
  console.log(`  V4: Payments = ${paymentCount}`);
  console.log(`  V5: Active members = ${activeCount}`);
  console.log(`  V6: Bandra West occupancy = ${bandraOccupancy} (expected: 275-295)`);
  console.log(`  V7: Velachery occupancy = ${velacheryOccupancy} (expected: 0)`);
  console.log(`  V8: Churn HIGH risk = ${churnHigh} (expected: ≥150)`);
  console.log(`  V9: Churn CRITICAL risk = ${churnCritical} (expected: ≥80)`);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n✅ Seed completed in ${elapsed}s`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
