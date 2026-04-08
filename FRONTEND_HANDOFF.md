# Frontend Handoff Guide

This document is the frontend integration contract for the Restaurant ERP backend.

## 1) Base URLs

- Local API base URL: `http://localhost:3000`
- Swagger UI: `http://localhost:3000/docs`
- OpenAPI JSON: `http://localhost:3000/docs-json`
- Health endpoint: `GET /health`

## 2) Auth Flow

1. Register (optional for new users): `POST /auth/register`
2. Login: `POST /auth/login`
3. Extract token from `data.accessToken`
4. Send on protected endpoints:
   - `Authorization: Bearer <JWT_TOKEN>`

Required headers:

- `Content-Type: application/json`
- `Authorization: Bearer <token>` for protected routes

## 3) Runtime Response Contract

All API responses follow a global envelope.

Success:

```json
{
  "success": true,
  "data": {},
  "message": "optional"
}
```

Error:

```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human readable message"
}
```

Paginated list:

```json
{
  "success": true,
  "data": [],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 120
  }
}
```

## 4) Pagination Behavior

Common list endpoints use query params:

- `page` default: `1`
- `limit` default: `10`
- `limit` max: `100`

If endpoint is paginated, expect `meta` in response.

## 5) Public Endpoints

No token required:

- `GET /health`
- `POST /auth/register`
- `POST /auth/login`
- `GET /menu`
- `GET /menu/items`
- `GET /menu/categories`
- `GET /menu/items/:id/recipe`
- `GET /menu/formulas`
- `GET /categories`
- `GET /reviews/menu/:menuItemId`

## 6) Protected Endpoints

Token required (plus role checks per route):

- Orders: `/orders/**`
- Payments: `/payments/**`
- Reservations: `/reservations/**`
- Loyalty: `/loyalty/**`
- Client profile: `/clients/me/**`
- Tables: `/tables/**`
- Inventory: `/inventory/**`
- Procurement: `/suppliers`, `/supplier-orders/**`
- Finance: `/finance/**`
- Dashboard: `/dashboard/**`
- Menu write/admin routes: create/update/delete paths under `/menu/**`
- Reviews personal write/read routes (`/reviews/me`, `POST /reviews`)

Always check Swagger lock icons and operation auth requirements.

## 7) Key Query Parameters

Frequently used frontend query params:

- Menu:
  - `availableOnly`
  - `categoryId`
  - `search`
  - `page`, `limit`
- Reservations:
  - `page`, `limit`
  - Availability: `tableId`, `startAt`, `endAt`, `guestCount`
- Payments, Reviews, Inventory, Finance lists:
  - `page`, `limit`

## 8) Seeded Demo Accounts

After `npm run prisma:seed`:

- Admin: `admin@restaurant.local` / `Admin123!`
- Manager: `manager@restaurant.local` / `Manager123!`
- Employee: `employee@restaurant.local` / `Employee123!`
- Client: `client@restaurant.local` / `Client123!`

## 9) Seeded Sample Data Available

- Categories and menu items
- Formula bundles
- Dining tables
- Suppliers and ingredients with inventory
- Reservation sample
- Completed/billed orders and payment history samples
- Review sample
- Loyalty account and transactions
- Expense and daily cash closing entries

## 10) Important Business Constraints

Frontend should account for these server rules:

- Role-based access is enforced server-side on protected routes.
- Ownership is enforced for client-scoped resources (orders, profile, payments, reservations, reviews).
- Order status transitions are constrained (invalid transitions return conflict errors).
- `DINE_IN` orders require valid table assignment.
- Payments cannot exceed remaining order balance.
- Duplicate payment transaction references are rejected.
- Loyalty redemption requires sufficient points.
- Reservation status and update transitions are constrained.

## 11) Recommended Frontend Integration Pattern

1. Authenticate and store JWT securely.
2. Build a thin API client that always reads `response.success`.
3. On success, consume `response.data`.
4. On error, use `response.error` for programmatic handling and `response.message` for user feedback.
5. For list views, read `meta.page`, `meta.limit`, `meta.total` to drive pagination UI.
6. Prefer operation details from Swagger (`/docs`) as source of truth.

## 12) Major Modules and Route Groups

- Auth
- Menu + Categories
- Orders
- Payments
- Reservations
- Client Profile
- Loyalty
- Reviews
- Tables
- Inventory
- Procurement
- Finance
- Dashboard

For endpoint-level details, request/response models, and auth requirements, use Swagger.
