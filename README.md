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
