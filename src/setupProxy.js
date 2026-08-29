const http = require('http');

module.exports = function(app) {
  // Proxy para Ptahn Native Backend (port 3001)
  const nativeRoutes = ['/api/images', '/api/models', '/api/ai', '/api/storage', '/api/network', '/api/auth', '/api/system', '/api/lifecycle', '/v1/chat', '/v1/models'];
  nativeRoutes.forEach(route => {
    app.use(route, (req, res) => {
      const proxyReq = http.request({
        hostname: '127.0.0.1',
        port: 3001,
        path: `${route}${req.url === '/' ? '' : req.url}`,
        method: req.method,
        headers: {
          ...req.headers,
          host: '127.0.0.1:3001'
        }
      }, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res, { end: true });
      });

      proxyReq.on('error', (err) => {
        if (!res.headersSent) {
          res.status(503).json({ 
            error: 'Ptahn native backend on port 3001 is offline', 
            message: 'Inicia el servidor backend ejecutando "npm run server" en una terminal o asegurándote de que el puerto 3001 esté activo.' 
          });
        }
      });

      req.pipe(proxyReq, { end: true });
    });
  });
};
