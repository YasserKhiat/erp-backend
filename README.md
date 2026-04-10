# Restaurant ERP Backend

Production-ready backend API for a restaurant ERP and client ordering platform.

This service is fully containerized so developers can run it with Docker without installing Node.js, npm packages, or Prisma locally.

## What This Backend Provides

- Authentication and role-based authorization
- Menu and category management
- Order lifecycle and cart workflows
- Payments and daily closing
- Reservation and table management
- Inventory and procurement
- Reviews and loyalty
- Finance and dashboard analytics

## Technologies Used

### Core Runtime

- Node.js 20
- TypeScript 5
- NestJS 11

### Data Layer

- PostgreSQL (AWS RDS)
- Prisma ORM and Prisma Client

### API and Security

- REST API with NestJS controllers
- Swagger/OpenAPI documentation
- JWT authentication
- Passport strategies and guards
- bcrypt password hashing
- class-validator and class-transformer for DTO validation

### Architecture and Quality

- Modular monolith by business domain
- Event-driven internal workflows with NestJS EventEmitter
- ESLint and build validation
- CI/security workflows (lint, build, SCA, CodeQL, secret/container scanning)

## Quick Start (Recommended: Docker)

### Prerequisites

- Docker Desktop (Windows/macOS) or Docker Engine with Compose plugin (Linux)

### 1. Clone and configure environment

```bash
git clone <repo-url>
cd erp-backend
```

Create your environment file:

- macOS/Linux:

```bash
cp .env.example .env
```

- Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Then edit .env with your real values.

### 2. Run backend with Docker

```bash
docker compose up --build -d
```

### 3. Open the API

- API root: http://localhost:3000
- Health: http://localhost:3000/health
- Swagger UI: http://localhost:3000/docs

Notes:

- This project containerizes only the backend app.
- Database is remote (AWS RDS), not a local Docker PostgreSQL container.

## Environment Variables

Required values in .env:

- DATABASE_URL: PostgreSQL connection string to AWS RDS
- JWT_SECRET: JWT signing secret
- JWT_EXPIRES_IN: token validity window (example: 1d)
- PORT: API port (default 3000)
- TAX_RATE: decimal tax rate (example: 0.1)
- CLOUDINARY_CLOUD_NAME: Cloudinary cloud name
- CLOUDINARY_API_KEY: Cloudinary API key
- CLOUDINARY_API_SECRET: Cloudinary API secret

Do not commit real secrets.

## Image Upload (Cloudinary)

Menu and ingredient images are uploaded as multipart files, stored in Cloudinary,
and only the resulting secure URL is saved in PostgreSQL.

### How It Works

- Admin uploads image to `POST /menu/:id/image` or `POST /ingredients/:id/image`
- API validates type (`image/jpeg`, `image/png`, `image/webp`) and max size (5 MB)
- API streams image to Cloudinary using the official SDK
- API updates `imageUrl` on the related record in PostgreSQL
- API returns standard contract: `{ "success": true, "data": { "imageUrl": "..." } }`

### Required Environment Variables

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

### Postman Example (Menu Image)

Request:

- Method: `POST`
- URL: `http://localhost:3000/menu/<menuItemId>/image`
- Auth: `Bearer <admin_jwt>`
- Body: `form-data`
  - Key: `file` (type: File)
  - Value: choose `.jpg`, `.png`, or `.webp` image <= 5 MB

Expected response:

```json
{
  "success": true,
  "data": {
    "imageUrl": "https://res.cloudinary.com/..."
  }
}
```

## Docker Commands

### Start / stop

```bash
docker compose up --build -d
docker compose down
```

### Logs and rebuild

```bash
docker compose logs -f api
docker compose build --no-cache api
```

### npm helper scripts (optional)

```bash
npm run docker:up
npm run docker:up:detached
npm run docker:logs
npm run docker:down
npm run docker:rebuild
```

## Prisma Workflow

Prisma Client generation is part of the container build.

Use explicit commands for DB operations:

```bash
docker compose run --rm api npm run prisma:generate
docker compose run --rm api npm run prisma:deploy
docker compose run --rm api npm run prisma:seed
```

Equivalent npm helpers:

```bash
npm run docker:prisma:generate
npm run docker:prisma:deploy
npm run docker:prisma:seed
```

Best practice:

- Keep migrations and seed as explicit commands.
- Do not auto-run migrations on every app startup.

## Local Non-Docker Setup (Optional)

Use this only if you prefer running directly on your machine.

### Prerequisites

- Node.js 20+
- npm 10+

### Install and run

```bash
npm install
npm run prisma:generate
npm run prisma:deploy
npm run prisma:seed
npm run start:dev
```

## API Contract

Main response envelopes:

- Success: { "success": true, "data": ... }
- Error: { "success": false, "error": "ERROR_CODE", "message": "..." }
- Paginated: { "success": true, "data": [...], "meta": { "page": 1, "limit": 10, "total": 120 } }

## Smoke and Validation

```bash
npm run test:validation
npm run test:smoke
```

## Troubleshooting

- Cannot connect to database (P1001):
  - Check DATABASE_URL and AWS RDS security group inbound rules for your IP.
- Container is up but API errors on DB operations:
  - Verify RDS host/port/database/user/password in DATABASE_URL.
- Prisma schema changed but app still fails:
  - Run docker compose run --rm api npm run prisma:generate.
- Port 3000 already in use:
  - Change PORT in .env, then restart docker compose.

## Additional Documentation

- FRONTEND_HANDOFF.md: frontend integration details and route usage
