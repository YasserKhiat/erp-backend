# Restaurant ERP Backend

Production-oriented backend API for a restaurant ERP + client ordering platform.

## Project Overview

This service provides:

- Auth and role-based access control
- Menu/catalog management
- Order and payment processing
- Reservations and table management
- Inventory and procurement workflows
- Finance, dashboard analytics, reviews, and loyalty

Architecture summary:

- NestJS modular monolith (feature modules per domain)
- Prisma ORM
- PostgreSQL (AWS RDS)
- Internal event-driven side effects with NestJS EventEmitter
- CI + security workflows (build quality, SCA, CodeQL, secret and container scanning)

## Tech Stack

- Node.js + TypeScript
- NestJS
- Prisma
- PostgreSQL
- Swagger (OpenAPI)
- JWT + bcrypt
- class-validator

## Local Setup

### Prerequisites

- Node.js 20+
- npm 10+
- PostgreSQL database (local or managed)

### Environment Variables

Copy `.env.example` into `.env` and set values:

- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `PORT`
- `TAX_RATE`

### Install and Initialize

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

## Docker / Containerized Setup

Run the backend in Docker without installing Node.js, npm dependencies, or Prisma tooling locally.

Important:

- This repository containerizes only the backend application.
- PostgreSQL remains hosted remotely on AWS RDS.
- Docker Compose does not start a local PostgreSQL container.

### Prerequisites

- Docker Desktop (Windows/macOS) or Docker Engine + Docker Compose plugin (Linux)

### Environment Configuration

1. Copy `.env.example` to `.env`.
2. Set real values, especially:
	 - `DATABASE_URL` (AWS RDS connection string)
	 - `JWT_SECRET`
	 - `JWT_EXPIRES_IN`
	 - `PORT`
	 - `TAX_RATE`

Do not commit real secrets.

### Start Backend with Docker

```bash
docker compose up --build
```

or with npm helpers:

```bash
npm run docker:up
```

Backend URLs:

- API base: `http://localhost:3000`
- Swagger UI: `http://localhost:3000/docs`
- Health: `http://localhost:3000/health`

### Common Docker Commands

```bash
# Start in background
docker compose up --build -d

# View logs
docker compose logs -f api

# Stop services
docker compose down

# Rebuild image without cache
docker compose build --no-cache api
```

Equivalent npm helpers:

```bash
npm run docker:up:detached
npm run docker:logs
npm run docker:down
npm run docker:rebuild
```

### Prisma in Docker

The image runs `prisma generate` during build, so Prisma Client is available in the container.

Use explicit one-off commands for schema operations (recommended):

```bash
# Generate Prisma client
docker compose run --rm api npm run prisma:generate

# Apply committed migrations to AWS RDS
docker compose run --rm api npm run prisma:deploy

# Seed data
docker compose run --rm api npm run prisma:seed
```

Or with npm helpers:

```bash
npm run docker:prisma:generate
npm run docker:prisma:deploy
npm run docker:prisma:seed
```

Notes:

- Keep migration and seed execution explicit; they are not auto-run at container startup.
- Prefer `prisma migrate deploy` for shared environments.

### Onboarding Flow

```bash
git clone <repo-url>
cd erp-backend
cp .env.example .env
# edit .env with AWS RDS and JWT values
docker compose up --build
```

### AWS RDS Connectivity Notes

- Ensure AWS RDS security groups allow inbound traffic from your current public IP.
- Ensure `DATABASE_URL` points to the correct host/port/database.
- If SSL is required by your RDS setup, include required SSL parameters in `DATABASE_URL`.

### Troubleshooting

- Container starts but API cannot query DB:
	- Verify `DATABASE_URL` and AWS network rules (security group/NACL/VPC routing).
- `P1001` / cannot reach database:
	- Confirm RDS instance is publicly reachable from your environment or connected through VPN/bastion.
- Prisma schema changed but runtime errors persist:
	- Re-run `docker compose run --rm api npm run prisma:generate`.
- Port conflict on `3000`:
	- Change `PORT` in `.env` and restart compose.

## Running the App

```bash
npm run start:dev
```

Other common commands:

```bash
npm run build
npm run lint
npm run test:validation
npm run test:smoke
```

## API Documentation

- Swagger UI: `/docs`
- OpenAPI JSON: `/docs-json`
- Health: `/health`

Response contract notes:

- Success envelope:
	- `{ "success": true, "data": ... }`
	- Optional `message` may appear.
- Error envelope:
	- `{ "success": false, "error": "ERROR_CODE", "message": "Human readable message" }`
- Paginated responses:
	- `{ "success": true, "data": [...], "meta": { "page": 1, "limit": 10, "total": 120 } }`

## Seed and Demo Data

`npm run prisma:seed` provisions demo data for frontend and QA use:

- Demo users:
	- `admin@restaurant.local` / `Admin123!`
	- `manager@restaurant.local` / `Manager123!`
	- `employee@restaurant.local` / `Employee123!`
	- `client@restaurant.local` / `Client123!`
- Business fixtures:
	- Categories, menu items, formulas
	- Dining tables, suppliers, ingredients, inventory
	- Reservations, reviews, loyalty account + transactions
	- Payments, expenses, and daily cash closing examples

## Event-Driven Architecture

Core events:

- `order.confirmed`
- `order.completed`
- `order.cancelled`
- `payment.completed`
- `reservation.created`
- `stock.low`
- `loyalty.updated`

Core listeners:

- Stock listener: consumes stock when orders are confirmed
- Payment listener: updates daily stats and emits loyalty updates
- Loyalty listener: applies points and milestone bonuses
- Analytics listener: updates daily order counters
- Notification listener: logs stock low and reservation notifications

## CI/CD and DevSecOps

Workflows in `.github/workflows`:

- `ci.yml`: install, prisma generate, lint, build, test
- `security.yml`: gitleaks, dependency audit, dependency review, container scan
- `codeql.yml`: static code analysis

## Branch Workflow

- `main`: production release branch
- `develop`: integration branch
- `feature/*`: feature and handoff work
- `fix/*`: bugfix and contract hardening

Release policy:

1. Work in feature/fix branches
2. Merge to `develop` only when CI is green
3. Promote `develop` to `main` only after release readiness validation

## Frontend Integration Notes

For frontend-facing API usage, refer to `FRONTEND_HANDOFF.md` for:

- Base URL and Swagger URL
- Auth flow and required headers
- Public and protected route groups
- Pagination and query behavior
- Role and ownership constraints
- Example success/error payloads
