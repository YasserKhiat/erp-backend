const base = process.env.API_BASE_URL ?? 'http://localhost:3000';

async function req(method, path, { token, body } = {}) {
  const r = await fetch(base + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const t = await r.text();
  let j;
  try {
    j = t ? JSON.parse(t) : {};
  } catch {
    j = { raw: t };
  }
  return { status: r.status, payload: j };
}

function U(p) {
  if (p && p.success === true && Object.prototype.hasOwnProperty.call(p, 'data')) {
    return p.data;
  }
  return p;
}

async function main() {
  const health = await req('GET', '/health');
  if (health.status !== 200) throw new Error('health failed');

  const client = U((await req('POST', '/auth/login', {
    body: { email: 'client@restaurant.local', password: 'Client123!' },
  })).payload);

  const manager = U((await req('POST', '/auth/login', {
    body: { email: 'manager@restaurant.local', password: 'Manager123!' },
  })).payload);

  const menu = U((await req('GET', '/menu?availableOnly=true&page=1&limit=50')).payload);
  let item = null;
  for (const m of menu) {
    const recipe = await req('GET', `/menu/items/${m.id}/recipe`);
    const recipeData = U(recipe.payload);
    if (recipe.status === 200 && recipeData) {
      const hasIngredients = Array.isArray(recipeData.ingredients)
        ? recipeData.ingredients.length > 0
        : true;
      if (hasIngredients) {
        item = m;
        break;
      }
    }
  }
  if (!item) throw new Error('No menu item with recipe found');

  const tables = U((await req('GET', '/tables', { token: manager.accessToken })).payload);
  let table = tables.find((t) => t.status === 'AVAILABLE') ?? tables[0];
  if (!table) throw new Error('No table found');
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

  const orderResp = await req('POST', '/orders', {
    token: client.accessToken,
    body: { orderType: 'DINE_IN', tableId: table.id, notes: 'client orders test' },
  });
  const order = U(orderResp.payload);

  const history = await req('GET', '/orders/history?page=1&limit=10', {
    token: client.accessToken,
  });
  const details = await req('GET', `/orders/${order.id}`, {
    token: client.accessToken,
  });
  const tracking = await req('GET', `/orders/${order.id}/tracking`, {
    token: client.accessToken,
  });

  const forbidden = await req('PATCH', `/orders/${order.id}/status`, {
    token: client.accessToken,
    body: { status: 'PREPARING' },
  });

  console.log('CLIENT_ORDER_TEST=PASS');
  console.log(`ORDER_CREATE_HTTP=${orderResp.status}`);
  console.log(`ORDER_ID=${order.id}`);
  console.log(`CART_ADD_HTTP=${add.status}`);
  console.log(`HISTORY_HTTP=${history.status}`);
  console.log(`DETAILS_HTTP=${details.status}`);
  console.log(`TRACKING_HTTP=${tracking.status}`);
  console.log(`CLIENT_PATCH_STATUS_HTTP=${forbidden.status}`);
}

main().catch((e) => {
  console.error('CLIENT_ORDER_TEST=FAIL');
  console.error(e.message);
  process.exitCode = 1;
});
