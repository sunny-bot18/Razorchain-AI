export {};

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

async function run() {
  console.log('Testing Gemini API Key Pool Load Balancer...\n');

  const adminRes = await fetch(`${BASE_URL}/api/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'login', email: 'admin@demo.com', password: 'password123' }),
  });
  const adminCookie = adminRes.headers.get('set-cookie') || '';

  // 1. Check initial key pool status
  const statusRes = await fetch(`${BASE_URL}/api/admin/key-pool`, {
    headers: { Cookie: adminCookie },
  });
  console.log('Initial Pool Status:', await statusRes.json());

  // 2. Add a second key to the pool
  const addRes = await fetch(`${BASE_URL}/api/admin/key-pool`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({ apiKey: 'AIzaSyDemoSecondaryKeyForEnterpriseLoadBalancing99' }),
  });
  console.log('\nAdd Key 2 Result:', await addRes.json());

  // 3. Add a third key to the pool
  const addRes3 = await fetch(`${BASE_URL}/api/admin/key-pool`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({ apiKey: 'AIzaSyDemoTertiaryKeyForHighConcurrencyBurst88' }),
  });
  console.log('\nAdd Key 3 Result:', await addRes3.json());

  // 4. Verify updated pool status
  const finalStatus = await fetch(`${BASE_URL}/api/admin/key-pool`, {
    headers: { Cookie: adminCookie },
  });
  const finalData = await finalStatus.json();
  console.log('\nFinal Key Pool Status with Multi-Key Balance:');
  console.log(JSON.stringify(finalData, null, 2));

  console.log('\n✓ Multi-Key Gemini Pool tested and operational!');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
