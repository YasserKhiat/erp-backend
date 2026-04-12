-- CreateEnum
CREATE TYPE "EmploymentStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'TERMINATED');

-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('CDI', 'CDD', 'FREELANCE', 'INTERNSHIP');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'LATE', 'ABSENT');

-- CreateEnum
CREATE TYPE "AbsenceStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "BankMovementType" AS ENUM ('CREDIT', 'DEBIT');

-- AlterTable
ALTER TABLE "CashClosing" ADD COLUMN     "isReconciled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reconciledAt" TIMESTAMP(3),
ADD COLUMN     "reconciliationSessionId" TEXT;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "isReconciled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reconciledAt" TIMESTAMP(3),
ADD COLUMN     "reconciliationSessionId" TEXT;

-- AlterTable
ALTER TABLE "SupplierOrderItem" ADD COLUMN     "supplierCatalogItemId" TEXT;

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "fullName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "position" TEXT NOT NULL,
    "employmentStatus" "EmploymentStatus" NOT NULL DEFAULT 'ACTIVE',
    "hireDate" TIMESTAMP(3) NOT NULL,
    "baseSalary" DECIMAL(10,2) NOT NULL,
    "contractType" "ContractType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "checkInAt" TIMESTAMP(3),
    "checkOutAt" TIMESTAMP(3),
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Absence" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "AbsenceStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Absence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollRecord" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "grossSalary" DECIMAL(10,2) NOT NULL,
    "cnssDeduction" DECIMAL(10,2) NOT NULL,
    "taxDeduction" DECIMAL(10,2) NOT NULL,
    "otherDeduction" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "netSalary" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankMovement" (
    "id" TEXT NOT NULL,
    "movementDate" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "type" "BankMovementType" NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "isReconciled" BOOLEAN NOT NULL DEFAULT false,
    "reconciledAt" TIMESTAMP(3),
    "sessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReconciliationSession" (
    "id" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "expectedTotal" DECIMAL(12,2) NOT NULL,
    "bankTotal" DECIMAL(12,2) NOT NULL,
    "discrepancy" DECIMAL(12,2) NOT NULL,
    "reconciledPayments" INTEGER NOT NULL,
    "reconciledClosings" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReconciliationSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierCatalogItem" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "supplierSku" TEXT,
    "unit" TEXT,
    "leadTimeDays" INTEGER,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierCatalogItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Employee_userId_key" ON "Employee"("userId");

-- CreateIndex
CREATE INDEX "Employee_employmentStatus_idx" ON "Employee"("employmentStatus");

-- CreateIndex
CREATE INDEX "Employee_position_idx" ON "Employee"("position");

-- CreateIndex
CREATE INDEX "Attendance_date_idx" ON "Attendance"("date");

-- CreateIndex
CREATE INDEX "Attendance_status_idx" ON "Attendance"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_employeeId_date_key" ON "Attendance"("employeeId", "date");

-- CreateIndex
CREATE INDEX "Absence_employeeId_date_idx" ON "Absence"("employeeId", "date");

-- CreateIndex
CREATE INDEX "Absence_status_idx" ON "Absence"("status");

-- CreateIndex
CREATE INDEX "PayrollRecord_periodStart_periodEnd_idx" ON "PayrollRecord"("periodStart", "periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollRecord_employeeId_periodStart_periodEnd_key" ON "PayrollRecord"("employeeId", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "BankMovement_movementDate_idx" ON "BankMovement"("movementDate");

-- CreateIndex
CREATE INDEX "BankMovement_type_idx" ON "BankMovement"("type");

-- CreateIndex
CREATE INDEX "BankMovement_isReconciled_idx" ON "BankMovement"("isReconciled");

-- CreateIndex
CREATE INDEX "BankMovement_sessionId_idx" ON "BankMovement"("sessionId");

-- CreateIndex
CREATE INDEX "ReconciliationSession_periodStart_periodEnd_idx" ON "ReconciliationSession"("periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "SupplierCatalogItem_supplierId_idx" ON "SupplierCatalogItem"("supplierId");

-- CreateIndex
CREATE INDEX "SupplierCatalogItem_ingredientId_idx" ON "SupplierCatalogItem"("ingredientId");

-- CreateIndex
CREATE INDEX "SupplierCatalogItem_isActive_idx" ON "SupplierCatalogItem"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierCatalogItem_supplierId_ingredientId_key" ON "SupplierCatalogItem"("supplierId", "ingredientId");

-- CreateIndex
CREATE INDEX "CashClosing_isReconciled_idx" ON "CashClosing"("isReconciled");

-- CreateIndex
CREATE INDEX "CashClosing_reconciliationSessionId_idx" ON "CashClosing"("reconciliationSessionId");

-- CreateIndex
CREATE INDEX "Payment_isReconciled_idx" ON "Payment"("isReconciled");

-- CreateIndex
CREATE INDEX "Payment_reconciliationSessionId_idx" ON "Payment"("reconciliationSessionId");

-- CreateIndex
CREATE INDEX "SupplierOrderItem_supplierCatalogItemId_idx" ON "SupplierOrderItem"("supplierCatalogItemId");

-- AddForeignKey
ALTER TABLE "SupplierOrderItem" ADD CONSTRAINT "SupplierOrderItem_supplierCatalogItemId_fkey" FOREIGN KEY ("supplierCatalogItemId") REFERENCES "SupplierCatalogItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_reconciliationSessionId_fkey" FOREIGN KEY ("reconciliationSessionId") REFERENCES "ReconciliationSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashClosing" ADD CONSTRAINT "CashClosing_reconciliationSessionId_fkey" FOREIGN KEY ("reconciliationSessionId") REFERENCES "ReconciliationSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Absence" ADD CONSTRAINT "Absence_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRecord" ADD CONSTRAINT "PayrollRecord_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankMovement" ADD CONSTRAINT "BankMovement_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ReconciliationSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierCatalogItem" ADD CONSTRAINT "SupplierCatalogItem_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierCatalogItem" ADD CONSTRAINT "SupplierCatalogItem_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
