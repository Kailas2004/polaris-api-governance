#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const screenshotDir = path.join(__dirname, '..', 'docs', 'screenshots');
const frontendUrl = `file://${path.join(__dirname, '..', 'frontend', 'dist', 'index.html')}`;

const loginResponse = {
  token: 'mock-token',
  user: { username: 'admin', roles: ['ADMIN', 'USER'], activeRole: 'ADMIN' }
};

const adminProfile = {
  globalStrategy: 'TOKEN_BUCKET',
  freePlanStrategy: 'SLIDING_WINDOW',
  proPlanStrategy: 'TOKEN_BUCKET'
};

const metricsSummary = [
  { plan: 'FREE', algorithm: 'SLIDING_WINDOW', allowed: 2200, blocked: 600, unauthorized: 5, total: 2805 },
  { plan: 'FREE', algorithm: 'TOKEN_BUCKET', allowed: 1540, blocked: 320, unauthorized: 3, total: 1863 },
  { plan: 'PRO', algorithm: 'SLIDING_WINDOW', allowed: 4200, blocked: 210, unauthorized: 2, total: 4412 },
  { plan: 'PRO', algorithm: 'TOKEN_BUCKET', allowed: 5100, blocked: 95, unauthorized: 1, total: 5196 }
];

const apiKeys = [
  { id: 'ab12-34cd', keyValue: 'sk_free_1', planType: 'FREE', active: true, createdAt: '2026-03-01T09:15:00Z' },
  { id: 'ef56-78gh', keyValue: 'sk_free_2', planType: 'FREE', active: false, createdAt: '2026-02-25T16:02:00Z' },
  { id: 'ij90-12kl', keyValue: 'sk_pro_1', planType: 'PRO', active: true, createdAt: '2026-01-18T12:34:00Z' },
  { id: 'mn34-56op', keyValue: 'sk_pro_2', planType: 'PRO', active: true, createdAt: '2026-02-05T13:44:00Z' },
  { id: 'qr78-90st', keyValue: 'sk_free_3', planType: 'FREE', active: true, createdAt: '2026-03-02T08:21:00Z' },
  { id: 'uv12-34wx', keyValue: 'sk_pro_3', planType: 'PRO', active: false, createdAt: '2025-12-30T10:12:00Z' }
];

const auditLogs = [
  {
    id: 'log-001',
    actor: 'admin',
    action: 'API_KEY_CREATE',
    resourceType: 'API_KEY',
    resourceId: 'ab12-34cd',
    details: 'Created FREE key for user testing',
    createdAt: '2026-03-02T11:02:15Z'
  },
  {
    id: 'log-002',
    actor: 'admin',
    action: 'STRATEGY_UPDATE',
    resourceType: 'GLOBAL_STRATEGY',
    resourceId: 'GLOBAL',
    details: 'Switched global strategy to TOKEN_BUCKET',
    createdAt: '2026-03-01T20:45:00Z'
  },
  {
    id: 'log-003',
    actor: 'admin',
    action: 'API_KEY_DEACTIVATE',
    resourceType: 'API_KEY',
    resourceId: 'ef56-78gh',
    details: 'Deactivated key after rotation',
    createdAt: '2026-02-26T08:17:33Z'
  }
];

const healthResponse = {
  status: 'UP',
  components: {
    redis: { status: 'UP' },
    db: { status: 'UP' }
  }
};

const strategyDebug = { global: 'TOKEN_BUCKET', FREE: 'SLIDING_WINDOW', PRO: 'TOKEN_BUCKET' };
const strategyCurrent = 'TOKEN_BUCKET';

const userProfile = {
  id: 'user-9876',
  planType: 'PRO',
  active: true,
  createdAt: '2026-02-14T09:00:00Z',
  currentStrategy: 'TOKEN_BUCKET'
};

const protectedResponses = [
  { status: 200, body: 'OK' },
  { status: 200, body: 'OK' },
  { status: 429, body: 'Too Many Requests' },
  { status: 401, body: 'Unauthorized' },
  { status: 200, body: 'OK' }
];

const ensureDirectory = () => {
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let protectedCallCounter = 0;

const formatRoute = async (route) => {
  const url = route.request().url();
  if (!url.startsWith('http://localhost:8080')) {
    await route.continue();
    return;
  }

  const parsed = new URL(url);
  const pathname = parsed.pathname;
  const method = route.request().method();

  const fulfill = async (data, status = 200, contentType = 'application/json') => {
    await route.fulfill({
      status,
      headers: { 'Content-Type': contentType },
      body: typeof data === 'string' ? data : JSON.stringify(data)
    });
  };

  if (pathname === '/auth/login' && method === 'POST') {
    await fulfill(loginResponse);
    return;
  }
  if (pathname === '/auth/me') {
    await fulfill(loginResponse.user);
    return;
  }
  if (pathname === '/profiles/admin') {
    await fulfill(adminProfile);
    return;
  }
  if (pathname === '/admin/strategy') {
    await fulfill(strategyCurrent);
    return;
  }
  if (pathname === '/admin/strategy/debug') {
    await fulfill(strategyDebug);
    return;
  }
  if (pathname === '/admin/metrics/summary') {
    await fulfill(metricsSummary);
    return;
  }
  if (pathname === '/admin/audit/logs') {
    await fulfill(auditLogs);
    return;
  }
  if (pathname === '/api/keys') {
    await fulfill(apiKeys);
    return;
  }
  if (pathname === '/actuator/health') {
    await fulfill(healthResponse);
    return;
  }
  if (pathname === '/profiles/user') {
    await fulfill(userProfile);
    return;
  }
  if (pathname === '/api/protected/test') {
    const response = protectedResponses[Math.min(protectedCallCounter, protectedResponses.length - 1)];
    protectedCallCounter += 1;
    await fulfill(response.body, response.status, 'text/plain');
    return;
  }

  await route.fulfill({ status: 404, body: 'Not mocked' });
};

const capture = async (page, name) => {
  const buffer = await page.screenshot({ fullPage: true });
  fs.writeFileSync(path.join(screenshotDir, name), buffer);
};

const run = async () => {
  ensureDirectory();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.route('**', formatRoute);
  await page.goto(frontendUrl, { waitUntil: 'networkidle' });
  await delay(800);
  await capture(page, 'login.png');

  await page.getByRole('button', { name: 'Admin' }).click();
  await page.getByLabel('Username').fill('admin');
  await page.getByLabel('Password').fill('Admin@123');
  await page.getByRole('button', { name: 'Sign In' }).click();

  await page.waitForSelector('text=RATE LIMIT CONTROL PLANE');
  await page.waitForSelector('text=Metrics Summary');
  await delay(800);
  await capture(page, 'admin-dashboard.png');

  await page.getByRole('tab', { name: 'API Keys' }).click();
  await page.waitForSelector('text=All API Keys');
  await delay(1000);
  await capture(page, 'api-keys.png');

  await page.getByRole('tab', { name: 'Rate Policies' }).click();
  await page.waitForSelector('text=Global Strategy');
  await delay(800);
  await capture(page, 'rate-policies.png');

  await page.getByRole('tab', { name: 'System Health' }).click();
  await page.waitForSelector('text=Raw JSON');
  await delay(800);
  await capture(page, 'system-health.png');

  await page.getByRole('link', { name: 'User' }).click();
  await page.waitForSelector('text=USER ACCESS PORTAL');
  await page.fill('#api-key-input', 'sk_free_1');
  await page.getByRole('button', { name: 'Verify & Continue' }).click();
  await page.waitForSelector('text=User Dashboard');
  await page.getByRole('tab', { name: 'Request Simulator' }).click();
  await page.fill('#request-count', '5');
  await page.getByRole('button', { name: 'Execute Test' }).click();
  await page.waitForSelector('text=429 TOO MANY REQUESTS');
  await delay(1000);
  await capture(page, 'user-simulator.png');

  await browser.close();
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
