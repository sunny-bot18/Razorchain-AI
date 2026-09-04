import http from 'http';

export {};

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const TOTAL_MEMBERS = 20000;
const CONCURRENT_PIPELINES = 400; // 400 active parallel connection workers

interface Stats {
  min: number;
  max: number;
  avg: number;
  p50: number;
  p90: number;
  p95: number;
  p99: number;
}

function calculateStats(latencies: number[]): Stats {
  if (latencies.length === 0) return { min: 0, max: 0, avg: 0, p50: 0, p90: 0, p95: 0, p99: 0 };
  const sorted = [...latencies].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const getP = (p: number) => sorted[Math.floor(sorted.length * p)] || sorted[sorted.length - 1];

  return {
    min: Math.round(sorted[0]),
    max: Math.round(sorted[sorted.length - 1]),
    avg: Math.round(sum / sorted.length),
    p50: Math.round(getP(0.50)),
    p90: Math.round(getP(0.90)),
    p95: Math.round(getP(0.95)),
    p99: Math.round(getP(0.99)),
  };
}

const httpAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 600,
  maxFreeSockets: 150,
  timeout: 15000,
});

async function run20000AiVerificationTest() {
  console.log('================================================================');
  console.log('  RazorChain AI — 20,000 Member Load & AI Verification Benchmark');
  console.log(`  Target: ${BASE_URL}`);
  console.log(`  Simulated Members:      ${TOTAL_MEMBERS.toLocaleString()}`);
  console.log(`  Active Worker Threads:  ${CONCURRENT_PIPELINES} simultaneous connections`);
  console.log('================================================================\n');

  // 1. Authenticate sessions
  const [buyerAuth, sellerAuth] = await Promise.all([
    fetch(`${BASE_URL}/api/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'login', email: 'buyer@demo.com', password: 'password123' }),
    }),
    fetch(`${BASE_URL}/api/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'login', email: 'seller@demo.com', password: 'password123' }),
    }),
  ]);

  const buyerCookie = buyerAuth.headers.get('set-cookie') || '';
  const sellerCookie = sellerAuth.headers.get('set-cookie') || '';
  const sellerData = await sellerAuth.json();
  const sellerId = sellerData.user.id;

  // 2. Set up pre-verified candidate pool for AI verification
  console.log('Preparing transaction candidates with uploaded documents for AI verification...');
  const poolTxIds: string[] = [];
  const POOL_SIZE = 15;

  for (let i = 0; i < POOL_SIZE; i++) {
    const txRes = await fetch(`${BASE_URL}/api/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: buyerCookie },
      body: JSON.stringify({
        sellerId,
        poNumber: `PO-AI20K-${Date.now()}-${i}`,
        productDescription: `Aerospace Grade Titanium Fasteners Lot #${i + 1}`,
        quantity: 100,
        amount: 75000,
        deliveryAddress: 'Bengaluru Tech Park Hub Gate 4',
        expectedDeliveryDate: new Date(Date.now() + 86400000 * 7).toISOString(),
      }),
    });
    const txData = await txRes.json();
    const id = txData.transaction.id;
    poolTxIds.push(id);

    await fetch(`${BASE_URL}/api/transactions/${id}/reserve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: buyerCookie },
    });

    const docText = `DELIVERY CHALLAN & INSPECTION PROOF
Reference PO: PO-AI20K-${Date.now()}-${i}
Delivered: 100 units Aerospace Titanium Fasteners
Destination: Bengaluru Tech Park Hub Gate 4
Receiver Signature: [Confirmed & Stamped]`;
    const form = new FormData();
    form.append('files', new Blob([`${docText}\nUniqueNonce: ${Math.random()}`], { type: 'text/plain' }), `proof_${i}.txt`);
    await fetch(`${BASE_URL}/api/transactions/${id}/documents`, {
      method: 'POST',
      headers: { Cookie: sellerCookie },
      body: form,
    });
  }
  console.log(`✓ ${POOL_SIZE} Transaction escrow targets prepared and staged.\n`);

  // 3. Launch 20,000 member multi-user concurrent traffic
  // Ratio: 90% platform access (queries, transactions, dashboards) + 10% heavy AI verification calls
  const allLatencies: number[] = [];
  const aiVerificationLatencies: number[] = [];
  let totalSuccess = 0;
  let totalFailures = 0;
  let aiVerificationSuccess = 0;
  let aiVerificationFailures = 0;

  const testStartTime = performance.now();
  let lastReport = testStartTime;
  let completed = 0;

  async function executeMemberAction(memberId: number): Promise<void> {
    const isAiVerification = memberId % 10 === 0; // 1 in every 10 member operations triggers AI Verification
    const t0 = performance.now();

    return new Promise((resolve) => {
      let reqOptions: http.RequestOptions;
      const headers: Record<string, string> = {
        'User-Agent': `RazorChain-Member/${memberId}`,
        'Connection': 'keep-alive',
      };

      if (isAiVerification) {
        const targetTxId = poolTxIds[memberId % poolTxIds.length];
        const url = new URL(`${BASE_URL}/api/transactions/${targetTxId}/verify`);
        headers['Content-Type'] = 'application/json';
        headers['Cookie'] = buyerCookie;
        reqOptions = {
          hostname: url.hostname,
          port: url.port || 3000,
          path: url.pathname,
          method: 'POST',
          agent: httpAgent,
          headers,
          timeout: 15000,
        };
      } else {
        const paths = ['/', '/buyer', '/api/transactions', '/login', '/api/lender/portfolio'];
        const path = paths[memberId % paths.length];
        const url = new URL(`${BASE_URL}${path}`);
        if (path !== '/' && path !== '/login') {
          headers['Cookie'] = buyerCookie;
        }
        reqOptions = {
          hostname: url.hostname,
          port: url.port || 3000,
          path: url.pathname + url.search,
          method: 'GET',
          agent: httpAgent,
          headers,
          timeout: 15000,
        };
      }

      const req = http.request(reqOptions, (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          const duration = performance.now() - t0;
          allLatencies.push(duration);
          if (isAiVerification) {
            aiVerificationLatencies.push(duration);
          }

          const isOk = (res.statusCode || 0) >= 200 && (res.statusCode || 0) < 400;
          if (isOk) {
            totalSuccess++;
            if (isAiVerification) aiVerificationSuccess++;
          } else {
            totalFailures++;
            if (isAiVerification) aiVerificationFailures++;
          }

          completed++;
          if (completed % 4000 === 0 || completed === TOTAL_MEMBERS) {
            const now = performance.now();
            const chunkRps = (4000 / ((now - lastReport) / 1000)).toFixed(1);
            const pct = ((completed / TOTAL_MEMBERS) * 100).toFixed(0);
            console.log(`  [Progress ${pct}%] ${completed.toLocaleString()}/${TOTAL_MEMBERS.toLocaleString()} operations | Current Throughput: ${chunkRps} req/sec`);
            lastReport = now;
          }
          resolve();
        });
      });

      req.on('error', () => {
        totalFailures++;
        if (isAiVerification) aiVerificationFailures++;
        completed++;
        resolve();
      });

      req.on('timeout', () => {
        req.destroy();
        totalFailures++;
        if (isAiVerification) aiVerificationFailures++;
        completed++;
        resolve();
      });

      req.end();
    });
  }

  let queueIndex = 0;
  async function worker() {
    while (queueIndex < TOTAL_MEMBERS) {
      const idx = queueIndex++;
      await executeMemberAction(idx);
    }
  }

  console.log(`Dispatching ${TOTAL_MEMBERS.toLocaleString()} member requests across ${CONCURRENT_PIPELINES} concurrent pipelines...\n`);
  const workers = Array.from({ length: CONCURRENT_PIPELINES }).map(() => worker());
  await Promise.all(workers);

  const totalTimeSec = (performance.now() - testStartTime) / 1000;
  const overallRps = TOTAL_MEMBERS / totalTimeSec;
  const aiStats = calculateStats(aiVerificationLatencies);
  const overallStats = calculateStats(allLatencies);

  console.log('\n================================================================');
  console.log('  20,000 MEMBER TRAFFIC & AI VERIFICATION PERFORMANCE REPORT');
  console.log('================================================================');
  console.log(`  Total Member Requests:            ${TOTAL_MEMBERS.toLocaleString()}`);
  console.log(`  Total Time to Serve 20,000:       ${totalTimeSec.toFixed(2)} seconds`);
  console.log(`  Overall System Throughput:        ${overallRps.toFixed(1)} requests/second`);
  console.log(`  Total Platform Success Rate:      ${((totalSuccess / TOTAL_MEMBERS) * 100).toFixed(2)}% (${totalSuccess}/${TOTAL_MEMBERS})`);
  console.log('----------------------------------------------------------------');
  console.log('  AI VERIFICATION SUB-METRICS UNDER 20,000 MEMBER LOAD:');
  console.log(`  • AI Verification Calls Executed: ${aiVerificationLatencies.length.toLocaleString()}`);
  console.log(`  • AI Verification Success Rate:   ${((aiVerificationSuccess / aiVerificationLatencies.length) * 100).toFixed(2)}% (${aiVerificationSuccess}/${aiVerificationLatencies.length})`);
  console.log(`  • AI Verification Throughput:     ${(aiVerificationLatencies.length / totalTimeSec).toFixed(1)} AI runs/second`);
  console.log('  • Response Time (Latency) Breakdown for AI Verification:');
  console.log(`      - Min Response Time:          ${aiStats.min} ms`);
  console.log(`      - Median (p50):               ${aiStats.p50} ms`);
  console.log(`      - Average Response Time:      ${aiStats.avg} ms`);
  console.log(`      - 90th Percentile (p90):      ${aiStats.p90} ms`);
  console.log(`      - 95th Percentile (p95):      ${aiStats.p95} ms`);
  console.log(`      - 99th Percentile (p99):      ${aiStats.p99} ms`);
  console.log(`      - Max Response Time:          ${aiStats.max} ms`);
  console.log('----------------------------------------------------------------');
  console.log('  OVERALL PLATFORM LATENCY (ALL 20,000 REQUESTS):');
  console.log(`    - Median (p50):                 ${overallStats.p50} ms`);
  console.log(`    - Average:                      ${overallStats.avg} ms`);
  console.log(`    - 95th Percentile (p95):        ${overallStats.p95} ms`);
  console.log('================================================================\n');

  httpAgent.destroy();
}

run20000AiVerificationTest().catch((err) => {
  console.error('Fatal 20k test error:', err);
  process.exit(1);
});
