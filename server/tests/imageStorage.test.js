const http = require('http');
const fs = require('fs');
const path = require('path');
const { createApp } = require('../index');
const { DATA_DIR } = require('../config');

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
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

describe('Sovereign Local Image Storage Tests (/api/storage)', () => {
  let app;
  let server;
  let baseUrl;
  let originalAppData = null;
  const appDataPath = path.join(DATA_DIR, 'appData.json');
  const sampleBase64Png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

  beforeAll((done) => {
    try {
      if (fs.existsSync(appDataPath)) {
        originalAppData = fs.readFileSync(appDataPath, 'utf-8');
      }
    } catch (e) {}

    app = createApp();
    server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      baseUrl = `http://127.0.0.1:${port}`;
      done();
    });
  });

  afterAll((done) => {
    try {
      if (originalAppData !== null) {
        fs.writeFileSync(appDataPath, originalAppData, 'utf-8');
      }
    } catch (e) {}

    if (server) {
      server.close(done);
    } else {
      done();
    }
  });

  test('POST /api/storage/upload-image saves base64 image as physical file on disk', async () => {
    const res = await makeRequest(`${baseUrl}/api/storage/upload-image`, {
      method: 'POST',
      body: {
        image: sampleBase64Png,
        entityId: 'test_card_1'
      }
    });

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data.url).toMatch(/^\/api\/storage\/images\/test_card_1_/);

    const filename = res.data.url.replace('/api/storage/images/', '');
    const diskPath = path.join(DATA_DIR, 'images', filename);
    expect(fs.existsSync(diskPath)).toBe(true);
  });

  test('GET /api/storage/images/:filename successfully serves physical image', async () => {
    const uploadRes = await makeRequest(`${baseUrl}/api/storage/upload-image`, {
      method: 'POST',
      body: {
        image: sampleBase64Png,
        entityId: 'serve_test'
      }
    });
    const filename = uploadRes.data.url.replace('/api/storage/images/', '');

    const getRes = await makeRequest(`${baseUrl}/api/storage/images/${filename}`);
    expect(getRes.status).toBe(200);
  });

  test('POST /api/storage/app-data automatically extracts base64 from cards into disk files', async () => {
    const testPayload = {
      data: {
        scenarios: [
          { id: 'sc-auto-1', title: 'Auto Scenario', cover: sampleBase64Png }
        ],
        cards: [
          {
            id: 'card-auto-1',
            title: 'Auto Card',
            cover: sampleBase64Png,
            images: [
              { id: 'img-1', url: sampleBase64Png, label: 'Default' }
            ]
          }
        ],
        narrators: [],
        tools: []
      }
    };

    const res = await makeRequest(`${baseUrl}/api/storage/app-data`, {
      method: 'POST',
      body: testPayload
    });

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data.data.scenarios[0].cover).toMatch(/^\/api\/storage\/images\//);
    expect(res.data.data.cards[0].cover).toMatch(/^\/api\/storage\/images\//);
    expect(res.data.data.cards[0].images[0].url).toMatch(/^\/api\/storage\/images\//);
  });
});
