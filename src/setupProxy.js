const http = require('http');

module.exports = function(app) {
  // Proxy para LM Studio (Evita el bug de CORS OPTIONS de Express en LM Studio)
  app.use('/api/lmstudio', (req, res) => {
    const targetUrl = req.headers['x-target-url'] || 'http://127.0.0.1:1234';
    let hostname = '127.0.0.1';
    let port = 1234;

    try {
      const parsed = new URL(targetUrl);
      hostname = parsed.hostname;
      port = parsed.port || (parsed.protocol === 'https:' ? 443 : 80);
    } catch (e) {
      // Usar defaults
    }

    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
      res.setHeader('Access-Control-Allow-Headers', '*');
      return res.status(200).end();
    }

    const proxyReq = http.request({
      hostname: hostname,
      port: port,
      path: req.url,
      method: req.method,
      headers: {
        ...req.headers,
        host: `${hostname}:${port}`
      }
    }, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res, { end: true });
    });

    proxyReq.on('error', (err) => {
      if (!res.headersSent) {
        res.status(502).json({ error: 'Proxy connection error to LM Studio', message: err.message });
      }
    });

    req.pipe(proxyReq, { end: true });
  });
};
