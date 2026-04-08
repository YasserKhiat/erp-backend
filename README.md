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

## Postman Validation

- Import `postman/restaurant-erp.postman_collection.json`
- Import `postman/restaurant-erp.local.postman_environment.json`
- Set `baseUrl` and credentials in the environment
- Run folder `Validation Flow` in order:
	- Health
	- Register Client
	- Login
	- List Menu Categories
	- List Available Menu Items

The login request stores `accessToken` automatically for authenticated endpoints.
