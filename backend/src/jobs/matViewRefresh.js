const prisma = require('../db/prisma');

let intervalId = null;

function startMatViewRefresh() {
  console.log('Materialized view refresh started (every 15min)');
  // Initial refresh
  refreshView();
  intervalId = setInterval(refreshView, 15 * 60 * 1000);
}

async function refreshView() {
  try {
    await prisma.$executeRawUnsafe('REFRESH MATERIALIZED VIEW CONCURRENTLY gym_hourly_stats');
    console.log('Materialized view refreshed');
  } catch (err) {
    console.error('Mat view refresh error:', err.message);
  }
}

function stopMatViewRefresh() {
  if (intervalId) clearInterval(intervalId);
}

module.exports = { startMatViewRefresh, stopMatViewRefresh };
