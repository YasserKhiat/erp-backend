const BASE_URL = process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:3000';

async function assertEndpoint(path, expectedStatus = 200) {
  const response = await fetch(`${BASE_URL}${path}`);
  if (response.status !== expectedStatus) {
    throw new Error(
      `Unexpected status for ${path}. Expected ${expectedStatus}, got ${response.status}`,
    );
  }
  return response;
}

async function run() {
  const health = await assertEndpoint('/health', 200);
  const healthBody = await health.json();

  if (healthBody?.status !== 'ok') {
    throw new Error('Health endpoint returned invalid payload');
  }

  await assertEndpoint('/docs', 200);

  console.log('Smoke tests passed');
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
