-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'ANALYST', 'ENFORCEMENT');

-- CreateEnum
CREATE TYPE "ViolationType" AS ENUM ('WRONG_DAY', 'WRONG_TIME', 'EXCESSIVE_USAGE', 'CONTINUOUS_FLOW', 'LEAK_DETECTED', 'PROHIBITED_IRRIGATION');

-- CreateEnum
CREATE TYPE "ViolationStatus" AS ENUM ('DETECTED', 'CONFIRMED', 'NOTIFIED', 'SR_CREATED', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "InspectionStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETE', 'CANCELLED', 'NO_ACCESS');

-- CreateEnum
CREATE TYPE "PermitType" AS ENUM ('IRRIGATION_SYSTEM', 'RECLAIMED_CONNECTION', 'TEMPORARY_WAIVER', 'NEW_LANDSCAPE');

-- CreateEnum
CREATE TYPE "PermitStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'DENIED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "ComplaintSource" AS ENUM ('CUSTOMER_PORTAL', 'PHONE', 'FIELD_OFFICER', 'AMI_TRIGGERED', 'HOA');

-- CreateEnum
CREATE TYPE "ComplaintStatus" AS ENUM ('OPEN', 'INVESTIGATING', 'RESOLVED', 'DUPLICATE', 'UNFOUNDED');

-- CreateEnum
CREATE TYPE "AlertChannel" AS ENUM ('EMAIL', 'SMS', 'PUSH', 'IN_APP');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('BEACON_RANGE_READ', 'BEACON_FLOW_EXPORT', 'BEACON_CONSUMPTION', 'BEACON_BILLING_READ', 'BEACON_INTERVAL_READ', 'BEACON_LEAK_EXPORT', 'BEACON_ENDPOINT_STATUS', 'BEACON_FORMATC_READ', 'GIS_PARCEL_SYNC', 'VIOLATION_DETECTION', 'ALERT_DISPATCH', 'CITYWORKS_SR_CREATE', 'CITYWORKS_SR_SYNC');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETE', 'FAILED', 'RETRYING');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'ANALYST',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parcels" (
    "id" TEXT NOT NULL,
    "parcelId" TEXT NOT NULL,
    "siteAddress" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "zip" TEXT NOT NULL,
    "useCode" TEXT,
    "landUseCode" TEXT,
    "isHomestead" BOOLEAN NOT NULL DEFAULT false,
    "lat" DECIMAL(10,7),
    "lon" DECIMAL(10,7),
    "wateringZone" TEXT,
    "irrigationDay" TEXT,
    "isReclaimedEligible" BOOLEAN NOT NULL DEFAULT false,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parcels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_accounts" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "meterId" TEXT NOT NULL,
    "parcelId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "serviceAddress" TEXT NOT NULL,
    "isReclaimed" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meter_reads" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "meterId" TEXT NOT NULL,
    "readValue" DECIMAL(12,4) NOT NULL,
    "readTime" TIMESTAMP(3) NOT NULL,
    "flow" DECIMAL(12,4),
    "flowUnit" TEXT DEFAULT 'gallons',
    "flowTime" TIMESTAMP(3),
    "label" TEXT,
    "servicePointCycle" TEXT,
    "resolution" TEXT,
    "rawPayload" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meter_reads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "violations" (
    "id" TEXT NOT NULL,
    "parcelId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "meterId" TEXT NOT NULL,
    "violationType" "ViolationType" NOT NULL,
    "status" "ViolationStatus" NOT NULL DEFAULT 'DETECTED',
    "detectedAt" TIMESTAMP(3) NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "readValue" DECIMAL(12,4) NOT NULL,
    "flowUnit" TEXT DEFAULT 'gallons',
    "wateringDay" TEXT,
    "wateringZone" TEXT,
    "ordinanceRef" TEXT,
    "cityworksSrId" TEXT,
    "notes" TEXT,
    "detectedByJobId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "violations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspections" (
    "id" TEXT NOT NULL,
    "violationId" TEXT,
    "parcelId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "assignedTo" TEXT,
    "scheduledDate" TIMESTAMP(3),
    "completedDate" TIMESTAMP(3),
    "status" "InspectionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "findings" TEXT,
    "photoUrls" TEXT[],
    "cityworksWoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inspections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permits" (
    "id" TEXT NOT NULL,
    "parcelId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "permitType" "PermitType" NOT NULL,
    "status" "PermitStatus" NOT NULL DEFAULT 'SUBMITTED',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "issuedBy" TEXT,
    "conditions" TEXT,
    "attachmentUrls" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complaints" (
    "id" TEXT NOT NULL,
    "reportedParcelId" TEXT,
    "reporterAccountId" TEXT,
    "address" TEXT NOT NULL,
    "source" "ComplaintSource" NOT NULL,
    "status" "ComplaintStatus" NOT NULL DEFAULT 'OPEN',
    "description" TEXT NOT NULL,
    "violationId" TEXT,
    "inspectionId" TEXT,
    "cityworksSrId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "complaints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "parcelId" TEXT,
    "violationId" TEXT,
    "leakAlertId" TEXT,
    "severity" "AlertSeverity" NOT NULL DEFAULT 'INFO',
    "channel" "AlertChannel" NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leak_alerts" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "meterId" TEXT NOT NULL,
    "parcelId" TEXT,
    "detectedAt" TIMESTAMP(3) NOT NULL,
    "continuousFlowHours" DECIMAL(6,2),
    "estimatedLossGallons" DECIMAL(12,2),
    "severity" "AlertSeverity" NOT NULL DEFAULT 'WARNING',
    "resolvedAt" TIMESTAMP(3),
    "violationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leak_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "connector_jobs" (
    "id" TEXT NOT NULL,
    "jobType" "JobType" NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'QUEUED',
    "payload" TEXT,
    "result" TEXT,
    "errorMessage" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "beaconJobUuid" TEXT,
    "beaconStatusUrl" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "connector_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watering_zones" (
    "id" TEXT NOT NULL,
    "zoneCode" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "allowedDays" TEXT[],
    "allowedStartTime" TEXT,
    "allowedEndTime" TEXT,
    "ordinanceRef" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "watering_zones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_clerkId_key" ON "users"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_clerkId_idx" ON "users"("clerkId");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "parcels_parcelId_key" ON "parcels"("parcelId");

-- CreateIndex
CREATE INDEX "parcels_city_idx" ON "parcels"("city");

-- CreateIndex
CREATE INDEX "parcels_wateringZone_idx" ON "parcels"("wateringZone");

-- CreateIndex
CREATE UNIQUE INDEX "customer_accounts_accountId_key" ON "customer_accounts"("accountId");

-- CreateIndex
CREATE INDEX "customer_accounts_meterId_idx" ON "customer_accounts"("meterId");

-- CreateIndex
CREATE INDEX "customer_accounts_parcelId_idx" ON "customer_accounts"("parcelId");

-- CreateIndex
CREATE INDEX "meter_reads_meterId_readTime_idx" ON "meter_reads"("meterId", "readTime");

-- CreateIndex
CREATE INDEX "meter_reads_accountId_idx" ON "meter_reads"("accountId");

-- CreateIndex
CREATE INDEX "meter_reads_readTime_idx" ON "meter_reads"("readTime");

-- CreateIndex
CREATE INDEX "violations_parcelId_idx" ON "violations"("parcelId");

-- CreateIndex
CREATE INDEX "violations_accountId_idx" ON "violations"("accountId");

-- CreateIndex
CREATE INDEX "violations_status_idx" ON "violations"("status");

-- CreateIndex
CREATE INDEX "violations_detectedAt_idx" ON "violations"("detectedAt");

-- CreateIndex
CREATE INDEX "violations_violationType_idx" ON "violations"("violationType");

-- CreateIndex
CREATE INDEX "inspections_violationId_idx" ON "inspections"("violationId");

-- CreateIndex
CREATE INDEX "inspections_parcelId_idx" ON "inspections"("parcelId");

-- CreateIndex
CREATE INDEX "inspections_status_idx" ON "inspections"("status");

-- CreateIndex
CREATE INDEX "inspections_assignedTo_idx" ON "inspections"("assignedTo");

-- CreateIndex
CREATE INDEX "permits_parcelId_idx" ON "permits"("parcelId");

-- CreateIndex
CREATE INDEX "permits_accountId_idx" ON "permits"("accountId");

-- CreateIndex
CREATE INDEX "permits_status_idx" ON "permits"("status");

-- CreateIndex
CREATE INDEX "permits_expiresAt_idx" ON "permits"("expiresAt");

-- CreateIndex
CREATE INDEX "complaints_reportedParcelId_idx" ON "complaints"("reportedParcelId");

-- CreateIndex
CREATE INDEX "complaints_status_idx" ON "complaints"("status");

-- CreateIndex
CREATE INDEX "complaints_violationId_idx" ON "complaints"("violationId");

-- CreateIndex
CREATE INDEX "alerts_accountId_idx" ON "alerts"("accountId");

-- CreateIndex
CREATE INDEX "alerts_violationId_idx" ON "alerts"("violationId");

-- CreateIndex
CREATE INDEX "alerts_sentAt_idx" ON "alerts"("sentAt");

-- CreateIndex
CREATE INDEX "leak_alerts_accountId_idx" ON "leak_alerts"("accountId");

-- CreateIndex
CREATE INDEX "leak_alerts_detectedAt_idx" ON "leak_alerts"("detectedAt");

-- CreateIndex
CREATE INDEX "connector_jobs_status_idx" ON "connector_jobs"("status");

-- CreateIndex
CREATE INDEX "connector_jobs_jobType_idx" ON "connector_jobs"("jobType");

-- CreateIndex
CREATE INDEX "connector_jobs_scheduledAt_idx" ON "connector_jobs"("scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "watering_zones_zoneCode_key" ON "watering_zones"("zoneCode");

-- AddForeignKey
ALTER TABLE "customer_accounts" ADD CONSTRAINT "customer_accounts_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "parcels"("parcelId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "violations" ADD CONSTRAINT "violations_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "customer_accounts"("accountId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_violationId_fkey" FOREIGN KEY ("violationId") REFERENCES "violations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permits" ADD CONSTRAINT "permits_issuedBy_fkey" FOREIGN KEY ("issuedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_violationId_fkey" FOREIGN KEY ("violationId") REFERENCES "violations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "inspections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "customer_accounts"("accountId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_violationId_fkey" FOREIGN KEY ("violationId") REFERENCES "violations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
