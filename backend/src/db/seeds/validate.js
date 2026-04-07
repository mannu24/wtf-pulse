const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function validate() {
  console.log('═══════════════════════════════════════════');
  console.log('  🧪 WTF LivePulse — Full Validation Suite');
  console.log('═══════════════════════════════════════════\n');

  let passed = 0;
  let failed = 0;

  function check(name, actual, expected, comparator = 'eq') {
    let ok = false;
    if (comparator === 'eq') ok = actual === expected;
    else if (comparator === 'gte') ok = actual >= expected;
    else if (comparator === 'lte') ok = actual <= expected;
    else if (comparator === 'range') ok = actual >= expected[0] && actual <= expected[1];

    if (ok) {
      console.log(`  ✅ ${name}: ${actual}`);
      passed++;
    } else {
      console.log(`  ❌ ${name}: ${actual} (expected: ${comparator === 'range' ? `${expected[0]}-${expected[1]}` : `${comparator} ${expected}`})`);
      failed++;
    }
  }

  // ═══════════════════════════════════════
  // A. DATA VALIDATION TESTS
  // ═══════════════════════════════════════
  console.log('📊 A. DATA VALIDATION TESTS\n');

  // A1. Volume Checks
  console.log('  A1. Volume Checks');
  const gymCount = await prisma.gym.count();
  check('Gyms', gymCount, 10);

  const memberCount = await prisma.member.count();
  check('Members', memberCount, 5000);

  const checkinCount = await prisma.checkin.count();
  check('Check-ins ≥ 200,000', checkinCount, 200000, 'gte');

  const paymentCount = await prisma.payment.count();
  check('Payments > 5000', paymentCount, 5000, 'gte');

  // A2. Distribution Checks
  console.log('\n  A2. Distribution Checks');
  const EXPECTED_DIST = [
    { name: 'WTF Bandra West', pct: 0.13 },
    { name: 'WTF Powai', pct: 0.11 },
    { name: 'WTF Lajpat Nagar', pct: 0.15 },
    { name: 'WTF Connaught Place', pct: 0.12 },
    { name: 'WTF Indiranagar', pct: 0.11 },
    { name: 'WTF Koramangala', pct: 0.10 },
    { name: 'WTF Banjara Hills', pct: 0.09 },
    { name: 'WTF Noida Sec 18', pct: 0.08 },
    { name: 'WTF Salt Lake', pct: 0.06 },
    { name: 'WTF Velachery', pct: 0.05 },
  ];

  const gyms = await prisma.gym.findMany({ orderBy: { name: 'asc' } });
  for (const exp of EXPECTED_DIST) {
    const gym = gyms.find(g => g.name === exp.name);
    if (!gym) { console.log(`  ❌ Gym not found: ${exp.name}`); failed++; continue; }
    const count = await prisma.member.count({ where: { gymId: gym.id } });
    const actualPct = count / memberCount;
    const tolerance = 0.02;
    check(`${exp.name} dist (${(actualPct * 100).toFixed(1)}%)`, actualPct, [exp.pct - tolerance, exp.pct + tolerance], 'range');
  }

  // Plan type distribution
  console.log('\n  Plan Type Distribution:');
  const planCounts = await prisma.member.groupBy({ by: ['planType'], _count: true });
  for (const p of planCounts) {
    const pct = (p._count / memberCount * 100).toFixed(1);
    console.log(`    ${p.planType}: ${p._count} (${pct}%)`);
  }

  // Member type distribution
  const typeCounts = await prisma.member.groupBy({ by: ['memberType'], _count: true });
  const newCount = typeCounts.find(t => t.memberType === 'new')?._count || 0;
  const renewalCount = typeCounts.find(t => t.memberType === 'renewal')?._count || 0;
  const newPct = newCount / memberCount;
  check('New members ~80%', newPct, [0.75, 0.85], 'range');
  check('Renewal members ~20%', renewalCount / memberCount, [0.15, 0.25], 'range');

  // A3. Churn Logic
  console.log('\n  A3. Churn Risk');
  const now = new Date();
  const d45 = new Date(now.getTime() - 45 * 86400000);
  const d60 = new Date(now.getTime() - 60 * 86400000);

  const highRisk = await prisma.member.count({
    where: { status: 'active', lastCheckinAt: { lt: d45, gte: d60 } },
  });
  check('High risk (45-60 days) ≥ 150', highRisk, 150, 'gte');

  const criticalRisk = await prisma.member.count({
    where: { status: 'active', lastCheckinAt: { lt: d60 } },
  });
  check('Critical risk (>60 days) ≥ 80', criticalRisk, 80, 'gte');

  // A4. Consistency — last_checkin_at matches MAX(checkins.checked_in)
  console.log('\n  A4. Consistency');
  const inconsistent = await prisma.$queryRaw`
    SELECT COUNT(*) as cnt FROM members m
    WHERE m.last_checkin_at IS NOT NULL
    AND m.last_checkin_at != (
      SELECT MAX(c.checked_in) FROM checkins c WHERE c.member_id = m.id
    )
    AND m.id NOT IN (
      SELECT id FROM members WHERE status = 'active'
      AND last_checkin_at < ${d45}
    )
  `;
  const inconsistentCount = Number(inconsistent[0]?.cnt || 0);
  check('last_checkin_at consistent (non-churn members)', inconsistentCount, 0);

  // Anomaly scenarios
  console.log('\n  A5. Pre-seeded Anomaly Scenarios');
  const velachery = gyms.find(g => g.name === 'WTF Velachery');
  const bandra = gyms.find(g => g.name === 'WTF Bandra West');

  const velacheryOcc = await prisma.checkin.count({ where: { gymId: velachery.id, checkedOut: null } });
  check('Scenario A: Velachery occupancy = 0', velacheryOcc, 0);

  const bandraOcc = await prisma.checkin.count({ where: { gymId: bandra.id, checkedOut: null } });
  const bandraPct = Math.round(bandraOcc / bandra.capacity * 100);
  check(`Scenario B: Bandra West occupancy ≥ 90% (${bandraOcc}/${bandra.capacity} = ${bandraPct}%)`, bandraPct, 90, 'gte');

  // Payment amounts
  console.log('\n  A6. Payment Amounts');
  const monthlyPayments = await prisma.payment.findMany({ where: { planType: 'monthly' }, take: 5, select: { amount: true } });
  const quarterlyPayments = await prisma.payment.findMany({ where: { planType: 'quarterly' }, take: 5, select: { amount: true } });
  const annualPayments = await prisma.payment.findMany({ where: { planType: 'annual' }, take: 5, select: { amount: true } });
  check('Monthly = ₹1,499', Number(monthlyPayments[0]?.amount), 1499);
  check('Quarterly = ₹3,999', Number(quarterlyPayments[0]?.amount), 3999);
  check('Annual = ₹11,999', Number(annualPayments[0]?.amount), 11999);

  // No future-dated payments
  const futurePayments = await prisma.payment.count({ where: { paidAt: { gt: new Date() } } });
  check('No future-dated payments', futurePayments, 0);

  // Check-ins outside operating hours
  console.log('\n  A7. Operating Hours');
  const outsideHours = await prisma.$queryRaw`
    SELECT COUNT(*) as cnt FROM checkins c
    JOIN gyms g ON c.gym_id = g.id
    WHERE EXTRACT(HOUR FROM c.checked_in) < CAST(SPLIT_PART(g.opens_at, ':', 1) AS INT)
       OR EXTRACT(HOUR FROM c.checked_in) >= CAST(SPLIT_PART(g.closes_at, ':', 1) AS INT)
  `;
  check('No check-ins outside operating hours', Number(outsideHours[0]?.cnt || 0), 0);

  // ═══════════════════════════════════════
  // B. QUERY PERFORMANCE TESTS
  // ═══════════════════════════════════════
  console.log('\n\n📊 B. QUERY PERFORMANCE TESTS\n');

  const gymId = bandra.id;

  // B1. Live Occupancy
  let result = await prisma.$queryRaw`
    EXPLAIN (ANALYZE, FORMAT JSON)
    SELECT COUNT(*) FROM checkins WHERE gym_id = ${gymId}::uuid AND checked_out IS NULL
  `;
  let plan = result[0]['QUERY PLAN'][0];
  let execTime = plan['Execution Time'];
  let planText = JSON.stringify(plan);
  let hasSeqScan = planText.includes('"Node Type": "Seq Scan"') && planText.includes('"checkins"');
  check(`Q1: Live Occupancy: ${execTime.toFixed(2)}ms < 1ms`, execTime, 1, 'lte');
  check('Q1: No seq scan on checkins', hasSeqScan, false);

  // B2. Today's Revenue
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  result = await prisma.$queryRaw`
    EXPLAIN (ANALYZE, FORMAT JSON)
    SELECT COALESCE(SUM(amount), 0) FROM payments WHERE gym_id = ${gymId}::uuid AND paid_at >= ${todayStart}
  `;
  plan = result[0]['QUERY PLAN'][0];
  execTime = plan['Execution Time'];
  planText = JSON.stringify(plan);
  hasSeqScan = planText.includes('"Node Type": "Seq Scan"') && planText.includes('"payments"');
  check(`Q2: Today Revenue: ${execTime.toFixed(2)}ms < 1ms`, execTime, 1, 'lte');
  check('Q2: No seq scan on payments', hasSeqScan, false);

  // B3. Churn Risk Members
  result = await prisma.$queryRaw`
    EXPLAIN (ANALYZE, FORMAT JSON)
    SELECT id, name, last_checkin_at FROM members
    WHERE gym_id = ${gymId}::uuid AND status = 'active' AND last_checkin_at < ${d45}
    ORDER BY last_checkin_at ASC
  `;
  plan = result[0]['QUERY PLAN'][0];
  execTime = plan['Execution Time'];
  check(`Q3: Churn Risk: ${execTime.toFixed(2)}ms < 2ms`, execTime, 2, 'lte');

  // B4. Peak Hour Heatmap (materialized view)
  result = await prisma.$queryRaw`
    EXPLAIN (ANALYZE, FORMAT JSON)
    SELECT * FROM gym_hourly_stats WHERE gym_id = ${gymId}::uuid ORDER BY day_of_week, hour
  `;
  plan = result[0]['QUERY PLAN'][0];
  execTime = plan['Execution Time'];
  check(`Q4: Heatmap: ${execTime.toFixed(2)}ms < 1ms`, execTime, 1, 'lte');

  // B5. Cross-Gym Revenue
  const since30d = new Date(Date.now() - 30 * 86400000);
  result = await prisma.$queryRaw`
    EXPLAIN (ANALYZE, FORMAT JSON)
    SELECT gym_id, SUM(amount) as total FROM payments WHERE paid_at >= ${since30d} GROUP BY gym_id ORDER BY total DESC
  `;
  plan = result[0]['QUERY PLAN'][0];
  execTime = plan['Execution Time'];
  check(`Q5: Cross-Gym Revenue: ${execTime.toFixed(2)}ms < 5ms`, execTime, 5, 'lte');

  // B6. Active Anomalies
  result = await prisma.$queryRaw`
    EXPLAIN (ANALYZE, FORMAT JSON)
    SELECT * FROM anomalies WHERE resolved = FALSE ORDER BY detected_at DESC
  `;
  plan = result[0]['QUERY PLAN'][0];
  execTime = plan['Execution Time'];
  check(`Q6: Active Anomalies: ${execTime.toFixed(2)}ms < 1ms`, execTime, 1, 'lte');

  // ═══════════════════════════════════════
  // C. ANOMALY TESTING
  // ═══════════════════════════════════════
  console.log('\n\n📊 C. ANOMALY SCENARIO TESTS\n');

  // Check if anomalies exist (they should be created by the detector within 30s)
  const anomalies = await prisma.anomaly.findMany({ orderBy: { detectedAt: 'desc' } });
  console.log(`  Total anomalies in DB: ${anomalies.length}`);

  const zeroCheckinAnomaly = anomalies.find(a => a.type === 'zero_checkins');
  const capacityAnomaly = anomalies.find(a => a.type === 'capacity_breach');

  if (zeroCheckinAnomaly) {
    const gym = gyms.find(g => g.id === zeroCheckinAnomaly.gymId);
    check(`Scenario A: zero_checkins detected at ${gym?.name}`, true, true);
    check('Scenario A: severity = warning', zeroCheckinAnomaly.severity, 'warning');
  } else {
    console.log('  ⏳ Scenario A: zero_checkins not yet detected (detector runs every 30s)');
  }

  if (capacityAnomaly) {
    const gym = gyms.find(g => g.id === capacityAnomaly.gymId);
    check(`Scenario B: capacity_breach detected at ${gym?.name}`, true, true);
    check('Scenario B: severity = critical', capacityAnomaly.severity, 'critical');
  } else {
    console.log('  ⏳ Scenario B: capacity_breach not yet detected (detector runs every 30s)');
  }

  // ═══════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════
  console.log('\n═══════════════════════════════════════════');
  console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
  console.log('═══════════════════════════════════════════\n');

  if (failed > 0) process.exit(1);
}

validate()
  .catch(e => { console.error('Validation error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
