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
  console.log(`Smoke test base URL: ${baseUrl}`);

  const health = await request('/health');
  assert(health.response.status === 200, `GET /health failed: ${health.response.status}`);
  assert(health.body.database === 'connected', 'GET /health did not report database=connected');

  const register = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email,
      fullName: 'Smoke Test User',
      password,
      role: 'CLIENT',
    }),
  });
  assert([200, 201].includes(register.response.status), `POST /auth/register failed: ${register.response.status}`);

  const login = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  assert(login.response.status === 200, `POST /auth/login failed: ${login.response.status}`);
  assert(Boolean(login.body.accessToken), 'POST /auth/login returned no access token');

  const menu = await request('/menu?availableOnly=true');
  assert(menu.response.status === 200, `GET /menu failed: ${menu.response.status}`);
  assert(Array.isArray(menu.body), 'GET /menu should return an array');

  const categories = await request('/categories');
  assert(categories.response.status === 200, `GET /categories failed: ${categories.response.status}`);
  assert(Array.isArray(categories.body), 'GET /categories should return an array');

  const cart = await request('/orders/cart', {
    headers: {
      Authorization: `Bearer ${login.body.accessToken}`,
    },
  });
  assert(cart.response.status === 200, `GET /orders/cart failed: ${cart.response.status}`);

  console.log('SMOKE_TEST_OK');
}

main().catch((error) => {
  console.error(`SMOKE_TEST_FAIL ${error.message}`);
  process.exitCode = 1;
});
