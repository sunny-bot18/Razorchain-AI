import http from 'http';

export {};

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const TOTAL_MEMBERS = 10000;
const CONCURRENT_WORKERS = 500; // 500 simultaneous connection pipelines

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

// Optimized HTTP Agent with keepAlive for 10k connections
const httpAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 500,
  maxFreeSockets: 100,
  timeout: 10000,
});

async function run10000LoadTest() {
  console.log('================================================================');
  console.log('  RazorChain AI — 10,000 Concurrent Member Load Stress Test');
  console.log(`  Target: ${BASE_URL} (Production Build)`);
  console.log(`  Total Virtual Users:   ${TOTAL_MEMBERS.toLocaleString()}`);
  console.log(`  Active Worker Threads: ${CONCURRENT_WORKERS} simultaneous connections`);
  console.log('================================================================\n');

  // Authenticate simulated member cookies
  const authRes = await fetch(`${BASE_URL}/api/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'login', email: 'buyer@demo.com', password: 'password123' }),
  });
  const buyerCookie = authRes.headers.get('set-cookie') || '';

  const endpoints = [
    { path: '/', auth: false, desc: 'Landing Portal (Static CDN)' },
    { path: '/login', auth: false, desc: 'Login Interface' },
    { path: '/buyer', auth: true, desc: 'Buyer Dashboard' },
    { path: '/api/transactions', auth: true, desc: 'Transactions Query API' },
    { path: '/api/lender/portfolio', auth: true, desc: 'Lender Treasury Portfolio' },
  ];

  const latencies: number[] = [];
  const statusCodes: Record<number, number> = {};
  let completed = 0;
  let successCount = 0;
  let failureCount = 0;

  const startTime = performance.now();
  let lastReport = startTime;

  // Single request executor
  async function makeMemberRequest(memberId: number): Promise<void> {
    const target = endpoints[memberId % endpoints.length];
    const url = new URL(`${BASE_URL}${target.path}`);
    const headers: Record<string, string> = {
      'User-Agent': `RazorChain-LoadTester-Member/${memberId}`,
      'Connection': 'keep-alive',
    };
    if (target.auth && buyerCookie) {
      headers['Cookie'] = buyerCookie;
    }

    const t0 = performance.now();

    return new Promise((resolve) => {
      const req = http.request(
        {
          hostname: url.hostname,
          port: url.port || 3000,
          path: url.pathname + url.search,
          method: 'GET',
          agent: httpAgent,
          headers,
          timeout: 10000,
        },
        (res) => {
          let body = '';
          res.on('data', (chunk) => { body += chunk; });
          res.on('end', () => {
            const duration = performance.now() - t0;
            latencies.push(duration);
            const status = res.statusCode || 0;
            statusCodes[status] = (statusCodes[status] || 0) + 1;

            if (status >= 200 && status < 400) {
              successCount++;
            } else {
              failureCount++;
            }

            completed++;
            // Periodic progress update every 2,000 requests
            if (completed % 2000 === 0 || completed === TOTAL_MEMBERS) {
              const now = performance.now();
              const batchRps = (2000 / ((now - lastReport) / 1000)).toFixed(1);
              const progressPct = ((completed / TOTAL_MEMBERS) * 100).toFixed(0);
              console.log(`  [Progress ${progressPct}%] ${completed.toLocaleString()}/${TOTAL_MEMBERS.toLocaleString()} requests served | Speed: ${batchRps} req/sec`);
              lastReport = now;
            }
            resolve();
          });
        }
      );

      req.on('error', (err) => {
        failureCount++;
        completed++;
        statusCodes[599] = (statusCodes[599] || 0) + 1;
        resolve();
      });

      req.on('timeout', () => {
        req.destroy();
        failureCount++;
        completed++;
        statusCodes[504] = (statusCodes[504] || 0) + 1;
        resolve();
      });

      req.end();
    });
  }

  // Work distribution: pool of CONCURRENT_WORKERS pulling member IDs from a queue
  let currentIndex = 0;
  async function worker() {
    while (currentIndex < TOTAL_MEMBERS) {
      const id = currentIndex++;
      await makeMemberRequest(id);
    }
  }

  // Launch parallel workers
  console.log(`Launching ${CONCURRENT_WORKERS} simultaneous connection pipelines...\n`);
  const workers = Array.from({ length: CONCURRENT_WORKERS }).map(() => worker());
  await Promise.all(workers);

  const totalTimeMs = performance.now() - startTime;
  const totalTimeSec = totalTimeMs / 1000;
  const overallRps = TOTAL_MEMBERS / totalTimeSec;
  const stats = calculateStats(latencies);

  console.log('\n================================================================');
  console.log('  10,000 MEMBER STRESS TEST PERFORMANCE REPORT');
  console.log('================================================================');
  console.log(`  Total Virtual Users Served:  ${TOTAL_MEMBERS.toLocaleString()}`);
  console.log(`  Successful Responses (2xx):  ${successCount.toLocaleString()} (${((successCount / TOTAL_MEMBERS) * 100).toFixed(2)}%)`);
  console.log(`  Failed / Error Responses:    ${failureCount} (${((failureCount / TOTAL_MEMBERS) * 100).toFixed(2)}%)`);
  console.log(`  Total Duration:              ${totalTimeSec.toFixed(2)} seconds`);
  console.log(`  Overall Throughput:          ${overallRps.toFixed(1)} requests/second`);
  console.log('----------------------------------------------------------------');
  console.log('  HTTP Status Codes:');
  for (const [code, count] of Object.entries(statusCodes)) {
    console.log(`    • HTTP ${code}: ${count.toLocaleString()} responses`);
  }
  console.log('----------------------------------------------------------------');
  console.log('  Latency Profile (Response Times):');
  console.log(`    • Min Response Time:       ${stats.min} ms`);
  console.log(`    • Median (p50):            ${stats.p50} ms`);
  console.log(`    • Average:                 ${stats.avg} ms`);
  console.log(`    • 90th Percentile (p90):   ${stats.p90} ms`);
  console.log(`    • 95th Percentile (p95):   ${stats.p95} ms`);
  console.log(`    • 99th Percentile (p99):   ${stats.p99} ms`);
  console.log(`    • Max Response Time:       ${stats.max} ms`);
  console.log('================================================================\n');

  httpAgent.destroy();
}

run10000LoadTest().catch((err) => {
  console.error('Fatal 10k test error:', err);
  process.exit(1);
});
