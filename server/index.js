const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const { PORT, HOST, MODELS_DIR, DATA_DIR, ROOT_DIR } = require('./config');
const { getLocalIpAddress } = require('./utils/networkUtils');
const aiRouter = require('./routes/ai');
const modelsRouter = require('./routes/models');
const storageRouter = require('./routes/storage');
const networkRouter = require('./routes/network');
const imagesRouter = require('./routes/images');
const lifecycleRouter = require('./routes/lifecycle');
const authRouter = require('./routes/auth');
const systemRouter = require('./routes/system');



function createApp() {
  const app = express();

  // Security Headers against MitM, Clickjacking and MIME sniffing
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));


  // Ensure essential directories exist
  [MODELS_DIR, DATA_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // API Routes
  app.use('/api/ai', aiRouter);
  app.use('/api/models', modelsRouter);
  app.use('/api/storage', storageRouter);
  app.use('/api/network', networkRouter);
  app.use('/api/images', imagesRouter);
  app.use('/api/lifecycle', lifecycleRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/system', systemRouter);



  // OpenAI / LM Studio drop-in compatibility routes
  app.use('/v1/chat', aiRouter);
  app.use('/v1/models', modelsRouter);

  // Serve static client build if available
  const buildDir = path.join(ROOT_DIR, 'build');
  if (fs.existsSync(buildDir)) {
    app.use(express.static(buildDir));
    app.use((req, res, next) => {
      if (req.method === 'GET' && !req.path.startsWith('/api')) {
        return res.sendFile(path.join(buildDir, 'index.html'));
      }
      next();
    });
  }

  return app;
}

function startServer() {
  const app = createApp();
  const server = app.listen(PORT, HOST, () => {
    const localIp = getLocalIpAddress();
    console.log('\n======================================================');
    console.log('   👑 PTAHN NATIVE AI SERVER (Zero Intermediaries)');
    console.log('======================================================');
    console.log(` → Localhost:  http://localhost:${PORT}`);
    console.log(` → Red Local:  http://${localIp}:${PORT} (Acceso desde Móvil)`);
    console.log(` → Modelos:    ${MODELS_DIR}`);
    console.log(` → Datos:      ${DATA_DIR}`);
    console.log('======================================================\n');
  });
  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = {
  createApp,
  startServer
};
