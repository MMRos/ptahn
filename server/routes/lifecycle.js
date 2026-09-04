const express = require('express');
const router = express.Router();
const { llamaEngine } = require('../engine/llamaEngine');
const { diffusionEngine } = require('../engine/diffusionEngine');

let serverRunning = true;

function isServerRunning() {
  return serverRunning;
}

function setServerRunning(state) {
  serverRunning = Boolean(state);
  return serverRunning;
}

/**
 * Format memory usage for status response
 */
function getMemoryUsage() {
  const mem = process.memoryUsage();
  return {
    rss: `${Math.round(mem.rss / (1024 * 1024))}MB`,
    heapUsed: `${Math.round(mem.heapUsed / (1024 * 1024))}MB`
  };
}

/**
 * Build consolidated status payload
 */
function buildStatusPayload() {
  const llamaStatus = llamaEngine.getStatus();
  const diffusionStatus = diffusionEngine.getStatus();

  return {
    success: true,
    running: serverRunning,
    online: serverRunning,
    uptime: process.uptime(),
    pid: process.pid,
    engines: {
      llama: {
        active: Boolean(llamaStatus.activeModel),
        status: llamaStatus.status,
        model: llamaStatus.activeModel,
        gpu: llamaStatus.gpu
      },
      diffusion: {
        active: diffusionStatus.modelsCount > 0,
        model: diffusionStatus.activeModel,
        modelsCount: diffusionStatus.modelsCount,
        isGenerating: diffusionStatus.isGenerating
      }
    },
    memory: getMemoryUsage()
  };
}

/**
 * GET /api/lifecycle/status
 */
router.get('/status', (req, res) => {
  try {
    const payload = buildStatusPayload();
    res.json(payload);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/lifecycle/start
 */
router.post('/start', async (req, res) => {
  try {
    const { engine = 'all' } = req.body;
    serverRunning = true;
    if (engine === 'all' || engine === 'llama') {
      await llamaEngine.initRuntime().catch(() => {});
    }
    res.json({
      success: true,
      running: true,
      online: true,
      status: 'running',
      message: `Engines (${engine}) initialized successfully`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/lifecycle/stop
 */
router.post('/stop', async (req, res) => {
  try {
    const { releaseVram = true, shutdownProcess = false } = req.body;
    serverRunning = false;
    if (releaseVram && llamaEngine.context) {
      await llamaEngine.context.dispose().catch(() => {});
      llamaEngine.context = null;
    }
    res.json({
      success: true,
      running: false,
      online: false,
      status: 'stopped',
      message: 'Servidor detenido y VRAM liberada correctamente',
      timestamp: new Date().toISOString()
    });

    if (shutdownProcess) {
      setTimeout(() => process.exit(0), 400);
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/lifecycle/restart
 */
router.post('/restart', async (req, res) => {
  try {
    serverRunning = true;
    if (llamaEngine.context) {
      await llamaEngine.context.dispose().catch(() => {});
      llamaEngine.context = null;
    }
    llamaEngine.resetMutex();
    await llamaEngine.initRuntime().catch(() => {});
    res.json({
      success: true,
      running: true,
      online: true,
      status: 'restarted',
      message: 'Servidor y motores reiniciados exitosamente',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.isServerRunning = isServerRunning;
router.setServerRunning = setServerRunning;

module.exports = router;
module.exports.isServerRunning = isServerRunning;
module.exports.setServerRunning = setServerRunning;

