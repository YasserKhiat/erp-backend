# Restaurant ERP Backend (NestJS)

Backend API for restaurant ERP/POS and client ordering platform.

## Stack

- NestJS + TypeScript
- Prisma ORM
- PostgreSQL (AWS RDS)
- JWT + bcrypt
- class-validator
- Swagger
- EventEmitter2

## Run

```bash
npm install
npm run prisma:generate
npm run prisma:seed
npm run build
npm run start:dev
```

Swagger docs: `/docs`
Health check: `/health`

## Branching Strategy

- `main`: production
- `develop`: integration
- `feature/*`: feature branches

## CI

GitHub Actions workflow: lint + build on pushes to `develop`, `feature/*`, and pull requests.
