import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const base = 'http://localhost:3000';

async function req(method, path, { token, body } = {}) {
  const response = await fetch(base + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { raw: text };
  }

  return { status: response.status, payload };
}

function unwrap(payload) {
  if (payload && payload.success === true && Object.prototype.hasOwnProperty.call(payload, 'data')) {
    return payload.data;
  }
  return payload;
}

async function login(email, password) {
  const r = await req('POST', '/auth/login', { body: { email, password } });
  return unwrap(r.payload);
}

async function main() {
  const manager = await login('manager@restaurant.local', 'Manager123!');
  const client = await login('client@restaurant.local', 'Client123!');

  const menu = unwrap((await req('GET', '/menu?availableOnly=true')).payload);
  const item = menu[0];

  const fav = await req('POST', '/clients/me/favorites', {
    token: client.accessToken,
    body: { menuItemId: item.id },
  });
  console.log('favorites', fav.status, fav.payload.error ?? 'OK');

  const ingCreate = await req('POST', '/inventory/ingredients', {
    token: manager.accessToken,
    body: {
      name: `QAIng-${Date.now()}`,
      unit: 'pcs',
      minStockLevel: 1,
    },
  });
  console.log('inventory_create', ingCreate.status, ingCreate.payload.error ?? 'OK', ingCreate.payload.message ?? '');

  const ingredients = unwrap((await req('GET', '/ingredients', { token: manager.accessToken })).payload);
  const ingredient = ingredients[0];
  const move = await req('POST', '/inventory/movements', {
    token: manager.accessToken,
    body: {
      ingredientId: ingredient.id,
      type: 'IN',
      quantity: 1,
      reason: 'QA retest',
    },
  });
  console.log('inventory_movement', move.status, move.payload.error ?? 'OK');

  const loyaltyAdjust = await req('POST', '/loyalty/adjust', {
    token: manager.accessToken,
    body: {
      userId: client.user.id,
      pointsDelta: 1,
      reason: 'QA retest',
    },
  });
  console.log('loyalty_adjust', loyaltyAdjust.status, loyaltyAdjust.payload.error ?? 'OK');

  const tables = unwrap((await req('GET', '/tables', { token: manager.accessToken })).payload);
  let table = tables.find((t) => t.status === 'AVAILABLE') ?? tables[0];
  if (table.status !== 'AVAILABLE') {
    await req('PATCH', `/tables/${table.id}/status`, {
      token: manager.accessToken,
      body: { status: 'AVAILABLE' },
    });
  }

  await req('POST', '/orders/cart/clear', { token: client.accessToken });
  const add = await req('POST', '/orders/cart/items', {
    token: client.accessToken,
    body: { menuItemId: item.id, quantity: 1 },
  });
  console.log('cart_add', add.status, add.payload.error ?? 'OK');

  const order = await req('POST', '/orders', {
    token: client.accessToken,
    body: { orderType: 'DINE_IN', tableId: table.id, notes: 'QA retest order' },
  });
  const orderData = unwrap(order.payload);
  console.log('order_create', order.status, order.payload.error ?? 'OK');

  const day = new Date();
  day.setHours(0, 0, 0, 0);
  const beforeDaily = await prisma.dailyStat.findUnique({ where: { date: day } });

  if (orderData?.id) {
    for (const status of ['PREPARING', 'READY', 'SERVED', 'BILLED', 'COMPLETED']) {
      await req('PATCH', `/orders/${orderData.id}/status`, {
        token: manager.accessToken,
        body: { status },
      });
    }

    await req('POST', '/payments', {
      token: manager.accessToken,
      body: { orderId: orderData.id, amount: Number(orderData.total), method: 'CARD' },
    });

    await new Promise((resolve) => setTimeout(resolve, 1800));
  }

  const afterDaily = await prisma.dailyStat.findUnique({ where: { date: day } });
  console.log('daily_revenue_before_after', Number(beforeDaily?.totalRevenue ?? 0), Number(afterDaily?.totalRevenue ?? 0));

  const start = new Date(Date.now() + 72 * 3600 * 1000);
  const end = new Date(start.getTime() + 3600 * 1000);
  const r1 = await req('POST', '/reservations', {
    token: client.accessToken,
    body: {
      tableId: table.id,
      guestCount: 2,
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      notes: 'conflict-one',
    },
  });
  const r2 = await req('POST', '/reservations', {
    token: client.accessToken,
    body: {
      tableId: table.id,
      guestCount: 2,
      startAt: new Date(start.getTime() + 15 * 60 * 1000).toISOString(),
      endAt: new Date(end.getTime() - 15 * 60 * 1000).toISOString(),
      notes: 'conflict-two',
    },
  });
  console.log('reservation_conflict', r1.status, r2.status, r2.payload.error ?? '');

  const forbidden = await req('GET', '/dashboard/overview', { token: client.accessToken });
  console.log('forbidden_code', forbidden.payload.error);
}

main()
  .catch((err) => {
    console.error('QA_RETEST_FAIL', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
