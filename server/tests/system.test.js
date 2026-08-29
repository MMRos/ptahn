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

describe('System Telemetry Route (/api/system)', () => {
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

  test('GET /api/system/telemetry returns 200 and valid hardware/model metrics', async () => {
    const res = await makeRequest(`${baseUrl}/api/system/telemetry`);
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data.cpu).toBeDefined();
    expect(typeof res.data.cpu.cores).toBe('number');
    expect(res.data.ram).toBeDefined();
    expect(typeof res.data.ram.totalBytes).toBe('number');
    expect(res.data.gpu).toBeDefined();
    expect(res.data.models).toBeDefined();
    expect(Array.isArray(res.data.models)).toBe(true);
  });
});
