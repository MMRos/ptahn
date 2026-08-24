const http = require('http');
const { createApp } = require('../index');

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch (e) {
          parsed = data;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: parsed
        });
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

describe('Server Lifecycle API Endpoints (server/routes/lifecycle.js)', () => {
  let app;
  let server;
  let baseUrl;

  beforeAll((done) => {
    app = createApp();
    server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      baseUrl = `http://127.0.0.1:${port}`;
      done();
    });
  });

  afterAll((done) => {
    if (server) {
      server.close(done);
    } else {
      done();
    }
  });

  describe('GET /api/lifecycle/status', () => {
    test('WHEN GET /api/lifecycle/status is called THEN returns server runtime metrics and engines state', async () => {
      const res = await makeRequest(`${baseUrl}/api/lifecycle/status`);
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data.running).toBe(true);
      expect(typeof res.data.uptime).toBe('number');
      expect(typeof res.data.pid).toBe('number');
      expect(res.data.engines).toBeDefined();
    });
  });

  describe('POST /api/lifecycle/stop and state synchronization with /api/ai/status', () => {
    test('WHEN POST /api/lifecycle/stop is called THEN marks server as stopped and /api/ai/status reflects online: false', async () => {
      const stopRes = await makeRequest(`${baseUrl}/api/lifecycle/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { releaseVram: true }
      });
      expect(stopRes.status).toBe(200);
      expect(stopRes.data.success).toBe(true);
      expect(stopRes.data.running).toBe(false);
      expect(stopRes.data.online).toBe(false);

      const aiStatusRes = await makeRequest(`${baseUrl}/api/ai/status`);
      expect(aiStatusRes.status).toBe(200);
      expect(aiStatusRes.data.online).toBe(false);
      expect(aiStatusRes.data.running).toBe(false);
    });
  });

  describe('POST /api/lifecycle/start and POST /api/lifecycle/restart', () => {
    test('WHEN POST /api/lifecycle/start is called THEN restarts and marks server online', async () => {
      const startRes = await makeRequest(`${baseUrl}/api/lifecycle/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { engine: 'all' }
      });
      expect(startRes.status).toBe(200);
      expect(startRes.data.success).toBe(true);
      expect(startRes.data.running).toBe(true);
      expect(startRes.data.online).toBe(true);

      const aiStatusRes = await makeRequest(`${baseUrl}/api/ai/status`);
      expect(aiStatusRes.data.online).toBe(true);
    });

    test('WHEN POST /api/lifecycle/restart is called THEN flushes and reinitializes runtime with online: true', async () => {
      const res = await makeRequest(`${baseUrl}/api/lifecycle/restart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { engine: 'all' }
      });
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data.status).toBe('restarted');
      expect(res.data.running).toBe(true);
      expect(res.data.online).toBe(true);
    });
  });
});
