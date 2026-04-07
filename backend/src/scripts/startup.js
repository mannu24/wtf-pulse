const { execSync } = require('child_process');
const { PrismaClient } = require('@prisma/client');

async function startup() {
  console.log('🚀 WTF LivePulse — Starting up...\n');

  // 1. Push schema to DB (creates tables if they don't exist)
  console.log('📦 Pushing database schema...');
  try {
    execSync('npx prisma db push --skip-generate --accept-data-loss', {
      stdio: 'inherit',
      cwd: '/app',
    });
  } catch (err) {
    console.error('Schema push failed:', err.message);
    process.exit(1);
  }

  // 2. Check if data exists, seed if not
  const prisma = new PrismaClient();
  try {
    const gymCount = await prisma.gym.count();
    if (gymCount === 0) {
      console.log('\n🌱 No data found — running seed...');
      await prisma.$disconnect();
      execSync('node src/db/seeds/seed.js', {
        stdio: 'inherit',
        cwd: '/app',
      });
    } else {
      console.log(`\n✅ Database already seeded (${gymCount} gyms found)`);
      await prisma.$disconnect();
    }
  } catch (err) {
    console.error('Seed check failed:', err.message);
    await prisma.$disconnect();
    // If table doesn't exist yet, run seed
    execSync('node src/db/seeds/seed.js', {
      stdio: 'inherit',
      cwd: '/app',
    });
  }

  // 3. Start the server
  console.log('\n🏃 Starting server...');
  require('../app.js');
}

startup().catch((err) => {
  console.error('Startup failed:', err);
  process.exit(1);
});
