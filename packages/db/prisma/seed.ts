import { PrismaClient, UserRole } from '@prisma/client';

// ─────────────────────────────────────────────
// ReUse360 Plus — Database Seed
// Run: pnpm db:seed:dev  (development)
//      pnpm db:seed:prod (production — admin only)
// ─────────────────────────────────────────────

const prisma = new PrismaClient();
const ENV = process.argv.find((a) => a.startsWith('--env='))?.split('=')[1] ?? 'development';

async function seedWateringZones() {
  console.log('  Seeding watering zones (SWFWMD Phase II schedule)...');

  await prisma.wateringZone.createMany({
    skipDuplicates: true,
    data: [
      {
        zoneCode: 'ODD',
        description: 'Odd-numbered addresses — irrigate on odd calendar days',
        allowedDays: ['ODD'],
        allowedStartTime: '00:00',
        allowedEndTime: '08:00',
        ordinanceRef: 'FAC 40D-22',
        isActive: true,
      },
      {
        zoneCode: 'EVEN',
        description: 'Even-numbered addresses — irrigate on even calendar days',
        allowedDays: ['EVEN'],
        allowedStartTime: '00:00',
        allowedEndTime: '08:00',
        ordinanceRef: 'FAC 40D-22',
        isActive: true,
      },
      {
        zoneCode: 'MON_THU',
        description: 'Monday and Thursday irrigation schedule',
        allowedDays: ['MON', 'THU'],
        allowedStartTime: '00:00',
        allowedEndTime: '08:00',
        ordinanceRef: 'FAC 40D-22',
        isActive: true,
      },
      {
        zoneCode: 'TUE_FRI',
        description: 'Tuesday and Friday irrigation schedule',
        allowedDays: ['TUE', 'FRI'],
        allowedStartTime: '00:00',
        allowedEndTime: '08:00',
        ordinanceRef: 'FAC 40D-22',
        isActive: true,
      },
      {
        zoneCode: 'WED_SAT',
        description: 'Wednesday and Saturday irrigation schedule',
        allowedDays: ['WED', 'SAT'],
        allowedStartTime: '00:00',
        allowedEndTime: '08:00',
        ordinanceRef: 'FAC 40D-22',
        isActive: true,
      },
      {
        zoneCode: 'RECLAIMED',
        description: 'Reclaimed water — 7-day irrigation permitted with restrictions',
        allowedDays: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'],
        allowedStartTime: '00:00',
        allowedEndTime: '23:59',
        ordinanceRef: 'PCU Reclaimed Water Policy',
        isActive: true,
      },
    ],
  });

  console.log('  ✓ Watering zones seeded');
}

async function seedAdminUser() {
  console.log('  Seeding admin user placeholder...');

  // Placeholder — clerkId must be replaced with real Clerk user ID after first login
  await prisma.user.upsert({
    where: { email: 'admin@pinellascounty.org' },
    update: {},
    create: {
      clerkId: 'REPLACE_WITH_CLERK_USER_ID',
      email: 'admin@pinellascounty.org',
      firstName: 'System',
      lastName: 'Administrator',
      role: UserRole.ADMIN,
      isActive: true,
    },
  });

  console.log('  ✓ Admin user placeholder seeded');
  console.log('  ⚠ Update clerkId after first Clerk login via Clerk dashboard');
}

async function seedDevData() {
  console.log('  Seeding dev sample data...');

  // Sample parcel (Pinellas County format)
  await prisma.parcel.upsert({
    where: { parcelId: '01-29-15-00000-340-0100' },
    update: {},
    create: {
      parcelId: '01-29-15-00000-340-0100',
      siteAddress: '100 WATER ST',
      city: 'CLEARWATER',
      zip: '33755',
      useCode: '0100',
      landUseCode: '01',
      isHomestead: true,
      lat: 27.9659,
      lon: -82.8001,
      wateringZone: 'ODD',
      irrigationDay: 'ODD',
      isReclaimedEligible: false,
    },
  });

  // Sample customer account
  await prisma.customerAccount.upsert({
    where: { accountId: 'PCU-TEST-001' },
    update: {},
    create: {
      accountId: 'PCU-TEST-001',
      meterId: 'METER-TEST-001',
      parcelId: '01-29-15-00000-340-0100',
      firstName: 'Test',
      lastName: 'Customer',
      email: 'testcustomer@example.com',
      serviceAddress: '100 WATER ST CLEARWATER FL 33755',
      isReclaimed: false,
      isActive: true,
    },
  });

  // Sample dev users
  const devUsers = [
    {
      clerkId: 'dev_analyst_clerk_id',
      email: 'analyst@reuse360.dev',
      firstName: 'Dev',
      lastName: 'Analyst',
      role: UserRole.ANALYST,
    },
    {
      clerkId: 'dev_enforcement_clerk_id',
      email: 'enforcement@reuse360.dev',
      firstName: 'Dev',
      lastName: 'Enforcement',
      role: UserRole.ENFORCEMENT,
    },
  ];

  for (const user of devUsers) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: { ...user, isActive: true },
    });
  }

  console.log('  ✓ Dev sample data seeded');
}

async function main() {
  console.log(`\n ReUse360 Plus — Database Seed (${ENV})`);
  console.log('═══════════════════════════════════════\n');

  await seedWateringZones();
  await seedAdminUser();

  if (ENV === 'development') {
    await seedDevData();
  }

  console.log('\n✓ Seed complete\n');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
