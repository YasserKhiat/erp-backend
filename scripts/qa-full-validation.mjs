import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const baseUrl = process.env.API_BASE_URL ?? 'http://localhost:3000';

const report = {
  startedAt: new Date().toISOString(),
  sections: {},
  endpointInventory: [],
  endpointTests: [],
  criticalIssues: [],
  improvements: [],
  recommendations: [],
};

function nowMs() {
  return Number(process.hrtime.bigint() / 1000000n);
}

async function request(method, path, { token, body, headers } = {}) {
  const start = nowMs();
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers ?? {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const durationMs = nowMs() - start;
  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { raw: text };
  }

  return { status: response.status, payload, durationMs };
}

function unwrapData(payload) {
  if (payload && payload.success === true && Object.prototype.hasOwnProperty.call(payload, 'data')) {
    return payload.data;
  }
  return payload;
}

function recordEndpointTest(test) {
  report.endpointTests.push(test);
}

function ok(condition, message, context = {}) {
  if (!condition) {
    throw new Error(`${message} :: ${JSON.stringify(context)}`);
  }
}

function randomEmail(prefix = 'qa') {
  return `${prefix}.${Date.now()}.${Math.floor(Math.random() * 10000)}@example.com`;
}

function addSection(name, pass, details) {
  report.sections[name] = { pass, details };
}

function addCritical(issue) {
  report.criticalIssues.push(issue);
}

function addImprovement(item) {
  report.improvements.push(item);
}

function addRecommendation(item) {
  report.recommendations.push(item);
}

async function collectEndpointInventory() {
  const inventory = [
    // auth
    ['auth', 'POST', '/auth/register', 'Public', '-', 'Register user'],
    ['auth', 'POST', '/auth/login', 'Public', '-', 'Login user'],

    // users
    ['users', 'GET', '/clients/me/addresses', 'Bearer', 'CLIENT', 'List addresses'],
    ['users', 'POST', '/clients/me/addresses', 'Bearer', 'CLIENT', 'Create address'],
    ['users', 'PATCH', '/clients/me/addresses/:addressId/default', 'Bearer', 'CLIENT', 'Set default address'],
    ['users', 'DELETE', '/clients/me/addresses/:addressId', 'Bearer', 'CLIENT', 'Delete address'],
    ['users', 'GET', '/clients/me/preferences', 'Bearer', 'CLIENT', 'Get preferences'],
    ['users', 'PATCH', '/clients/me/preferences', 'Bearer', 'CLIENT', 'Update preferences'],
    ['users', 'GET', '/clients/me/favorites', 'Bearer', 'CLIENT', 'List favorites'],
    ['users', 'POST', '/clients/me/favorites', 'Bearer', 'CLIENT', 'Add favorite'],
    ['users', 'DELETE', '/clients/me/favorites/:menuItemId', 'Bearer', 'CLIENT', 'Remove favorite'],
    ['users', 'GET', '/clients/me/invoices', 'Bearer', 'CLIENT', 'List invoices'],
    ['users', 'GET', '/clients/me/summary', 'Bearer', 'CLIENT', 'Profile summary'],

    // menu
    ['menu', 'GET', '/menu', 'Public', '-', 'Browse menu'],
    ['menu', 'GET', '/menu/items', 'Public', '-', 'Browse menu alias'],
    ['menu', 'GET', '/menu/categories', 'Public', '-', 'Browse menu categories'],
    ['menu', 'GET', '/menu/items/:id/recipe', 'Public', '-', 'Get recipe'],
    ['menu', 'GET', '/menu/formulas', 'Public', '-', 'List formula bundles'],
    ['menu', 'GET', '/menu/:id', 'Public', '-', 'Get menu item by id'],
    ['menu', 'POST', '/menu/categories', 'Bearer', 'ADMIN|MANAGER', 'Create category'],
    ['menu', 'POST', '/menu/items', 'Bearer', 'ADMIN|MANAGER', 'Create menu item'],
    ['menu', 'POST', '/menu/items/:id/recipe', 'Bearer', 'ADMIN|MANAGER', 'Set recipe'],
    ['menu', 'POST', '/menu/formulas', 'Bearer', 'ADMIN|MANAGER', 'Create formula bundle'],
    ['menu', 'GET', '/menu/items/:id/margin', 'Bearer', 'ADMIN|MANAGER', 'Get margin'],
    ['menu', 'POST', '/menu/:id/image', 'Bearer', 'ADMIN', 'Upload menu image'],
    ['menu', 'DELETE', '/menu/items/:id', 'Bearer', 'ADMIN|MANAGER', 'Delete menu item'],

    // categories
    ['categories', 'GET', '/categories', 'Public', '-', 'Browse categories'],

    // inventory
    ['inventory', 'GET', '/inventory', 'Bearer', 'ADMIN|MANAGER|EMPLOYEE', 'List inventory'],
    ['inventory', 'GET', '/inventory/alerts/low-stock', 'Bearer', 'ADMIN|MANAGER|EMPLOYEE', 'Low stock alerts'],
    ['inventory', 'GET', '/inventory/movements/history', 'Bearer', 'ADMIN|MANAGER|EMPLOYEE', 'Movement history'],
    ['inventory', 'POST', '/inventory/ingredients', 'Bearer', 'ADMIN|MANAGER|EMPLOYEE', 'Create ingredient'],
    ['inventory', 'POST', '/inventory/movements', 'Bearer', 'ADMIN|MANAGER|EMPLOYEE', 'Create stock movement'],
    ['inventory', 'DELETE', '/inventory/ingredients/:ingredientId', 'Bearer', 'ADMIN|MANAGER', 'Delete ingredient'],
    ['inventory', 'GET', '/ingredients', 'Bearer', 'ADMIN|MANAGER|EMPLOYEE', 'List ingredients'],
    ['inventory', 'POST', '/ingredients/:id/image', 'Bearer', 'ADMIN', 'Upload ingredient image'],

    // orders
    ['orders', 'GET', '/orders/cart', 'Bearer', 'Any authenticated', 'Get active cart'],
    ['orders', 'POST', '/orders/cart/items', 'Bearer', 'Any authenticated', 'Add cart item'],
    ['orders', 'POST', '/orders/cart/clear', 'Bearer', 'Any authenticated', 'Clear cart'],
    ['orders', 'POST', '/orders', 'Bearer', 'Any authenticated', 'Place order'],
    ['orders', 'GET', '/orders/history', 'Bearer', 'Any authenticated', 'Order history'],
    ['orders', 'GET', '/orders/:orderId', 'Bearer', 'Owner/backoffice', 'Get order details'],
    ['orders', 'GET', '/orders/:orderId/tracking', 'Bearer', 'Owner/backoffice', 'Track order'],
    ['orders', 'PATCH', '/orders/:orderId/status', 'Bearer', 'ADMIN|MANAGER|EMPLOYEE', 'Update status'],
    ['orders', 'PATCH', '/orders/:orderId/items/:orderItemId', 'Bearer', 'ADMIN|MANAGER|EMPLOYEE', 'Update order item'],
    ['orders', 'DELETE', '/orders/:orderId/items/:orderItemId', 'Bearer', 'ADMIN|MANAGER|EMPLOYEE', 'Remove order item'],

    // payments
    ['payments', 'POST', '/payments', 'Bearer', 'ADMIN|MANAGER|EMPLOYEE', 'Create payment'],
    ['payments', 'POST', '/payments/mixed', 'Bearer', 'ADMIN|MANAGER|EMPLOYEE', 'Create mixed payment'],
    ['payments', 'GET', '/payments', 'Bearer', 'ADMIN|MANAGER', 'Transactions'],
    ['payments', 'GET', '/payments/me', 'Bearer', 'CLIENT', 'My payments'],
    ['payments', 'GET', '/payments/order/:orderId', 'Bearer', 'Owner/backoffice', 'Order payments'],
    ['payments', 'GET', '/payments/closing/daily', 'Bearer', 'ADMIN|MANAGER', 'Daily closing report'],
    ['payments', 'POST', '/payments/closing/daily', 'Bearer', 'ADMIN|MANAGER', 'Close daily cash'],
    ['payments', 'GET', '/payments/treasury/summary', 'Bearer', 'ADMIN|MANAGER', 'Treasury summary'],

    // reservations
    ['reservations', 'POST', '/reservations', 'Bearer', 'Any authenticated', 'Create reservation'],
    ['reservations', 'GET', '/reservations/me', 'Bearer', 'CLIENT', 'My reservations'],
    ['reservations', 'GET', '/reservations/availability', 'Bearer', 'Any authenticated', 'Availability'],
    ['reservations', 'GET', '/reservations', 'Bearer', 'ADMIN|MANAGER|EMPLOYEE', 'List reservations'],
    ['reservations', 'PATCH', '/reservations/:reservationId', 'Bearer', 'Owner/backoffice', 'Update reservation'],
    ['reservations', 'PATCH', '/reservations/:reservationId/cancel', 'Bearer', 'Owner/backoffice', 'Cancel reservation'],
    ['reservations', 'PATCH', '/reservations/:reservationId/status', 'Bearer', 'ADMIN|MANAGER|EMPLOYEE', 'Update reservation status'],

    // loyalty
    ['loyalty', 'GET', '/loyalty/me', 'Bearer', 'CLIENT', 'Get loyalty'],
    ['loyalty', 'POST', '/loyalty/me/redeem', 'Bearer', 'CLIENT', 'Redeem rewards'],
    ['loyalty', 'POST', '/loyalty/adjust', 'Bearer', 'ADMIN|MANAGER', 'Adjust points'],

    // dashboard
    ['dashboard', 'GET', '/dashboard/overview', 'Bearer', 'ADMIN|MANAGER', 'Overview'],
    ['dashboard', 'GET', '/dashboard/report', 'Bearer', 'ADMIN|MANAGER', 'Report'],
  ];

  report.endpointInventory = inventory.map((row) => ({
    module: row[0],
    method: row[1],
    url: row[2],
    auth: row[3],
    role: row[4],
    description: row[5],
  }));
}

async function authAndRoleTests() {
  const section = { checks: [] };

  const registerEmail = randomEmail('full-qa');
  const registerResp = await request('POST', '/auth/register', {
    body: {
      email: registerEmail,
      fullName: 'Full QA User',
      password: 'QaUser123!',
      role: 'CLIENT',
    },
  });
  section.checks.push({ name: 'register success', pass: [200, 201].includes(registerResp.status), status: registerResp.status });

  const loginResp = await request('POST', '/auth/login', {
    body: { email: registerEmail, password: 'QaUser123!' },
  });
  const loginData = unwrapData(loginResp.payload);
  section.checks.push({ name: 'login success', pass: loginResp.status === 200 && Boolean(loginData.accessToken), status: loginResp.status });

  const badLoginResp = await request('POST', '/auth/login', {
    body: { email: registerEmail, password: 'WrongPass123!' },
  });
  section.checks.push({ name: 'invalid credentials', pass: badLoginResp.status === 401, status: badLoginResp.status });

  const expiredLikeResp = await request('GET', '/orders/cart', {
    token: 'eyJhbGciOiJIUzI1NiJ9.invalid.invalid',
  });
  section.checks.push({ name: 'invalid JWT rejected', pass: expiredLikeResp.status === 401, status: expiredLikeResp.status });

  const admin = unwrapData((await request('POST', '/auth/login', { body: { email: 'admin@restaurant.local', password: 'Admin123!' } })).payload);
  const manager = unwrapData((await request('POST', '/auth/login', { body: { email: 'manager@restaurant.local', password: 'Manager123!' } })).payload);
  const employee = unwrapData((await request('POST', '/auth/login', { body: { email: 'employee@restaurant.local', password: 'Employee123!' } })).payload);
  const client = unwrapData((await request('POST', '/auth/login', { body: { email: 'client@restaurant.local', password: 'Client123!' } })).payload);

  ok(Boolean(admin.accessToken && manager.accessToken && employee.accessToken && client.accessToken), 'Seed account login failed');

  const forbiddenResp = await request('GET', '/dashboard/overview', {
    token: client.accessToken,
  });
  section.checks.push({ name: 'RBAC forbidden works', pass: forbiddenResp.status === 403, status: forbiddenResp.status });

  const unauthResp = await request('GET', '/dashboard/overview');
  section.checks.push({ name: 'Unauthenticated blocked', pass: unauthResp.status === 401, status: unauthResp.status });

  addSection('auth', section.checks.every((c) => c.pass), {
    checks: section.checks,
  });

  return {
    tokens: {
      admin: admin.accessToken,
      manager: manager.accessToken,
      employee: employee.accessToken,
      client: client.accessToken,
      qaClient: loginData.accessToken,
    },
    users: {
      admin: admin.user,
      manager: manager.user,
      employee: employee.user,
      client: client.user,
      qaClient: loginData.user,
    },
  };
}

async function endpointTests(ctx) {
  const tests = [];

  const menuResp = await request('GET', '/menu?availableOnly=true&page=1&limit=50');
  const menuData = unwrapData(menuResp.payload);
  const recipeItemRow = await prisma.menuItemIngredient.findFirst({
    where: { menuItem: { isAvailable: true } },
    include: { menuItem: true },
  });
  const sampleItem = recipeItemRow?.menuItem
    ?? (Array.isArray(menuData) ? menuData[0] : null);

  const catResp = await request('GET', '/categories');
  const categories = unwrapData(catResp.payload);
  const sampleCategory = Array.isArray(categories) ? categories[0] : null;

  const tablesResp = await request('GET', '/tables', { token: ctx.tokens.manager });
  const tables = unwrapData(tablesResp.payload);
  let table = Array.isArray(tables) ? tables.find((t) => t.status === 'AVAILABLE') : null;
  if (!table && Array.isArray(tables) && tables.length > 0) {
    table = tables[0];
    await request('PATCH', `/tables/${table.id}/status`, {
      token: ctx.tokens.manager,
      body: { status: 'AVAILABLE' },
    });
  }

  const ingredient = await prisma.ingredient.findFirst({ include: { inventory: true } });

  const push = (name, pass, detail = {}) => tests.push({ name, pass, ...detail });

  // Public endpoints success
  push('GET /health success', (await request('GET', '/health')).status === 200);
  push('GET /categories success', catResp.status === 200);
  push('GET /menu success', menuResp.status === 200);
  push('GET /menu/items success', (await request('GET', '/menu/items?page=1&limit=5')).status === 200);
  push('GET /menu/formulas success', (await request('GET', '/menu/formulas?page=1&limit=5')).status === 200);

  if (sampleItem?.id) {
    push('GET /menu/:id success', (await request('GET', `/menu/${sampleItem.id}`)).status === 200);
    push('GET /menu/items/:id/recipe success', (await request('GET', `/menu/items/${sampleItem.id}/recipe`)).status === 200);
    push('GET /menu/:id not found', (await request('GET', '/menu/non-existing-id')).status === 404);
  }

  // Unauthorized/forbidden checks on protected endpoints
  push('GET /orders/cart unauthorized', (await request('GET', '/orders/cart')).status === 401);
  push('GET /dashboard/overview forbidden for client', (await request('GET', '/dashboard/overview', { token: ctx.tokens.client })).status === 403);
  push('GET /payments forbidden for client', (await request('GET', '/payments', { token: ctx.tokens.client })).status === 403);
  push('GET /clients/me/summary forbidden for manager', (await request('GET', '/clients/me/summary', { token: ctx.tokens.manager })).status === 403);

  // Users module
  const addrCreate = await request('POST', '/clients/me/addresses', {
    token: ctx.tokens.client,
    body: {
      label: 'QA Temp',
      addressLine: '123 QA Street',
      city: 'Casablanca',
      postalCode: '20000',
      isDefault: false,
    },
  });
  const addrData = unwrapData(addrCreate.payload);
  push('POST /clients/me/addresses success', [200, 201].includes(addrCreate.status));
  push('POST /clients/me/addresses invalid dto', (await request('POST', '/clients/me/addresses', { token: ctx.tokens.client, body: { city: 'OnlyCity' } })).status === 400);

  if (addrData?.id) {
    push('PATCH /clients/me/addresses/:id/default success', (await request('PATCH', `/clients/me/addresses/${addrData.id}/default`, { token: ctx.tokens.client })).status === 200);
    push('DELETE /clients/me/addresses/:id success', (await request('DELETE', `/clients/me/addresses/${addrData.id}`, { token: ctx.tokens.client })).status === 200);
    push('DELETE /clients/me/addresses/:id not found', (await request('DELETE', '/clients/me/addresses/non-existing-id', { token: ctx.tokens.client })).status === 404);
  }

  push('GET /clients/me/preferences success', (await request('GET', '/clients/me/preferences', { token: ctx.tokens.client })).status === 200);
  push('PATCH /clients/me/preferences success', (await request('PATCH', '/clients/me/preferences', {
    token: ctx.tokens.client,
    body: { dietaryRestrictions: 'None', allergens: 'None', preferredDeliveryNotes: 'Ring bell', marketingOptIn: true },
  })).status === 200);
  push('GET /clients/me/favorites success', (await request('GET', '/clients/me/favorites', { token: ctx.tokens.client })).status === 200);
  push('GET /clients/me/invoices success', (await request('GET', '/clients/me/invoices', { token: ctx.tokens.client })).status === 200);
  push('GET /clients/me/summary success', (await request('GET', '/clients/me/summary', { token: ctx.tokens.client })).status === 200);

  if (sampleItem?.id) {
    const currentFavorites = unwrapData((await request('GET', '/clients/me/favorites', { token: ctx.tokens.client })).payload);
    const alreadyFavorite = Array.isArray(currentFavorites) && currentFavorites.some((f) => f.menuItemId === sampleItem.id);
    const addFavoriteStatus = (await request('POST', '/clients/me/favorites', { token: ctx.tokens.client, body: { menuItemId: sampleItem.id } })).status;
    push('POST /clients/me/favorites success', alreadyFavorite ? [200, 201, 400].includes(addFavoriteStatus) : [200, 201].includes(addFavoriteStatus));
    push('DELETE /clients/me/favorites/:id success', (await request('DELETE', `/clients/me/favorites/${sampleItem.id}`, { token: ctx.tokens.client })).status === 200);
  }

  // Menu admin paths
  const newCategoryName = `QA-CAT-${Date.now()}`;
  const newCatResp = await request('POST', '/menu/categories', {
    token: ctx.tokens.manager,
    body: { name: newCategoryName },
  });
  const newCat = unwrapData(newCatResp.payload);
  push('POST /menu/categories success', [200, 201].includes(newCatResp.status));
  push('POST /menu/categories forbidden for client', (await request('POST', '/menu/categories', { token: ctx.tokens.client, body: { name: 'X' } })).status === 403);

  const newItemResp = await request('POST', '/menu/items', {
    token: ctx.tokens.manager,
    body: {
      name: `QA ITEM ${Date.now()}`,
      description: 'QA menu item',
      price: 12.5,
      categoryId: newCat?.id ?? sampleCategory?.id,
      isAvailable: true,
    },
  });
  const newItem = unwrapData(newItemResp.payload);
  push('POST /menu/items success', [200, 201].includes(newItemResp.status));
  push('POST /menu/items invalid dto', (await request('POST', '/menu/items', { token: ctx.tokens.manager, body: { name: 'bad' } })).status === 400);

  if (newItem?.id && ingredient?.id) {
    const recipeResp = await request('POST', `/menu/items/${newItem.id}/recipe`, {
      token: ctx.tokens.manager,
      body: {
        ingredients: [{ ingredientId: ingredient.id, quantityNeeded: 1 }],
      },
    });
    push('POST /menu/items/:id/recipe success', recipeResp.status >= 200 && recipeResp.status < 300);
    push('GET /menu/items/:id/margin success', (await request('GET', `/menu/items/${newItem.id}/margin`, { token: ctx.tokens.manager })).status === 200);
    push('DELETE /menu/items/:id success', (await request('DELETE', `/menu/items/${newItem.id}`, { token: ctx.tokens.manager })).status === 200);
  }

  // Inventory paths
  push('GET /inventory success', (await request('GET', '/inventory?page=1&limit=5', { token: ctx.tokens.employee })).status === 200);
  push('GET /inventory unauthorized', (await request('GET', '/inventory?page=1&limit=5')).status === 401);
  push('GET /inventory/alerts/low-stock success', (await request('GET', '/inventory/alerts/low-stock?page=1&limit=5', { token: ctx.tokens.employee })).status === 200);
  push('GET /inventory/movements/history success', (await request('GET', '/inventory/movements/history?page=1&limit=5', { token: ctx.tokens.employee })).status === 200);

  const ingCreate = await request('POST', '/inventory/ingredients', {
    token: ctx.tokens.manager,
    body: {
      name: `QA-Ingredient-${Date.now()}`,
      unit: 'pcs',
      minStockLevel: 1,
      initialStock: 10,
    },
  });
  const newIng = unwrapData(ingCreate.payload);
  push('POST /inventory/ingredients success', [200, 201].includes(ingCreate.status));
  push('POST /inventory/ingredients invalid dto', (await request('POST', '/inventory/ingredients', { token: ctx.tokens.manager, body: { name: 'x' } })).status === 400);
  if (ingredient?.id) {
    push('POST /inventory/movements success', [200, 201].includes((await request('POST', '/inventory/movements', {
      token: ctx.tokens.employee,
      body: { ingredientId: ingredient.id, type: 'IN', quantity: 1, reason: 'QA adjust' },
    })).status));
    push('POST /inventory/movements invalid dto', (await request('POST', '/inventory/movements', { token: ctx.tokens.employee, body: { ingredientId: ingredient.id } })).status === 400);
  }
  if (newIng?.id) {
    push('DELETE /inventory/ingredients/:id success', (await request('DELETE', `/inventory/ingredients/${newIng.id}`, { token: ctx.tokens.manager })).status === 200);
    push('DELETE /inventory/ingredients/:id forbidden for employee', (await request('DELETE', `/inventory/ingredients/${newIng.id}`, { token: ctx.tokens.employee })).status === 403);
  }
  push('GET /ingredients success', (await request('GET', '/ingredients', { token: ctx.tokens.employee })).status === 200);

  // Orders and payments linked flow for endpoint coverage
  if (sampleItem?.id && table?.id) {
    await request('POST', '/orders/cart/clear', { token: ctx.tokens.client });
    push('POST /orders/cart/clear success', [200, 201].includes((await request('POST', '/orders/cart/clear', { token: ctx.tokens.client })).status));
    push('GET /orders/cart success', (await request('GET', '/orders/cart', { token: ctx.tokens.client })).status === 200);
    push('POST /orders/cart/items success', [200, 201].includes((await request('POST', '/orders/cart/items', {
      token: ctx.tokens.client,
      body: { menuItemId: sampleItem.id, quantity: 1 },
    })).status));
    push('POST /orders/cart/items invalid dto', (await request('POST', '/orders/cart/items', { token: ctx.tokens.client, body: { quantity: 1 } })).status === 400);

    const orderResp = await request('POST', '/orders', {
      token: ctx.tokens.client,
      body: { orderType: 'DINE_IN', tableId: table.id, notes: 'QA endpoint run' },
    });
    const order = unwrapData(orderResp.payload);
    push('POST /orders success', [200, 201].includes(orderResp.status));
    push('POST /orders business violation dine_in without table', (await request('POST', '/orders', {
      token: ctx.tokens.client,
      body: { orderType: 'DINE_IN' },
    })).status >= 400);

    if (order?.id) {
      push('GET /orders/:id success', (await request('GET', `/orders/${order.id}`, { token: ctx.tokens.client })).status === 200);
      push('GET /orders/:id/tracking success', (await request('GET', `/orders/${order.id}/tracking`, { token: ctx.tokens.client })).status === 200);
      push('GET /orders/history success', (await request('GET', '/orders/history?page=1&limit=5', { token: ctx.tokens.client })).status === 200);
      push('GET /orders/:id not found', (await request('GET', '/orders/non-existing-id', { token: ctx.tokens.client })).status === 404);
      push('PATCH /orders/:id/status forbidden client', (await request('PATCH', `/orders/${order.id}/status`, { token: ctx.tokens.client, body: { status: 'PREPARING' } })).status === 403);

      const orderDetails = unwrapData((await request('GET', `/orders/${order.id}`, { token: ctx.tokens.manager })).payload);
      const orderItem = orderDetails?.items?.[0];
      if (orderItem?.id) {
        push('PATCH /orders/:id/items/:orderItemId success', (await request('PATCH', `/orders/${order.id}/items/${orderItem.id}`, {
          token: ctx.tokens.manager,
          body: { quantity: 2 },
        })).status === 200);
        push('DELETE /orders/:id/items/:orderItemId success', (await request('DELETE', `/orders/${order.id}/items/${orderItem.id}`, {
          token: ctx.tokens.manager,
          body: { removeAll: false },
        })).status === 200);
      }

      for (const status of ['PREPARING', 'READY', 'SERVED', 'BILLED', 'COMPLETED']) {
        await request('PATCH', `/orders/${order.id}/status`, {
          token: ctx.tokens.manager,
          body: { status },
        });
      }

      const paymentResp = await request('POST', '/payments', {
        token: ctx.tokens.manager,
        body: { orderId: order.id, amount: Number(order.total), method: 'CARD' },
      });
      push('POST /payments success', [200, 201].includes(paymentResp.status));
      // Build a fresh unpaid order to assert overpay business rule deterministically.
      await request('POST', '/orders/cart/clear', { token: ctx.tokens.client });
      await request('POST', '/orders/cart/items', {
        token: ctx.tokens.client,
        body: { menuItemId: sampleItem.id, quantity: 1 },
      });
      const overpayOrderResp = await request('POST', '/orders', {
        token: ctx.tokens.client,
        body: { orderType: 'DINE_IN', tableId: table.id, notes: 'QA overpay assertion' },
      });
      const overpayOrder = unwrapData(overpayOrderResp.payload);
      const overpayAmount = overpayOrder?.total !== undefined
        ? Number((Number(overpayOrder.total) + 100).toFixed(2))
        : null;
      const overpayResp = overpayOrder?.id
        ? await request('POST', '/payments', {
            token: ctx.tokens.manager,
            body: { orderId: overpayOrder.id, amount: overpayAmount, method: 'CARD' },
          })
        : { status: overpayOrderResp.status, payload: overpayOrderResp.payload };
      push(
        'POST /payments business violation overpay',
        overpayResp.status === 409
          || ['PAYMENT_EXCEEDS_ORDER_TOTAL', 'ORDER_ALREADY_PAID'].includes(overpayResp.payload?.error),
      );

      push('GET /payments/order/:orderId success', (await request('GET', `/payments/order/${order.id}?page=1&limit=5`, {
        token: ctx.tokens.manager,
      })).status === 200);
    }
  }

  // Payments additional
  push('GET /payments success', (await request('GET', '/payments?page=1&limit=5', { token: ctx.tokens.manager })).status === 200);
  push('GET /payments/me success', (await request('GET', '/payments/me?page=1&limit=5', { token: ctx.tokens.client })).status === 200);
  push('GET /payments/closing/daily success', (await request('GET', '/payments/closing/daily', { token: ctx.tokens.manager })).status === 200);
  push('GET /payments/treasury/summary success', (await request('GET', '/payments/treasury/summary', { token: ctx.tokens.manager })).status === 200);
  push('POST /payments/closing/daily invalid dto', (await request('POST', '/payments/closing/daily', {
    token: ctx.tokens.manager,
    body: { expectedCash: -1 },
  })).status >= 400);

  // Reservations
  if (table?.id) {
    const start = new Date(Date.now() + 7 * 24 * 3600 * 1000);
    const end = new Date(start.getTime() + 3600 * 1000);
    const reserveResp = await request('POST', '/reservations', {
      token: ctx.tokens.client,
      body: {
        tableId: table.id,
        guestCount: 2,
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        notes: 'QA reservation',
      },
    });
    const reservation = unwrapData(reserveResp.payload);
    push('POST /reservations success', [200, 201].includes(reserveResp.status));
    push('POST /reservations invalid dto', (await request('POST', '/reservations', { token: ctx.tokens.client, body: { tableId: table.id } })).status === 400);
    push('GET /reservations/me success', (await request('GET', '/reservations/me?page=1&limit=5', { token: ctx.tokens.client })).status === 200);
    push('GET /reservations success', (await request('GET', '/reservations?page=1&limit=5', { token: ctx.tokens.manager })).status === 200);
    push('GET /reservations forbidden for client', (await request('GET', '/reservations?page=1&limit=5', { token: ctx.tokens.client })).status === 403);
    push('GET /reservations/availability success', (await request('GET', `/reservations/availability?startAt=${encodeURIComponent(start.toISOString())}&endAt=${encodeURIComponent(end.toISOString())}&guestCount=2`, { token: ctx.tokens.client })).status === 200);

    if (reservation?.id) {
      push('PATCH /reservations/:id success', (await request('PATCH', `/reservations/${reservation.id}`, {
        token: ctx.tokens.client,
        body: { notes: 'QA updated reservation' },
      })).status === 200);
      push('PATCH /reservations/:id/status success', (await request('PATCH', `/reservations/${reservation.id}/status`, {
        token: ctx.tokens.manager,
        body: { status: 'SEATED' },
      })).status === 200);
      const cancelStart = new Date(start.getTime() + 3 * 3600 * 1000);
      const cancelEnd = new Date(cancelStart.getTime() + 3600 * 1000);
      const cancelReserveResp = await request('POST', '/reservations', {
        token: ctx.tokens.client,
        body: {
          tableId: table.id,
          guestCount: 2,
          startAt: cancelStart.toISOString(),
          endAt: cancelEnd.toISOString(),
          notes: 'QA reservation cancel target',
        },
      });
      const cancelReservation = unwrapData(cancelReserveResp.payload);
      push('PATCH /reservations/:id/cancel success', cancelReservation?.id
        ? (await request('PATCH', `/reservations/${cancelReservation.id}/cancel`, { token: ctx.tokens.client })).status === 200
        : false);
      push('PATCH /reservations/:id/status forbidden client', (await request('PATCH', `/reservations/${reservation.id}/status`, {
        token: ctx.tokens.client,
        body: { status: 'CONFIRMED' },
      })).status === 403);
    }
  }

  // Loyalty
  push('GET /loyalty/me success', (await request('GET', '/loyalty/me', { token: ctx.tokens.client })).status === 200);
  push('POST /loyalty/me/redeem business violation', (await request('POST', '/loyalty/me/redeem', {
    token: ctx.tokens.client,
    body: { quantity: 1000 },
  })).status === 409);
  push('POST /loyalty/adjust success', [200, 201].includes((await request('POST', '/loyalty/adjust', {
    token: ctx.tokens.manager,
    body: { userId: ctx.users.client.id, pointsDelta: 1, reason: 'QA adjustment' },
  })).status));
  push('POST /loyalty/adjust forbidden client', (await request('POST', '/loyalty/adjust', {
    token: ctx.tokens.client,
    body: { userId: ctx.users.client.id, pointsDelta: 1 },
  })).status === 403);

  // Dashboard
  push('GET /dashboard/overview success', (await request('GET', '/dashboard/overview', { token: ctx.tokens.manager })).status === 200);
  push('GET /dashboard/report success', (await request('GET', '/dashboard/report', { token: ctx.tokens.manager })).status === 200);

  // Contract conformance sample
  const contractSample = await request('GET', '/menu?page=1&limit=1');
  const body = contractSample.payload;
  push('Response contract has success boolean', typeof body.success === 'boolean');
  push('Response contract has data for success', body.success === true && Object.prototype.hasOwnProperty.call(body, 'data'));

  for (const t of tests) {
    recordEndpointTest(t);
  }

  addSection('endpoints', tests.every((t) => t.pass), {
    totalChecks: tests.length,
    passed: tests.filter((t) => t.pass).length,
    failed: tests.filter((t) => !t.pass),
  });
}

async function dbIntegrityChecks() {
  const details = {};

  const negativeStock = await prisma.inventory.count({
    where: { currentStock: { lt: 0 } },
  });
  details.negativeStockCount = negativeStock;

  const orphanPayments = await prisma.$queryRawUnsafe(
    'SELECT COUNT(*)::int AS count FROM "Payment" p LEFT JOIN "Order" o ON p."orderId" = o.id WHERE o.id IS NULL',
  );
  details.orphanPaymentsCount = Number(orphanPayments[0]?.count ?? 0);

  const orderTotalMismatches = await prisma.$queryRawUnsafe(
    'SELECT COUNT(*)::int AS count FROM "Order" o WHERE ABS((o.subtotal + o.tax) - o.total) > 0.01',
  );
  details.orderTotalMismatchCount = Number(orderTotalMismatches[0]?.count ?? 0);

  const loyaltyBalanceMismatch = await prisma.$queryRawUnsafe(
    'SELECT COUNT(*)::int AS count FROM "LoyaltyAccount" a WHERE EXISTS (SELECT 1 FROM "LoyaltyTransaction" t WHERE t."accountId" = a.id) AND a.points <> (SELECT t2."balanceAfter" FROM "LoyaltyTransaction" t2 WHERE t2."accountId" = a.id ORDER BY t2."createdAt" DESC LIMIT 1)',
  );
  details.loyaltyBalanceMismatchCount = Number(loyaltyBalanceMismatch[0]?.count ?? 0);

  // Reservation conflict prevention check via API path (not direct prisma writes)
  const managerLogin = unwrapData((await request('POST', '/auth/login', {
    body: { email: 'manager@restaurant.local', password: 'Manager123!' },
  })).payload);
  const clientLogin = unwrapData((await request('POST', '/auth/login', {
    body: { email: 'client@restaurant.local', password: 'Client123!' },
  })).payload);
  const tableList = unwrapData((await request('GET', '/tables', {
    token: managerLogin.accessToken,
  })).payload);
  const table = Array.isArray(tableList) ? tableList[0] : null;
  let reservationConflictPrevented = true;
  if (table) {
    const base = new Date(Date.now() + 30 * 24 * 3600 * 1000);
    base.setMinutes(0, 0, 0);
    let primaryStart = null;
    let primaryEnd = null;
    for (let i = 0; i < 24; i += 1) {
      const start = new Date(base.getTime() + i * 2 * 3600 * 1000);
      const end = new Date(start.getTime() + 3600 * 1000);
      const candidate = await request('POST', '/reservations', {
        token: clientLogin.accessToken,
        body: {
          tableId: table.id,
          guestCount: 2,
          startAt: start.toISOString(),
          endAt: end.toISOString(),
          notes: `DB integrity check primary ${i}`,
        },
      });
      if ([200, 201].includes(candidate.status)) {
        primaryStart = start;
        primaryEnd = end;
        break;
      }
    }

    if (!primaryStart || !primaryEnd) {
      reservationConflictPrevented = false;
    } else {
      const r2 = await request('POST', '/reservations', {
        token: clientLogin.accessToken,
        body: {
          tableId: table.id,
          guestCount: 2,
          startAt: new Date(primaryStart.getTime() + 10 * 60 * 1000).toISOString(),
          endAt: new Date(primaryEnd.getTime() - 10 * 60 * 1000).toISOString(),
          notes: 'DB integrity check overlap',
        },
      });
      reservationConflictPrevented = r2.status === 409;
    }
  }
  details.reservationConflictPrevented = reservationConflictPrevented;

  const pass =
    details.negativeStockCount === 0 &&
    details.orphanPaymentsCount === 0 &&
    details.orderTotalMismatchCount === 0 &&
    details.loyaltyBalanceMismatchCount === 0 &&
    details.reservationConflictPrevented === true;

  addSection('database', pass, details);
}

async function eventChecks(ctx) {
  const details = {};

  const table = await prisma.diningTable.findFirst({ where: { status: 'AVAILABLE' } })
    ?? await prisma.diningTable.findFirst();
  const recipeJoin = await prisma.menuItemIngredient.findFirst({
    where: { menuItem: { isAvailable: true } },
    include: {
      menuItem: true,
      ingredient: { include: { inventory: true } },
    },
  });
  const menuItem = recipeJoin?.menuItem ?? await prisma.menuItem.findFirst({ where: { isAvailable: true } });
  const recipeLine = recipeJoin
    ? {
        ingredientId: recipeJoin.ingredientId,
        ingredient: recipeJoin.ingredient,
      }
    : null;

  if (!table || !menuItem) {
    addSection('events', false, { reason: 'No table/menu item available for event checks' });
    return;
  }

  if (table.status !== 'AVAILABLE') {
    await request('PATCH', `/tables/${table.id}/status`, {
      token: ctx.tokens.manager,
      body: { status: 'AVAILABLE' },
    });
  }

  const beforeStock = recipeLine?.ingredient?.inventory ? Number(recipeLine.ingredient.inventory.currentStock) : null;
  const beforeDailyStats = await prisma.dailyStat.findMany({
    select: { id: true, totalRevenue: true, updatedAt: true },
  });
  const beforeDailyMap = new Map(
    beforeDailyStats.map((row) => [
      row.id,
      {
        totalRevenue: Number(row.totalRevenue),
        updatedAtMs: row.updatedAt.getTime(),
      },
    ]),
  );
  const beforePoints = (await prisma.loyaltyAccount.findUnique({ where: { userId: ctx.users.client.id } }))?.points ?? 0;

  await request('POST', '/orders/cart/clear', { token: ctx.tokens.client });
  await request('POST', '/orders/cart/items', {
    token: ctx.tokens.client,
    body: { menuItemId: menuItem.id, quantity: 1 },
  });

  const orderResp = await request('POST', '/orders', {
    token: ctx.tokens.client,
    body: { orderType: 'DINE_IN', tableId: table.id, notes: 'QA event chain' },
  });
  const order = unwrapData(orderResp.payload);

  for (const status of ['PREPARING', 'READY', 'SERVED', 'BILLED', 'COMPLETED']) {
    await request('PATCH', `/orders/${order.id}/status`, {
      token: ctx.tokens.manager,
      body: { status },
    });
  }

  const paymentResp = await request('POST', '/payments', {
    token: ctx.tokens.manager,
    body: { orderId: order.id, amount: Number(order.total), method: 'CARD' },
  });
  details.paymentStatus = paymentResp.status;

  await new Promise((resolve) => setTimeout(resolve, 1500));

  const afterStockRow = recipeLine
    ? await prisma.inventory.findUnique({ where: { ingredientId: recipeLine.ingredientId } })
    : null;
  const afterStock = afterStockRow ? Number(afterStockRow.currentStock) : null;
  const afterPoints = (await prisma.loyaltyAccount.findUnique({ where: { userId: ctx.users.client.id } }))?.points ?? 0;

  const loyaltyTx = await prisma.loyaltyTransaction.findUnique({
    where: { referenceKey: `earn:${order.id}` },
  });

  const reserveStart = new Date(Date.now() + 24 * 3600 * 1000);
  const reserveEnd = new Date(reserveStart.getTime() + 3600 * 1000);
  const reservationResp = await request('POST', '/reservations', {
    token: ctx.tokens.client,
    body: {
      tableId: table.id,
      guestCount: 2,
      startAt: reserveStart.toISOString(),
      endAt: reserveEnd.toISOString(),
      notes: 'QA event reservation',
    },
  });

  // low stock notification logic is log-based (no persistence), verify low-stock detection via API contract
  const lowStockResp = await request('GET', '/inventory/alerts/low-stock?page=1&limit=100', {
    token: ctx.tokens.employee,
  });

  let dailyStatUpdated = false;
  for (let i = 0; i < 8; i += 1) {
    const afterDailyStats = await prisma.dailyStat.findMany({
      select: { id: true, totalRevenue: true, updatedAt: true },
    });
    dailyStatUpdated = afterDailyStats.some((row) => {
      const before = beforeDailyMap.get(row.id);
      if (!before) {
        return Number(row.totalRevenue) > 0;
      }
      return Number(row.totalRevenue) > before.totalRevenue || row.updatedAt.getTime() > before.updatedAtMs;
    });
    if (dailyStatUpdated) {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  details.stockUpdated = beforeStock !== null && afterStock !== null ? afterStock < beforeStock : null;
  details.dailyStatUpdated = dailyStatUpdated;
  details.loyaltyUpdated = Boolean(loyaltyTx) && afterPoints >= beforePoints;
  details.reservationCreated = [200, 201].includes(reservationResp.status);
  details.lowStockEndpointOperational = lowStockResp.status === 200;
  details.lowStockNotificationPersistence = 'No notification persistence table; listener behavior is log-based';

  const pass =
    details.stockUpdated !== false &&
    details.dailyStatUpdated === true &&
    details.loyaltyUpdated === true &&
    details.reservationCreated === true &&
    details.lowStockEndpointOperational === true;

  addSection('events', pass, details);
}

async function fullUserFlow(ctx) {
  const details = {};

  const email = randomEmail('flow');
  const register = await request('POST', '/auth/register', {
    body: {
      email,
      fullName: 'Flow User',
      password: 'FlowUser123!',
      role: 'CLIENT',
    },
  });

  const login = await request('POST', '/auth/login', {
    body: { email, password: 'FlowUser123!' },
  });
  const loginData = unwrapData(login.payload);

  const menu = await request('GET', '/menu?availableOnly=true&page=1&limit=50');
  const menuData = unwrapData(menu.payload);
  const recipeItem = await prisma.menuItemIngredient.findFirst({
    where: { menuItem: { isAvailable: true } },
    include: { menuItem: true },
  });
  const item = recipeItem?.menuItem ?? (Array.isArray(menuData) ? menuData[0] : null);

  const tables = unwrapData((await request('GET', '/tables', { token: ctx.tokens.manager })).payload);
  const table = Array.isArray(tables) ? (tables.find((t) => t.status === 'AVAILABLE') ?? tables[0]) : null;
  if (table?.status !== 'AVAILABLE') {
    await request('PATCH', `/tables/${table.id}/status`, {
      token: ctx.tokens.manager,
      body: { status: 'AVAILABLE' },
    });
  }

  const token = loginData.accessToken;
  await request('POST', '/orders/cart/clear', { token });
  const addToCart = await request('POST', '/orders/cart/items', {
    token,
    body: { menuItemId: item.id, quantity: 1 },
  });

  const order = unwrapData((await request('POST', '/orders', {
    token,
    body: { orderType: 'DINE_IN', tableId: table.id, notes: 'Full flow order' },
  })).payload);

  for (const status of ['PREPARING', 'READY', 'SERVED', 'BILLED', 'COMPLETED']) {
    await request('PATCH', `/orders/${order.id}/status`, {
      token: ctx.tokens.manager,
      body: { status },
    });
  }

  const payment = await request('POST', '/payments', {
    token: ctx.tokens.manager,
    body: { orderId: order.id, amount: Number(order.total), method: 'CARD' },
  });

  const history = await request('GET', '/orders/history?page=1&limit=10', { token });
  const historyData = unwrapData(history.payload);

  details.register = [200, 201].includes(register.status);
  details.login = login.status === 200;
  details.menu = menu.status === 200;
  details.addToCart = [200, 201].includes(addToCart.status);
  details.order = Boolean(order?.id);
  details.payment = [200, 201].includes(payment.status);
  details.history = history.status === 200 && Array.isArray(historyData);

  const pass = Object.values(details).every((v) => v === true);
  addSection('flows', pass, details);
}

async function swaggerChecks() {
  const details = {};
  const docResp = await request('GET', '/docs-json');
  const doc = docResp.payload;

  details.docsJsonLoad = docResp.status === 200 && Boolean(doc.openapi);
  details.authDocumented = Boolean(doc.components?.securitySchemes?.bearer);
  details.successEnvelopeDocumented = Boolean(doc.paths?.['/menu']?.get?.responses?.['200']?.content?.['application/json']?.schema?.properties?.success);
  details.errorEnvelopeDocumented = Boolean(doc.paths?.['/menu']?.get?.responses?.['400']?.content?.['application/json']?.schema?.properties?.error);
  details.paginationDocumented = Boolean(doc.paths?.['/menu']?.get?.responses?.['200']?.content?.['application/json']?.schema?.properties?.meta);
  details.requestExampleExists = Boolean(doc.paths?.['/auth/login']?.post?.requestBody?.content?.['application/json']?.schema);

  const expectedPaths = [
    '/auth/login',
    '/clients/me/summary',
    '/menu',
    '/categories',
    '/inventory',
    '/orders',
    '/payments',
    '/reservations',
    '/loyalty/me',
    '/dashboard/overview',
  ];
  details.expectedPathsPresent = expectedPaths.every((p) => Boolean(doc.paths?.[p]));

  const pass = Object.values(details).every((v) => v === true);
  addSection('swagger', pass, details);
}

async function performanceChecks(ctx) {
  const details = {};

  const burst = [];
  for (let i = 0; i < 30; i += 1) {
    burst.push(request('GET', '/menu?availableOnly=true&page=1&limit=10'));
  }
  const burstResults = await Promise.all(burst);

  const durations = burstResults.map((r) => r.durationMs).sort((a, b) => a - b);
  const p95 = durations[Math.floor(durations.length * 0.95) - 1] ?? durations[durations.length - 1];

  details.concurrentMenuRequests = burstResults.length;
  details.concurrentMenuFailures = burstResults.filter((r) => r.status !== 200).length;
  details.concurrentP95Ms = p95;

  const pageLimitResp = await request('GET', '/menu?page=1&limit=999');
  const pageLimitData = pageLimitResp.payload;
  details.paginationLimitHandled = pageLimitResp.status === 200 && (pageLimitData?.data?.length ?? 0) <= 100;

  const largePayload = {
    notes: 'x'.repeat(10000),
  };
  const largePayloadResp = await request('PATCH', '/clients/me/preferences', {
    token: ctx.tokens.client,
    body: largePayload,
  });
  details.largePayloadHandled = [200, 400].includes(largePayloadResp.status);

  const pass =
    details.concurrentMenuFailures === 0 &&
    details.concurrentP95Ms < 2000 &&
    details.paginationLimitHandled === true &&
    details.largePayloadHandled === true;

  addSection('performance', pass, details);
}

async function errorHandlingChecks(ctx) {
  const details = {};

  const notFound = await request('GET', '/orders/non-existing-order-id', {
    token: ctx.tokens.client,
  });
  const forbidden = await request('GET', '/dashboard/overview', {
    token: ctx.tokens.client,
  });
  const validation = await request('POST', '/auth/register', {
    body: { email: 'bad', fullName: '', password: 'x', role: 'CLIENT' },
  });
  const conflict = await request('POST', '/auth/register', {
    body: {
      email: 'client@restaurant.local',
      fullName: 'Duplicate',
      password: 'Client123!',
      role: 'CLIENT',
    },
  });

  const isContract = (p) => p && typeof p.success === 'boolean' && typeof p.error === 'string' && typeof p.message === 'string';

  details.notFoundCode = notFound.payload?.error;
  details.forbiddenCode = forbidden.payload?.error;
  details.validationCode = validation.payload?.error;
  details.conflictCode = conflict.payload?.error;
  details.errorEnvelopeConsistent = [notFound, forbidden, validation, conflict].every((r) => isContract(r.payload));
  details.noRawStackLeak = [notFound, forbidden, validation, conflict].every((r) => !JSON.stringify(r.payload).toLowerCase().includes('stack'));

  const pass =
    details.errorEnvelopeConsistent &&
    details.noRawStackLeak &&
    ['NOT_FOUND'].includes(details.notFoundCode) &&
    ['FORBIDDEN', 'FORBIDDEN_ROLE'].includes(details.forbiddenCode) &&
    ['VALIDATION_ERROR', 'BAD_REQUEST'].includes(details.validationCode) &&
    ['CONFLICT'].includes(details.conflictCode) ;

  addSection('errorHandling', pass, details);
}

function finalize() {
  const failedSections = Object.entries(report.sections)
    .filter(([, section]) => !section.pass)
    .map(([name]) => name);

  if (failedSections.length > 0) {
    for (const section of failedSections) {
      addCritical(`Section failed: ${section}`);
    }
  }

  if (!report.sections.events?.details?.lowStockNotificationPersistence) {
    addImprovement('Add persistent notification outbox/table for stock.low and reservation.created listener observability.');
  }

  addRecommendation('Keep Prisma client and schema tooling upgraded; package.json prisma config is deprecated for Prisma 7.');
  addRecommendation('Add a dedicated automated token-expiration test using short-lived JWT in CI.');
  addRecommendation('Add contract tests that diff runtime responses vs /docs-json schemas on CI.');

  report.readyForFrontendIntegration = failedSections.length === 0;
  report.finishedAt = new Date().toISOString();
}

async function main() {
  await collectEndpointInventory();
  const ctx = await authAndRoleTests();
  await endpointTests(ctx);
  await dbIntegrityChecks();
  await eventChecks(ctx);
  await fullUserFlow(ctx);
  await swaggerChecks();
  await performanceChecks(ctx);
  await errorHandlingChecks(ctx);
  finalize();

  console.log(JSON.stringify(report, null, 2));
}

main()
  .catch((error) => {
    console.error('QA_FULL_VALIDATION_FAILED', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
