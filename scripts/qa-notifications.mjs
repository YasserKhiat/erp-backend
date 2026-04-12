const base = process.env.API_BASE_URL ?? 'http://localhost:3000';

async function req(method, path, { token, body } = {}) {
  const response = await fetch(`${base}${path}`, {
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

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function login(email, password) {
  const result = await req('POST', '/auth/login', {
    body: { email, password },
  });
  assert(result.status === 200, `Login failed for ${email}: ${result.status}`);
  return unwrap(result.payload);
}

async function registerAndLogin(role) {
  const email = `notif.${role.toLowerCase()}.${Date.now()}-${Math.floor(Math.random() * 1000)}@example.com`;
  const password = 'Notif123!';

  const register = await req('POST', '/auth/register', {
    body: {
      email,
      fullName: `Notifications ${role}`,
      password,
      role,
    },
  });

  assert(
    register.status === 201 || register.status === 200,
    `Register failed for ${role}: ${register.status}`,
  );

  return login(email, password);
}

async function main() {
  const client = await registerAndLogin('CLIENT');
  const manager = await registerAndLogin('MANAGER');
  const admin = await registerAndLogin('ADMIN');

  const secondClientEmail = `notif.test.${Date.now()}@example.com`;
  const secondClientPassword = 'Client123!';
  const registerSecond = await req('POST', '/auth/register', {
    body: {
      email: secondClientEmail,
      fullName: 'Notification Isolation User',
      password: secondClientPassword,
      role: 'CLIENT',
    },
  });
  assert(
    registerSecond.status === 201 || registerSecond.status === 200,
    `Failed to register second client: ${registerSecond.status}`,
  );
  const secondClient = await login(secondClientEmail, secondClientPassword);

  let availability = null;
  let availabilityStart = null;
  let availabilityEnd = null;

  for (let i = 2; i <= 30; i += 2) {
    const candidateStart = new Date(Date.now() + i * 60 * 60 * 1000);
    const candidateEnd = new Date(candidateStart.getTime() + 60 * 60 * 1000);

    const availabilityRes = await req(
      'GET',
      `/reservations/availability?startAt=${encodeURIComponent(candidateStart.toISOString())}&endAt=${encodeURIComponent(candidateEnd.toISOString())}&guestCount=2`,
      { token: client.accessToken },
    );

    assert(availabilityRes.status === 200, `Availability failed: ${availabilityRes.status}`);

    const payload = unwrap(availabilityRes.payload);
    if (Array.isArray(payload.availableTables) && payload.availableTables.length > 0) {
      availability = payload;
      availabilityStart = candidateStart;
      availabilityEnd = candidateEnd;
      break;
    }
  }

  assert(Boolean(availability), 'No available tables found for reservation test');

  const reservationRes = await req('POST', '/reservations', {
    token: client.accessToken,
    body: {
      tableId: availability.availableTables[0].id,
      guestCount: 2,
      startAt: availabilityStart.toISOString(),
      endAt: availabilityEnd.toISOString(),
      notes: 'qa notifications flow',
    },
  });
  assert([200, 201].includes(reservationRes.status), `Reservation create failed: ${reservationRes.status}`);

  await req('POST', '/orders/cart/clear', { token: client.accessToken });

  const menuRes = await req('GET', '/menu?availableOnly=true&page=1&limit=20');
  assert(menuRes.status === 200, `Menu list failed: ${menuRes.status}`);
  const menu = unwrap(menuRes.payload);
  assert(Array.isArray(menu) && menu.length > 0, 'No menu items available');

  const addCartRes = await req('POST', '/orders/cart/items', {
    token: client.accessToken,
    body: {
      menuItemId: menu[0].id,
      quantity: 1,
    },
  });
  assert([200, 201].includes(addCartRes.status), `Add to cart failed: ${addCartRes.status}`);

  const orderRes = await req('POST', '/orders', {
    token: client.accessToken,
    body: {
      orderType: 'TAKEAWAY',
      notes: 'qa notifications flow',
    },
  });
  assert([200, 201].includes(orderRes.status), `Order create failed: ${orderRes.status}`);
  const order = unwrap(orderRes.payload);

  const paymentRes = await req('POST', '/payments', {
    token: manager.accessToken,
    body: {
      orderId: order.id,
      amount: Number(order.total),
      method: 'CASH',
      transactionRef: `qa-${Date.now()}`,
    },
  });
  assert([200, 201].includes(paymentRes.status), `Payment create failed: ${paymentRes.status}`);

  const ingredientsRes = await req('GET', '/ingredients', { token: manager.accessToken });
  assert(ingredientsRes.status === 200, `Ingredients list failed: ${ingredientsRes.status}`);
  const ingredients = unwrap(ingredientsRes.payload);
  const lowStockCandidate = ingredients.find((item) => {
    const current = Number(item.inventory?.currentStock ?? 0);
    const min = Number(item.minStockLevel ?? 0);
    return current > 0 && current > min;
  });
  assert(Boolean(lowStockCandidate), 'No ingredient candidate found to trigger stock.low');

  const currentStock = Number(lowStockCandidate.inventory.currentStock);
  const minStockLevel = Number(lowStockCandidate.minStockLevel);
  const outQty = Math.max(1, Math.floor(currentStock - minStockLevel + 1));

  const stockMoveRes = await req('POST', '/inventory/movements', {
    token: manager.accessToken,
    body: {
      ingredientId: lowStockCandidate.id,
      type: 'OUT',
      quantity: outQty,
      reason: 'qa notifications low stock trigger',
    },
  });
  assert([200, 201].includes(stockMoveRes.status), `Inventory movement failed: ${stockMoveRes.status}`);

  const clientNotifRes = await req('GET', '/notifications/me?page=1&limit=50', {
    token: client.accessToken,
  });
  assert(clientNotifRes.status === 200, `Client notifications fetch failed: ${clientNotifRes.status}`);
  const clientNotifs = unwrap(clientNotifRes.payload);

  const managerNotifRes = await req('GET', '/notifications/me?page=1&limit=50', {
    token: manager.accessToken,
  });
  assert(managerNotifRes.status === 200, `Manager notifications fetch failed: ${managerNotifRes.status}`);
  const managerNotifs = unwrap(managerNotifRes.payload);

  const adminNotifRes = await req('GET', '/notifications/me?page=1&limit=50', {
    token: admin.accessToken,
  });
  assert(adminNotifRes.status === 200, `Admin notifications fetch failed: ${adminNotifRes.status}`);
  const adminNotifs = unwrap(adminNotifRes.payload);

  const clientTypes = new Set(clientNotifs.map((n) => n.type));
  const managerTypes = new Set(managerNotifs.map((n) => n.type));
  const adminTypes = new Set(adminNotifs.map((n) => n.type));

  assert(clientTypes.has('ORDER'), 'Client missing ORDER notification');
  assert(clientTypes.has('PAYMENT'), 'Client missing PAYMENT notification');
  assert(clientTypes.has('RESERVATION'), 'Client missing RESERVATION notification');
  assert(clientTypes.has('LOYALTY'), 'Client missing LOYALTY notification');

  assert(managerTypes.has('ORDER'), 'Manager missing ORDER notification');
  assert(managerTypes.has('PAYMENT'), 'Manager missing PAYMENT notification');
  assert(managerTypes.has('RESERVATION'), 'Manager missing RESERVATION notification');
  assert(managerTypes.has('STOCK'), 'Manager missing STOCK notification');

  assert(adminTypes.has('PAYMENT'), 'Admin missing PAYMENT notification');
  assert(adminTypes.has('STOCK'), 'Admin missing STOCK notification');

  const unreadBeforeRes = await req('GET', '/notifications/me/unread-count', {
    token: client.accessToken,
  });
  assert(unreadBeforeRes.status === 200, `Unread count failed: ${unreadBeforeRes.status}`);
  const unreadBefore = unwrap(unreadBeforeRes.payload).count;
  assert(unreadBefore > 0, 'Expected unread count > 0 for client');

  const firstClientNotifId = clientNotifs[0]?.id;
  assert(Boolean(firstClientNotifId), 'No client notification found to mark as read');

  const markOneRes = await req('PATCH', `/notifications/${firstClientNotifId}/read`, {
    token: client.accessToken,
  });
  assert(markOneRes.status === 200, `Mark one read failed: ${markOneRes.status}`);

  const unreadAfterOneRes = await req('GET', '/notifications/me/unread-count', {
    token: client.accessToken,
  });
  assert(unreadAfterOneRes.status === 200, `Unread count after mark one failed: ${unreadAfterOneRes.status}`);
  const unreadAfterOne = unwrap(unreadAfterOneRes.payload).count;
  assert(unreadAfterOne <= unreadBefore - 1, 'Unread count did not decrease after mark one read');

  const markAllRes = await req('PATCH', '/notifications/me/read-all', {
    token: client.accessToken,
  });
  assert(markAllRes.status === 200, `Mark all read failed: ${markAllRes.status}`);

  const unreadAfterAllRes = await req('GET', '/notifications/me/unread-count', {
    token: client.accessToken,
  });
  assert(unreadAfterAllRes.status === 200, `Unread count after mark all failed: ${unreadAfterAllRes.status}`);
  const unreadAfterAll = unwrap(unreadAfterAllRes.payload).count;
  assert(unreadAfterAll === 0, 'Unread count expected to be 0 after mark-all');

  const crossUserRes = await req('PATCH', `/notifications/${firstClientNotifId}/read`, {
    token: secondClient.accessToken,
  });
  assert(
    crossUserRes.status === 404 || crossUserRes.status === 403,
    `Cross-user access should be blocked, got ${crossUserRes.status}`,
  );

  console.log('NOTIFICATIONS_QA_OK');
  console.log(`ORDER_ID=${order.id}`);
  console.log(`RESERVATION_HTTP=${reservationRes.status}`);
  console.log(`PAYMENT_HTTP=${paymentRes.status}`);
  console.log(`STOCK_LOW_HTTP=${stockMoveRes.status}`);
  console.log(`CROSS_USER_BLOCK_HTTP=${crossUserRes.status}`);
}

main().catch((error) => {
  console.error('NOTIFICATIONS_QA_FAIL');
  console.error(error.message);
  process.exitCode = 1;
});
