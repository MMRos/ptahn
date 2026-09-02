const http = require('http');
const { createApp } = require('../index');
const { rerankerEngine } = require('../engine/rerankerEngine');

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

describe('Reranker Engine & Route (/api/ai/rerank)', () => {
  jest.setTimeout(25000);
  let app;
  let server;
  let baseUrl;

  beforeAll((done) => {
    app = createApp();
    server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
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

  test('rerankerEngine.scoreCandidates calculates normalized scores between 0.0 and 1.0', async () => {
    const query = 'coloco el sable en su yugular dejando que lo note, desenfundo contra el gran lobo';
    const candidates = [
      { id: 'card-wolf', text: 'Lobo Gris. Gran lobo gris merodeando, colmillos afilados, gruñido amenazante' },
      { id: 'card-elf', text: 'Elfa Oscura. Hechicera de piel pálida, túnica de seda, cabello plateado' },
      { id: 'card-castle', text: 'Castillo de Piedra. Fortaleza antigua con murallas de piedra fría' }
    ];

    const scores = await rerankerEngine.scoreCandidates(query, candidates);
    expect(scores).toBeDefined();
    expect(typeof scores).toBe('object');
    expect(scores['card-wolf']).toBeGreaterThan(scores['card-elf']);
    expect(scores['card-wolf']).toBeGreaterThanOrEqual(0.3);
    expect(scores['card-wolf']).toBeLessThanOrEqual(1.0);
  });

  test('POST /api/ai/rerank returns 200 with calculated semanticScores map', async () => {
    const payload = {
      query: 'Desenfundo el sable contra la bestia salvaje',
      candidates: [
        { id: 'c-1', text: 'Lobo Gris, bestia salvaje y depredador' },
        { id: 'c-2', text: 'Tienda de Pociones en el mercado' }
      ]
    };

    const res = await makeRequest(`${baseUrl}/api/ai/rerank`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload
    });

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data.scores).toBeDefined();
    expect(res.data.scores['c-1']).toBeGreaterThan(res.data.scores['c-2']);
  });

  test('POST /api/ai/rerank handles empty candidates gracefully without failing', async () => {
    const res = await makeRequest(`${baseUrl}/api/ai/rerank`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { query: 'test', candidates: [] }
    });

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data.scores).toEqual({});
  });
});
