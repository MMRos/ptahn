const path = require('path');
const fs = require('fs');
const http = require('http');
const { createApp } = require('../index');
const { DiffusionEngine, diffusionEngine } = require('../engine/diffusionEngine');

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

describe('Native Diffusion Engine Module & Endpoints', () => {
  let server;
  let baseUrl;
  const testModelsDir = path.join(__dirname, 'temp_diff_models');

  beforeAll((done) => {
    if (!fs.existsSync(testModelsDir)) {
      fs.mkdirSync(testModelsDir, { recursive: true });
    }
    fs.writeFileSync(path.join(testModelsDir, 'DreamShaperXL_Lightning.safetensors'), Buffer.alloc(1024 * 50));

    const app = createApp();
    server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      done();
    });
  });

  beforeEach(() => {
    jest.spyOn(diffusionEngine, 'runNativeWorker').mockImplementation(async (prompt, options) => {
      const b64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
      if (options.outputPath) {
        fs.writeFileSync(options.outputPath, Buffer.from(b64, 'base64'));
      }
      return {
        success: true,
        output_path: options.outputPath,
        filename: path.basename(options.outputPath),
        device: 'mock',
        model: 'DreamShaperXL_Lightning.safetensors',
        seed: 12345,
        base64: `data:image/png;base64,${b64}`
      };
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll((done) => {
    if (fs.existsSync(testModelsDir)) {
      fs.rmSync(testModelsDir, { recursive: true, force: true });
    }
    server.close(done);
  });

  test('DiffusionEngine instance initializes and exposes status', () => {
    const engine = new DiffusionEngine();
    const status = engine.getStatus();
    expect(status.ready).toBe(true);
    expect(typeof status.availableModelsCount).toBe('number');
    expect(Array.isArray(status.models)).toBe(true);
  });

  test('GET /api/images/status returns online status', async () => {
    const res = await makeRequest(`${baseUrl}/api/images/status`);
    expect(res.status).toBe(200);
    expect(res.data.online).toBe(true);
    expect(res.data.ready).toBe(true);
  });

  test('GET /api/images/models lists models array', async () => {
    const res = await makeRequest(`${baseUrl}/api/images/models`);
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(Array.isArray(res.data.models)).toBe(true);
  });

  test('POST /api/images/generate validates empty prompt', async () => {
    const res = await makeRequest(`${baseUrl}/api/images/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: {}
    });
    expect(res.status).toBe(400);
    expect(res.data.success).toBe(false);
  });

  test('POST /api/images/generate produces image and returns base64 and url', async () => {
    const res = await makeRequest(`${baseUrl}/api/images/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: {
        prompt: 'portrait of a wizard, glowing blue staff, fantasy art',
        options: { width: 512, height: 768 }
      }
    });
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data.url).toMatch(/^\/api\/images\/files\//);
    expect(res.data.base64).toMatch(/^data:image\/png;base64,/);
  });
});
