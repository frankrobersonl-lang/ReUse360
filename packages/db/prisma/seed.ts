import { PrismaClient, UserRole, ViolationType, ViolationStatus, InspectionStatus, PermitType, PermitStatus, ComplaintSource, ComplaintStatus, AlertChannel, AlertSeverity, JobType, JobStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('\n ReUse360 Plus — Full Database Seed');
  console.log('===================================\n');

  // ── Watering Zones ──
  console.log('  Seeding watering zones...');
  await prisma.wateringZone.createMany({
    skipDuplicates: true,
    data: [
      { zoneCode: 'ODD', description: 'Odd-numbered addresses', allowedDays: ['ODD'], allowedStartTime: '00:00', allowedEndTime: '08:00', ordinanceRef: 'FAC 40D-22', isActive: true },
      { zoneCode: 'EVEN', description: 'Even-numbered addresses', allowedDays: ['EVEN'], allowedStartTime: '00:00', allowedEndTime: '08:00', ordinanceRef: 'FAC 40D-22', isActive: true },
      { zoneCode: 'MON_THU', description: 'Monday and Thursday schedule', allowedDays: ['MON', 'THU'], allowedStartTime: '00:00', allowedEndTime: '08:00', ordinanceRef: 'FAC 40D-22', isActive: true },
      { zoneCode: 'TUE_FRI', description: 'Tuesday and Friday schedule', allowedDays: ['TUE', 'FRI'], allowedStartTime: '00:00', allowedEndTime: '08:00', ordinanceRef: 'FAC 40D-22', isActive: true },
      { zoneCode: 'WED_SAT', description: 'Wednesday and Saturday schedule', allowedDays: ['WED', 'SAT'], allowedStartTime: '00:00', allowedEndTime: '08:00', ordinanceRef: 'FAC 40D-22', isActive: true },
      { zoneCode: 'RECLAIMED', description: 'Reclaimed water - 7-day permitted', allowedDays: ['MON','TUE','WED','THU','FRI','SAT','SUN'], allowedStartTime: '00:00', allowedEndTime: '23:59', ordinanceRef: 'PCU Reclaimed Water Policy', isActive: true },
    ],
  });
  console.log('  Done watering zones');

  // ── Users ──
  console.log('  Seeding users...');
  const users = await Promise.all([
    prisma.user.upsert({ where: { email: 'frankrobersonl@gmail.com' }, update: {}, create: { clerkId: 'admin_clerk_id', email: 'frankrobersonl@gmail.com', firstName: 'Franklin', lastName: 'Roberson', role: UserRole.ADMIN, isActive: true } }),
    prisma.user.upsert({ where: { email: 'sarah.martinez@pinellascounty.org' }, update: {}, create: { clerkId: 'analyst_clerk_01', email: 'sarah.martinez@pinellascounty.org', firstName: 'Sarah', lastName: 'Martinez', role: UserRole.ANALYST, isActive: true } }),
    prisma.user.upsert({ where: { email: 'james.thompson@pinellascounty.org' }, update: {}, create: { clerkId: 'analyst_clerk_02', email: 'james.thompson@pinellascounty.org', firstName: 'James', lastName: 'Thompson', role: UserRole.ANALYST, isActive: true } }),
    prisma.user.upsert({ where: { email: 'maria.garcia@pinellascounty.org' }, update: {}, create: { clerkId: 'enforce_clerk_01', email: 'maria.garcia@pinellascounty.org', firstName: 'Maria', lastName: 'Garcia', role: UserRole.ENFORCEMENT, isActive: true } }),
    prisma.user.upsert({ where: { email: 'david.wilson@pinellascounty.org' }, update: {}, create: { clerkId: 'enforce_clerk_02', email: 'david.wilson@pinellascounty.org', firstName: 'David', lastName: 'Wilson', role: UserRole.ENFORCEMENT, isActive: true } }),
    prisma.user.upsert({ where: { email: 'karen.lee@pinellascounty.org' }, update: {}, create: { clerkId: 'enforce_clerk_03', email: 'karen.lee@pinellascounty.org', firstName: 'Karen', lastName: 'Lee', role: UserRole.ENFORCEMENT, isActive: true } }),
  ]);
  console.log('  Done users');

  // ── Parcels ──
  console.log('  Seeding parcels...');
  const parcelData = [
    { parcelId: '01-29-15-00000-340-0100', siteAddress: '100 S MISSOURI AVE', city: 'CLEARWATER', zip: '33755', wateringZone: 'ODD', irrigationDay: 'ODD', lat: 27.9659, lon: -82.8001, isReclaimedEligible: false, isHomestead: true },
    { parcelId: '02-30-15-12345-200-0200', siteAddress: '245 DREW ST', city: 'CLEARWATER', zip: '33755', wateringZone: 'EVEN', irrigationDay: 'EVEN', lat: 27.9688, lon: -82.7987, isReclaimedEligible: true, isHomestead: true },
    { parcelId: '03-31-16-54321-100-0300', siteAddress: '1501 GULF BLVD', city: 'CLEARWATER BEACH', zip: '33767', wateringZone: 'MON_THU', irrigationDay: 'MON', lat: 27.9783, lon: -82.8274, isReclaimedEligible: false, isHomestead: false },
    { parcelId: '04-28-15-67890-400-0400', siteAddress: '301 S BELCHER RD', city: 'LARGO', zip: '33771', wateringZone: 'TUE_FRI', irrigationDay: 'TUE', lat: 27.9098, lon: -82.7873, isReclaimedEligible: true, isHomestead: true },
    { parcelId: '05-29-16-11111-500-0500', siteAddress: '5800 SEMINOLE BLVD', city: 'SEMINOLE', zip: '33772', wateringZone: 'WED_SAT', irrigationDay: 'WED', lat: 27.8398, lon: -82.7912, isReclaimedEligible: false, isHomestead: true },
    { parcelId: '06-30-15-22222-600-0600', siteAddress: '175 5TH ST N', city: 'ST PETERSBURG', zip: '33701', wateringZone: 'ODD', irrigationDay: 'ODD', lat: 27.7730, lon: -82.6365, isReclaimedEligible: true, isHomestead: false },
    { parcelId: '07-28-16-33333-700-0700', siteAddress: '8200 BRYAN DAIRY RD', city: 'LARGO', zip: '33777', wateringZone: 'EVEN', irrigationDay: 'EVEN', lat: 27.8653, lon: -82.7534, isReclaimedEligible: true, isHomestead: true },
    { parcelId: '08-29-15-44444-800-0800', siteAddress: '400 ISLAND WAY', city: 'CLEARWATER', zip: '33767', wateringZone: 'RECLAIMED', irrigationDay: 'MON', lat: 27.9753, lon: -82.8210, isReclaimedEligible: true, isHomestead: false },
    { parcelId: '09-31-16-55555-900-0900', siteAddress: '12700 STARKEY RD', city: 'LARGO', zip: '33773', wateringZone: 'MON_THU', irrigationDay: 'THU', lat: 27.8877, lon: -82.7198, isReclaimedEligible: false, isHomestead: true },
    { parcelId: '10-30-15-66666-100-1000', siteAddress: '2401 EAST BAY DR', city: 'LARGO', zip: '33771', wateringZone: 'TUE_FRI', irrigationDay: 'FRI', lat: 27.9012, lon: -82.7645, isReclaimedEligible: true, isHomestead: true },
    { parcelId: '11-29-16-77777-200-1100', siteAddress: '3300 ULMERTON RD', city: 'CLEARWATER', zip: '33762', wateringZone: 'WED_SAT', irrigationDay: 'SAT', lat: 27.8955, lon: -82.7201, isReclaimedEligible: false, isHomestead: false },
    { parcelId: '12-28-15-88888-300-1200', siteAddress: '9600 KOGER BLVD', city: 'ST PETERSBURG', zip: '33702', wateringZone: 'ODD', irrigationDay: 'ODD', lat: 27.8344, lon: -82.6578, isReclaimedEligible: true, isHomestead: true },
  ];
  for (const p of parcelData) {
    await prisma.parcel.upsert({ where: { parcelId: p.parcelId }, update: {}, create: { ...p, useCode: '0100', landUseCode: '01' } });
  }
  console.log('  Done parcels');

  // ── Customer Accounts ──
  console.log('  Seeding customer accounts...');
  const customerData = [
    { accountId: 'PCU-2024-001', meterId: 'MTR-CLW-0001', parcelId: '01-29-15-00000-340-0100', firstName: 'Robert', lastName: 'Henderson', email: 'rhenderson@email.com', serviceAddress: '100 S MISSOURI AVE CLEARWATER FL 33755', isReclaimed: false },
    { accountId: 'PCU-2024-002', meterId: 'MTR-CLW-0002', parcelId: '02-30-15-12345-200-0200', firstName: 'Patricia', lastName: 'Williams', email: 'pwilliams@email.com', serviceAddress: '245 DREW ST CLEARWATER FL 33755', isReclaimed: true },
    { accountId: 'PCU-2024-003', meterId: 'MTR-CLB-0003', parcelId: '03-31-16-54321-100-0300', firstName: 'Michael', lastName: 'Johnson', email: 'mjohnson@email.com', serviceAddress: '1501 GULF BLVD CLEARWATER BEACH FL 33767', isReclaimed: false },
    { accountId: 'PCU-2024-004', meterId: 'MTR-LRG-0004', parcelId: '04-28-15-67890-400-0400', firstName: 'Jennifer', lastName: 'Brown', email: 'jbrown@email.com', serviceAddress: '301 S BELCHER RD LARGO FL 33771', isReclaimed: true },
    { accountId: 'PCU-2024-005', meterId: 'MTR-SEM-0005', parcelId: '05-29-16-11111-500-0500', firstName: 'William', lastName: 'Davis', email: 'wdavis@email.com', serviceAddress: '5800 SEMINOLE BLVD SEMINOLE FL 33772', isReclaimed: false },
    { accountId: 'PCU-2024-006', meterId: 'MTR-STP-0006', parcelId: '06-30-15-22222-600-0600', firstName: 'Linda', lastName: 'Miller', email: 'lmiller@email.com', serviceAddress: '175 5TH ST N ST PETERSBURG FL 33701', isReclaimed: true },
    { accountId: 'PCU-2024-007', meterId: 'MTR-LRG-0007', parcelId: '07-28-16-33333-700-0700', firstName: 'Richard', lastName: 'Wilson', email: 'rwilson@email.com', serviceAddress: '8200 BRYAN DAIRY RD LARGO FL 33777', isReclaimed: true },
    { accountId: 'PCU-2024-008', meterId: 'MTR-CLW-0008', parcelId: '08-29-15-44444-800-0800', firstName: 'Barbara', lastName: 'Moore', email: 'bmoore@email.com', serviceAddress: '400 ISLAND WAY CLEARWATER FL 33767', isReclaimed: true },
    { accountId: 'PCU-2024-009', meterId: 'MTR-LRG-0009', parcelId: '09-31-16-55555-900-0900', firstName: 'Joseph', lastName: 'Taylor', email: 'jtaylor@email.com', serviceAddress: '12700 STARKEY RD LARGO FL 33773', isReclaimed: false },
    { accountId: 'PCU-2024-010', meterId: 'MTR-LRG-0010', parcelId: '10-30-15-66666-100-1000', firstName: 'Susan', lastName: 'Anderson', email: 'sanderson@email.com', serviceAddress: '2401 EAST BAY DR LARGO FL 33771', isReclaimed: true },
    { accountId: 'PCU-2024-011', meterId: 'MTR-CLW-0011', parcelId: '11-29-16-77777-200-1100', firstName: 'Thomas', lastName: 'Jackson', email: 'tjackson@email.com', serviceAddress: '3300 ULMERTON RD CLEARWATER FL 33762', isReclaimed: false },
    { accountId: 'PCU-2024-012', meterId: 'MTR-STP-0012', parcelId: '12-28-15-88888-300-1200', firstName: 'Margaret', lastName: 'White', email: 'mwhite@email.com', serviceAddress: '9600 KOGER BLVD ST PETERSBURG FL 33702', isReclaimed: true },
  ];
  for (const c of customerData) {
    await prisma.customerAccount.upsert({ where: { accountId: c.accountId }, update: {}, create: { ...c, isActive: true } });
  }
  console.log('  Done customer accounts');

  // ── Violations ──
  console.log('  Seeding violations...');
  const violationTypes: ViolationType[] = ['WRONG_DAY','WRONG_TIME','EXCESSIVE_USAGE','CONTINUOUS_FLOW','LEAK_DETECTED','PROHIBITED_IRRIGATION'];
  const violationStatuses: ViolationStatus[] = ['DETECTED','CONFIRMED','NOTIFIED','SR_CREATED','RESOLVED','DISMISSED'];
  for (let i = 0; i < 25; i++) {
    const cust = customerData[i % customerData.length];
    const daysAgo = Math.floor(Math.random() * 60);
    const vType = violationTypes[i % violationTypes.length];
    const vStatus = violationStatuses[i % violationStatuses.length];
    await prisma.violation.create({
      data: {
        parcelId: cust.parcelId,
        accountId: cust.accountId,
        meterId: cust.meterId,
        violationType: vType,
        status: vStatus,
        detectedAt: new Date(Date.now() - daysAgo * 86400000),
        confirmedAt: ['CONFIRMED','NOTIFIED','SR_CREATED','RESOLVED'].includes(vStatus) ? new Date(Date.now() - (daysAgo - 1) * 86400000) : null,
        resolvedAt: vStatus === 'RESOLVED' ? new Date(Date.now() - (daysAgo - 3) * 86400000) : null,
        readValue: 100 + Math.random() * 500,
        flowUnit: 'gallons',
        wateringZone: parcelData.find(p => p.parcelId === cust.parcelId)?.wateringZone ?? 'ODD',
        ordinanceRef: 'FAC 40D-22',
        notes: vStatus === 'RESOLVED' ? 'Customer acknowledged and corrected irrigation schedule.' : null,
      },
    });
  }
  console.log('  Done violations');

  // ── Inspections ──
  console.log('  Seeding inspections...');
  const inspStatuses: InspectionStatus[] = ['SCHEDULED','IN_PROGRESS','COMPLETE','CANCELLED','NO_ACCESS'];
  for (let i = 0; i < 12; i++) {
    const cust = customerData[i % customerData.length];
    const daysAgo = Math.floor(Math.random() * 30);
    const iStatus = inspStatuses[i % inspStatuses.length];
    await prisma.inspection.create({
      data: {
        parcelId: cust.parcelId,
        accountId: cust.accountId,
        address: cust.serviceAddress,
        assignedTo: users[3 + (i % 3)].id,
        scheduledDate: new Date(Date.now() - daysAgo * 86400000),
        completedDate: iStatus === 'COMPLETE' ? new Date(Date.now() - (daysAgo - 1) * 86400000) : null,
        status: iStatus,
        findings: iStatus === 'COMPLETE' ? 'Irrigation system running on non-permitted day. Homeowner notified and agreed to adjust timer.' : null,
      },
    });
  }
  console.log('  Done inspections');

  // ── Permits ──
  console.log('  Seeding permits...');
  const permitTypes: PermitType[] = ['IRRIGATION_SYSTEM','RECLAIMED_CONNECTION','TEMPORARY_WAIVER','NEW_LANDSCAPE'];
  const permitStatuses: PermitStatus[] = ['SUBMITTED','UNDER_REVIEW','APPROVED','DENIED','EXPIRED'];
  for (let i = 0; i < 10; i++) {
    const cust = customerData[i % customerData.length];
    const daysAgo = Math.floor(Math.random() * 90);
    const pStatus = permitStatuses[i % permitStatuses.length];
    await prisma.permit.create({
      data: {
        parcelId: cust.parcelId,
        accountId: cust.accountId,
        permitType: permitTypes[i % permitTypes.length],
        status: pStatus,
        submittedAt: new Date(Date.now() - daysAgo * 86400000),
        approvedAt: pStatus === 'APPROVED' ? new Date(Date.now() - (daysAgo - 5) * 86400000) : null,
        expiresAt: pStatus === 'APPROVED' ? new Date(Date.now() + 180 * 86400000) : null,
        issuedBy: pStatus === 'APPROVED' ? users[0].id : null,
        conditions: pStatus === 'APPROVED' ? 'Standard irrigation permit conditions apply per PCU ordinance.' : null,
      },
    });
  }
  console.log('  Done permits');

  // ── Complaints ──
  console.log('  Seeding complaints...');
  const compSources: ComplaintSource[] = ['CUSTOMER_PORTAL','PHONE','FIELD_OFFICER','AMI_TRIGGERED','HOA'];
  const compStatuses: ComplaintStatus[] = ['OPEN','INVESTIGATING','RESOLVED','DUPLICATE','UNFOUNDED'];
  const compDescs = [
    'Neighbor irrigating on wrong day - sprinklers running Tuesday on an odd-address property.',
    'Excessive water runoff observed flowing into storm drain from commercial property.',
    'Continuous irrigation detected overnight - possible timer malfunction or leak.',
    'HOA reports multiple properties irrigating during restricted afternoon hours.',
    'Customer reports broken sprinkler head causing continuous water flow for 3 days.',
    'AMI data shows 48-hour continuous flow pattern indicating possible irrigation leak.',
    'Resident complaint about commercial property watering during rain event.',
    'Field officer observed prohibited irrigation during Phase II water shortage restrictions.',
  ];
  for (let i = 0; i < 8; i++) {
    const cust = customerData[i % customerData.length];
    const daysAgo = Math.floor(Math.random() * 45);
    const cStatus = compStatuses[i % compStatuses.length];
    await prisma.complaint.create({
      data: {
        reportedParcelId: cust.parcelId,
        reporterAccountId: cust.accountId,
        address: cust.serviceAddress,
        source: compSources[i % compSources.length],
        status: cStatus,
        description: compDescs[i],
        resolvedAt: cStatus === 'RESOLVED' ? new Date(Date.now() - (daysAgo - 5) * 86400000) : null,
        resolution: cStatus === 'RESOLVED' ? 'Violation confirmed and customer corrected irrigation schedule.' : null,
      },
    });
  }
  console.log('  Done complaints');

  // ── Leak Alerts ──
  console.log('  Seeding leak alerts...');
  for (let i = 0; i < 6; i++) {
    const cust = customerData[i % customerData.length];
    const daysAgo = Math.floor(Math.random() * 30);
    await prisma.leakAlert.create({
      data: {
        accountId: cust.accountId,
        meterId: cust.meterId,
        parcelId: cust.parcelId,
        detectedAt: new Date(Date.now() - daysAgo * 86400000),
        continuousFlowHours: 12 + Math.random() * 60,
        estimatedLossGallons: 500 + Math.random() * 5000,
        severity: i < 2 ? 'CRITICAL' : 'WARNING',
        resolvedAt: i < 3 ? new Date(Date.now() - (daysAgo - 2) * 86400000) : null,
      },
    });
  }
  console.log('  Done leak alerts');

  // ── Meter Reads ──
  console.log('  Seeding meter reads...');
  for (const cust of customerData) {
    for (let d = 0; d < 14; d++) {
      const readTime = new Date(Date.now() - d * 86400000);
      await prisma.meterRead.create({
        data: {
          accountId: cust.accountId,
          meterId: cust.meterId,
          readValue: 1000 + Math.random() * 2000,
          readTime,
          flow: 50 + Math.random() * 200,
          flowUnit: 'gallons',
          label: cust.isReclaimed ? 'reclaimed' : 'potable',
          resolution: 'daily',
        },
      });
    }
  }
  console.log('  Done meter reads');

  // ── Connector Jobs ──
  console.log('  Seeding connector jobs...');
  const jobTypes: JobType[] = ['BEACON_RANGE_READ','BEACON_FLOW_EXPORT','BEACON_CONSUMPTION','GIS_PARCEL_SYNC','VIOLATION_DETECTION','CITYWORKS_SR_CREATE'];
  const jobStatuses: JobStatus[] = ['COMPLETE','COMPLETE','COMPLETE','FAILED','COMPLETE','RUNNING'];
  for (let i = 0; i < 6; i++) {
    const hoursAgo = i * 4;
    await prisma.connectorJob.create({
      data: {
        jobType: jobTypes[i],
        status: jobStatuses[i],
        attemptCount: jobStatuses[i] === 'FAILED' ? 3 : 1,
        maxAttempts: 3,
        scheduledAt: new Date(Date.now() - hoursAgo * 3600000),
        startedAt: new Date(Date.now() - hoursAgo * 3600000 + 60000),
        completedAt: jobStatuses[i] === 'RUNNING' ? null : new Date(Date.now() - hoursAgo * 3600000 + 300000),
        errorMessage: jobStatuses[i] === 'FAILED' ? 'Connection timeout: Beacon API did not respond within 30s' : null,
      },
    });
  }
  console.log('  Done connector jobs');

  // ── Alerts ──
  console.log('  Seeding alerts...');
  const alertSubjects = [
    'Violation Detected: Wrong Day Irrigation',
    'Leak Alert: Continuous Flow 24+ Hours',
    'Inspection Scheduled: 100 S MISSOURI AVE',
    'Permit Approved: Reclaimed Connection',
    'Violation Resolved: Customer Compliance',
    'Weekly Enforcement Summary',
  ];
  for (let i = 0; i < 6; i++) {
    const cust = customerData[i % customerData.length];
    const daysAgo = Math.floor(Math.random() * 14);
    await prisma.alert.create({
      data: {
        accountId: cust.accountId,
        severity: i < 2 ? 'CRITICAL' : i < 4 ? 'WARNING' : 'INFO',
        channel: i % 2 === 0 ? 'EMAIL' : 'IN_APP',
        subject: alertSubjects[i],
        body: `Automated alert for account ${cust.accountId} at ${cust.serviceAddress}.`,
        sentAt: new Date(Date.now() - daysAgo * 86400000),
        readAt: i < 4 ? new Date(Date.now() - (daysAgo - 1) * 86400000) : null,
      },
    });
  }
  console.log('  Done alerts');

  console.log('\n All seed data created successfully!\n');
}

main()
  .catch((e) => { console.error('Seed failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
