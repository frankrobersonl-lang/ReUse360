-- CreateTable
CREATE TABLE "patrol_logs" (
    "id" TEXT NOT NULL,
    "officerNames" TEXT[],
    "patrolDate" TIMESTAMP(3) NOT NULL,
    "mileage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "numberOfViolations" INTEGER NOT NULL DEFAULT 0,
    "citationsIssued" INTEGER NOT NULL DEFAULT 0,
    "warningsIssued" INTEGER NOT NULL DEFAULT 0,
    "violationOccurred" BOOLEAN NOT NULL DEFAULT false,
    "outreachConducted" BOOLEAN NOT NULL DEFAULT false,
    "waterSource" TEXT,
    "notes" TEXT,
    "shiftStart" TEXT,
    "shiftEnd" TEXT,
    "submittedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patrol_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "patrol_logs_patrolDate_idx" ON "patrol_logs"("patrolDate");

-- CreateIndex
CREATE INDEX "patrol_logs_submittedById_idx" ON "patrol_logs"("submittedById");
