/**
 * systemTelemetry.js
 * Client-side Telemetry Aggregator for Hardware (CPU, GPU, VRAM, RAM) and Multi-Model Execution.
 */

import { getServerBaseUrl } from './serverApi';
import { loadChatSettings } from './storage';

let totalTokensCounter = 0;
let lastGenerationSpeed = 0;

/**
 * Converts a byte count to gigabytes formatted to 1 decimal place.
 * @param {number} bytes
 * @returns {string} e.g. "16.0"
 */
export function formatBytesToGB(bytes = 0) {
  if (!bytes || isNaN(bytes) || bytes <= 0) return '0.0';
  const gb = bytes / (1024 * 1024 * 1024);
  return gb.toFixed(1);
}

/**
 * Calculates token generation speed (tokens per second).
 * @param {number} tokens
 * @param {number} durationMs
 * @returns {number}
 */
export function calculateTokensSpeed(tokens = 0, durationMs = 0) {
  if (!tokens || !durationMs || durationMs <= 0) return 0;
  const speed = (tokens / (durationMs / 1000));
  return Math.round(speed * 10) / 10;
}

/**
 * Records token statistics from completed inferences.
 * @param {number} tokens
 * @param {number} speed
 */
export function recordTokensTelemetry(tokens = 0, speed = 0) {
  if (tokens > 0) totalTokensCounter += tokens;
  if (speed > 0) lastGenerationSpeed = speed;
}

/**
 * Fetches system and hardware telemetry from Ptahn Native Server.
 * @param {string} [serverUrl]
 * @returns {Promise<Object>}
 */
export async function fetchSystemTelemetry(serverUrl = getServerBaseUrl()) {
  const targetServerUrl = (serverUrl || getServerBaseUrl()).replace(/\/$/, '');

  let systemData = null;
  let nativeModels = [];

  // 1. Query Ptahn Native Server Telemetry
  try {
    const res = await fetch(`${targetServerUrl}/api/system/telemetry`);
    if (res.ok) {
      systemData = await res.json();
    }
  } catch (err) {
    // Handled in fallback
  }

  // 2. Query Local GGUF Models from Ptahn Server
  try {
    const mRes = await fetch(`${targetServerUrl}/api/models`);
    if (mRes.ok) {
      const mData = await mRes.json();
      nativeModels = mData.models || [];
    }
  } catch (e) {}

  const cleanModelName = (str = '') => str.replace(/\.gguf$/i, '').replace(/^.*[\\/]/, '');
  const chatSettings = loadChatSettings();
  const configuredStoryteller = chatSettings?.preferredModel || 'Precog-Magnum-31B.i1-Q3_K_S.gguf';
  const configuredOrchestrator = chatSettings?.orchestratorModel || 'mistral-nemo-instruct-2407-gguf-Q4-K-M.gguf';

  const isServerOnline = !!systemData?.success || nativeModels.length > 0;
  const residentModelList = [];

  if (isServerOnline) {
    // Storyteller LLM (Principal)
    const activeStoryteller = nativeModels.find(m => (m.id || m.filename || '').toLowerCase().includes(configuredStoryteller.toLowerCase()) || configuredStoryteller.toLowerCase().includes((m.id || m.filename || '').toLowerCase()));
    residentModelList.push({
      id: configuredStoryteller,
      name: cleanModelName(activeStoryteller?.filename || configuredStoryteller),
      engine: 'STORYTELLER',
      role: 'Principal (Narrador)',
      status: 'loaded',
      tokensGenerated: totalTokensCounter,
      tokPerSec: lastGenerationSpeed
    });

    // Orchestrator SLM (Intermediario)
    const activeOrchestrator = nativeModels.find(m => (m.id || m.filename || '').toLowerCase().includes(configuredOrchestrator.toLowerCase()) || configuredOrchestrator.toLowerCase().includes((m.id || m.filename || '').toLowerCase()));
    residentModelList.push({
      id: configuredOrchestrator,
      name: cleanModelName(activeOrchestrator?.filename || configuredOrchestrator),
      engine: 'ORCHESTRATOR',
      role: 'Intermediario (SLM)',
      status: 'loaded'
    });
  } else if (systemData?.models && systemData.models.length > 0) {
    systemData.models.forEach(m => residentModelList.push(m));
  }

  if (!systemData || !systemData.success) {
    // Offline fallback structure
    return {
      success: false,
      offline: true,
      timestamp: new Date().toISOString(),
      cpu: { usagePercent: 0, cores: 4, model: 'Procesador Local' },
      ram: { totalGB: 16.0, usedGB: 0, freeGB: 16.0, usagePercent: 0 },
      gpu: { name: 'GPU Desconectada', usagePercent: 0, vramUsedGB: 0, vramTotalGB: 0, vramPercent: 0, tempC: 0 },
      models: residentModelList.length > 0 ? residentModelList : nativeModels,
      tokens: {
        totalTokens: totalTokensCounter,
        avgTokPerSec: lastGenerationSpeed
      }
    };
  }

  const allModels = (systemData.models && systemData.models.length > 0)
    ? systemData.models
    : residentModelList;

  const ramUsedBytes = systemData.ram?.usedBytes || 0;
  const ramTotalBytes = systemData.ram?.totalBytes || 1;
  const vramUsedMB = systemData.gpu?.vramUsedMB || 0;
  const vramTotalMB = systemData.gpu?.vramTotalMB || 1;

  return {
    success: true,
    offline: false,
    timestamp: systemData.timestamp || new Date().toISOString(),
    cpu: {
      usagePercent: systemData.cpu?.usagePercent || 0,
      cores: systemData.cpu?.cores || 1,
      model: systemData.cpu?.model || 'CPU'
    },
    ram: {
      totalGB: parseFloat(formatBytesToGB(ramTotalBytes)),
      usedGB: parseFloat(formatBytesToGB(ramUsedBytes)),
      freeGB: parseFloat(formatBytesToGB(systemData.ram?.freeBytes || 0)),
      usagePercent: systemData.ram?.usagePercent || 0
    },
    gpu: {
      name: systemData.gpu?.name || 'NVIDIA GPU (CUDA)',
      usagePercent: systemData.gpu?.usagePercent || 0,
      vramUsedGB: parseFloat((vramUsedMB / 1024).toFixed(1)),
      vramTotalGB: parseFloat((vramTotalMB / 1024).toFixed(1)),
      vramPercent: systemData.gpu?.vramPercent || 0,
      tempC: systemData.gpu?.tempC || 0
    },
    models: allModels,
    tokens: {
      totalTokens: totalTokensCounter,
      avgTokPerSec: lastGenerationSpeed
    }
  };
}
