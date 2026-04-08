const baseUrl = process.env.API_BASE_URL ?? 'http://localhost:3000';
const email = process.env.SMOKE_EMAIL ?? `smoke.${Date.now()}@example.com`;
const password = process.env.SMOKE_PASSWORD ?? 'Smoke123!';

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });

  const text = await response.text();
  let body;

  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }

  return { response, body };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  console.log(`Running orders smoke test against ${baseUrl}`);

  const registerPayload = {
    email,
    fullName: 'Orders Smoke User',
    password,
    role: 'CLIENT',
  };

  const registerResult = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(registerPayload),
  });

  assert(
    [201, 409].includes(registerResult.response.status),
    `Register failed with status ${registerResult.response.status}`,
  );

  const loginResult = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  assert(loginResult.response.status === 200, 'Login request failed');
  assert(loginResult.body.accessToken, 'Login did not return accessToken');

  const token = loginResult.body.accessToken;
  const authHeaders = { Authorization: `Bearer ${token}` };

  const menuResult = await request('/menu/items?availableOnly=true');
  assert(menuResult.response.status === 200, 'Menu endpoint failed');
  assert(Array.isArray(menuResult.body), 'Menu payload is not an array');
  assert(menuResult.body.length > 0, 'No available menu items found for test');

  const menuItemId = menuResult.body[0].id;

  const addCartResult = await request('/orders/cart/items', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ menuItemId, quantity: 1 }),
  });
  assert(addCartResult.response.status === 201, 'Add to cart failed');

  const cartResult = await request('/orders/cart', {
    method: 'GET',
    headers: authHeaders,
  });
  assert(cartResult.response.status === 200, 'Get cart failed');

  const placeOrderResult = await request('/orders', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      orderType: 'DELIVERY',
      notes: 'Automated orders smoke test',
    }),
  });

  assert(placeOrderResult.response.status === 201, 'Place order failed');
  assert(placeOrderResult.body.id, 'Order response missing id');

  const historyResult = await request('/orders/history', {
    method: 'GET',
    headers: authHeaders,
  });

  assert(historyResult.response.status === 200, 'Order history request failed');
  assert(Array.isArray(historyResult.body), 'Order history payload is not array');

  const containsCreatedOrder = historyResult.body.some(
    (order) => order.id === placeOrderResult.body.id,
  );
  assert(containsCreatedOrder, 'Created order not found in order history');

  console.log(`ORDERS_SMOKE_OK orderId=${placeOrderResult.body.id}`);
}

main().catch((error) => {
  console.error(`ORDERS_SMOKE_FAIL ${error.message}`);
  process.exitCode = 1;
});
