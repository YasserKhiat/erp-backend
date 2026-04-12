# DB Schema Drift Repair

## Issue

Prisma migration history indicated all migrations were applied, but the live RDS physical schema was missing objects from an already recorded migration. This caused migration-history-versus-physical-schema drift.

Missing tables found during verification:

- Absence
- Attendance
- BankMovement
- Employee
- PayrollRecord
- ReconciliationSession
- SupplierCatalogItem

## Safe Repair Approach

1. Verified migration status and confirmed mismatch with direct live table inspection.
2. Generated repair SQL from Prisma schema diff (datasource to datamodel).
3. Reviewed SQL for safety before execution.
4. Executed only additive SQL via Prisma db execute.

## Safety Guarantees

- No database reset
- No table drops
- No column drops
- No destructive operations
- No data deletion

## Validation

- Table parity confirmed: 35/35
- Missing tables restored and queryable
- Prisma migrate status: schema up to date
- Runtime checks: /health and /menu successful
- Smoke test: passed

## Result

Database schema is fully aligned with Prisma schema and backend is production-safe.
