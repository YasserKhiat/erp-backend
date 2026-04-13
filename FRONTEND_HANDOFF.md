# Frontend Handoff Guide

This file is the integration contract for the client application.
Scope is client-facing features only (public + authenticated CLIENT routes).

## 1) Environment and Docs

- Base URL (local): `http://localhost:3000`
- Swagger UI: `http://localhost:3000/docs`
- OpenAPI JSON: `http://localhost:3000/docs-json`
- Health: `GET /health`

## 2) Auth and Headers

### Auth flow

1. Register (optional): `POST /auth/register`
2. Login: `POST /auth/login`
3. Read token from `data.accessToken`
4. Send protected calls with `Authorization: Bearer <token>`

### Required headers

- `Content-Type: application/json`
- `Authorization: Bearer <token>` for protected endpoints

## 3) Response Envelope Contract

All endpoints return an envelope.

### Success

```json
{
  "success": true,
  "data": {},
  "message": "optional"
}
```

### Error

```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human readable message"
}
```

### Paginated list

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

## 4) Pagination Rules

- `page` default: `1`
- `limit` default: `10`
- `limit` max: `100`

Only list endpoints return `meta`.

## 5) Public Client Endpoints

- `GET /`
- `GET /health`
- `POST /auth/register`
- `POST /auth/login`
- `GET /menu`
- `GET /menu/items` (legacy alias)
- `GET /menu/categories`
- `GET /categories`
- `GET /menu/:id`
- `GET /menu/items/:id/recipe`
- `GET /menu/formulas`
- `GET /reviews/menu/:menuItemId`
- `GET /reviews/service`

## 6) Authenticated Client Endpoints

### Orders and cart

- `GET /orders/cart`
- `POST /orders/cart/items`
- `PATCH /orders/cart/items/:cartItemId`
- `DELETE /orders/cart/items/:cartItemId`
- `POST /orders/cart/clear`
- `POST /orders`
- `GET /orders/history`
- `GET /orders/:orderId`
- `GET /orders/:orderId/tracking`
- `GET /orders/:orderId/invoice` (client owner or admin/manager)
- `GET /orders/:orderId/invoice/pdf` (downloadable PDF)

### Reservations

- `POST /reservations`
- `GET /reservations/me`
- `GET /reservations/availability`
- `PATCH /reservations/:reservationId`
- `PATCH /reservations/:reservationId/cancel`

### Reviews

- `GET /reviews/me`
- `POST /reviews`
- `POST /reviews/service`

### Loyalty

- `GET /loyalty/me`
- `POST /loyalty/me/redeem`

### Client profile

- `GET /clients/me/summary`
- `GET /clients/me/addresses`
- `POST /clients/me/addresses`
- `PATCH /clients/me/addresses/:addressId/default`
- `DELETE /clients/me/addresses/:addressId`
- `GET /clients/me/preferences`
- `PATCH /clients/me/preferences`
- `PATCH /clients/me/password`
- `GET /clients/me/favorites`
- `POST /clients/me/favorites`
- `DELETE /clients/me/favorites/:menuItemId`
- `GET /clients/me/invoices`

### Client payments

- `GET /payments/me`
- `GET /payments/order/:orderId` (ownership enforced)

### Notifications

- `GET /notifications/me`
- `GET /notifications/me/unread-count`
- `PATCH /notifications/:id/read`
- `PATCH /notifications/me/read-all`
- `GET /notifications/stream` (SSE live stream)

## 7) Important Response Shape Notes

These are the most common frontend mapping errors.

### `GET /clients/me/summary`

Returns:

```json
{
  "addresses": [],
  "preferences": {},
  "favorites": [],
  "loyalty": {
    "points": 0
  },
  "recentOrders": []
}
```

It does not return `user`, `loyaltyPoints`, `totalOrders`, `favoriteCount` directly.
Frontend should derive:

- `loyaltyPoints` from `loyalty.points`
- `totalOrders` from `recentOrders.length`
- `favoriteCount` from `favorites.length`

### `GET /clients/me/favorites`

Returns favorite rows with nested `menuItem`, not raw `MenuItem[]`.
Frontend should map `data[].menuItem` before rendering as menu cards.

### `GET /clients/me/preferences`

May return `null` if user has never set preferences.
UI should handle null and show empty form defaults.

### Notifications payload (`GET /notifications/me`)

Returns paginated rows sorted by newest first.

```json
{
  "id": "notif_xxx",
  "type": "ORDER",
  "priority": "INFO",
  "title": "Order #102 confirmed",
  "message": "Order 102 is confirmed and ready for preparation flow.",
  "isRead": false,
  "createdAt": "2026-04-13T09:00:00.000Z",
  "actionUrl": "/orders/clx_order_id",
  "metadata": {
    "orderId": "clx_order_id",
    "orderNumber": 102
  }
}
```

`GET /notifications/me/unread-count` returns `{ count: number }`.

`PATCH /notifications/:id/read` marks only the current user's recipient row.
`PATCH /notifications/me/read-all` marks all unread rows for the current user.

## 8) Critical Business Constraints for Client UX

- Checkout can fail with `MISSING_RECIPE` if a dish has no recipe.
  Seed now ensures recipes for all seeded menu items, but custom admin-created dishes still need recipes.
- Ownership checks are enforced for order/payment/reservation/profile routes.
- `DINE_IN` orders require valid table assignment.
- Payment totals cannot exceed order remaining amount.
- Loyalty redemption requires sufficient points.
- Reservation transitions and edit/cancel rules are validated server-side.
- Notifications are generated from domain events (order/payment/reservation/stock/loyalty),
  and can be consumed by either polling (`/notifications/me`) or live stream (`/notifications/stream`).

## 9) Seeded Accounts

After `npm run prisma:seed`:

- Admin: `admin@restaurant.local` / `Admin123!`
- Manager: `manager@restaurant.local` / `Manager123!`
- Employee: `employee@restaurant.local` / `Employee123!`
- Client: `client@restaurant.local` / `Client123!`

## 10) Seeded Data Coverage (Current)

- 30+ menu items with descriptions and image URLs
- Recipes linked for all seeded menu items
- Categories, formula bundles, tables
- Supplier, ingredient inventory, supplier catalog, procurement order
- Reservations, orders, payments, invoices
- Reviews and loyalty data
- Personnel, attendance, absence, payroll
- Reconciliation session and bank movements

## 11) Frontend Integration Checklist

1. Centralize envelope handling (`success`, `data`, `error`, `message`).
2. Keep service return types consistent (always return unwrapped data shape).
3. Handle null for preferences and optional nested objects.
4. Map favorites payload to `menuItem` before UI consumption.
5. Use `/menu` with `availableOnly=true` for client storefront.
6. Validate and show server `error` code plus `message` on failures.
7. Confirm all protected calls include JWT bearer token.
8. Poll notifications list + unread count and update local read state after mark-read calls.

## 12) Source of Truth

Swagger remains the endpoint-level source of truth for DTO fields and role requirements.
Use this handoff as frontend implementation guidance and data-shape notes.
