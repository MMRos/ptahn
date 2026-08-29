const express = require('express');
const router = express.Router();
const os = require('os');
const { exec } = require('child_process');
const { llamaEngine } = require('../engine/llamaEngine');
const { diffusionEngine } = require('../engine/diffusionEngine');

let cachedGpuInfo = {
  name: 'GPU (CUDA / Native Worker)',
  usagePercent: 0,
  vramUsedMB: 0,
  vramTotalMB: 0,
  vramPercent: 0,
  tempC: 0,
  lastUpdated: 0
};

// Asynchronously probe nvidia-smi with 1.5s cache
function updateGpuTelemetry() {
  const now = Date.now();
  if (now - cachedGpuInfo.lastUpdated < 1500) {
    return;
  }

  exec('nvidia-smi --query-gpu=name,utilization.gpu,memory.used,memory.total,temperature.gpu --format=csv,noheader,nounits', { timeout: 1000 }, (err, stdout) => {
    if (!err && stdout) {
      const parts = stdout.trim().split(',');
      if (parts.length >= 5) {
        const name = parts[0].trim();
        const usage = parseFloat(parts[1]) || 0;
        const usedMB = parseFloat(parts[2]) || 0;
        const totalMB = parseFloat(parts[3]) || 0;
        const temp = parseFloat(parts[4]) || 0;
        const vramPct = totalMB > 0 ? Math.round((usedMB / totalMB) * 100) : 0;

        cachedGpuInfo = {
          name,
          usagePercent: usage,
          vramUsedMB: usedMB,
          vramTotalMB: totalMB,
          vramPercent: vramPct,
          tempC: temp,
          lastUpdated: Date.now()
        };
      }
    }
  });
}

// Compute CPU usage sample
function getCpuUsagePercent() {
  const cpus = os.cpus();
  let totalIdle = 0;
  let totalTick = 0;
  for (const cpu of cpus) {
    for (const type in cpu.times) {
      totalTick += cpu.times[type];
    }
    totalIdle += cpu.times.idle;
  }
  const idleRatio = totalIdle / (totalTick || 1);
  return Math.round((1 - idleRatio) * 100);
}

// GET /api/system/telemetry
router.get('/telemetry', (req, res) => {
  try {
    updateGpuTelemetry();

    const totalRam = os.totalmem();
    const freeRam = os.freemem();
    const usedRam = totalRam - freeRam;
    const ramPercent = totalRam > 0 ? Math.round((usedRam / totalRam) * 100) : 0;

    const cpus = os.cpus();
    const cpuModel = (cpus && cpus[0] && cpus[0].model) || 'CPU';
    const cpuUsage = getCpuUsagePercent();

    // Query active engines
    const llamaStatus = (typeof llamaEngine?.getStatus === 'function') ? llamaEngine.getStatus() : {};
    const diffusionStatus = (typeof diffusionEngine?.getStatus === 'function') ? diffusionEngine.getStatus() : {};

    const activeModels = [];
    if (llamaStatus.activeModel) {
      activeModels.push({
        id: llamaStatus.activeModel,
        name: llamaStatus.activeModel,
        engine: 'LLM',
        status: 'loaded',
        tokensGenerated: llamaStatus.totalTokens || 0,
        tokPerSec: llamaStatus.tokPerSec || 0
      });
    }

    if (diffusionStatus.isGenerating && diffusionStatus.activeModel) {
      activeModels.push({
        id: diffusionStatus.activeModel,
        name: diffusionStatus.activeModel,
        engine: 'DIFFUSION',
        status: 'generating',
        device: diffusionStatus.device || 'cuda (on-demand)'
      });
    }

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      cpu: {
        usagePercent: cpuUsage,
        cores: cpus.length,
        model: cpuModel
      },
      ram: {
        totalBytes: totalRam,
        freeBytes: freeRam,
        usedBytes: usedRam,
        usagePercent: ramPercent
      },
      gpu: {
        name: cachedGpuInfo.name,
        usagePercent: cachedGpuInfo.usagePercent,
        vramUsedMB: cachedGpuInfo.vramUsedMB,
        vramTotalMB: cachedGpuInfo.vramTotalMB,
        vramPercent: cachedGpuInfo.vramPercent,
        tempC: cachedGpuInfo.tempC
      },
      models: activeModels,
      engines: {
        llama: llamaStatus,
        diffusion: diffusionStatus
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
