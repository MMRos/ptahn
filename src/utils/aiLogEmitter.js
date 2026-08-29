/**
 * aiLogEmitter.js
 * In-memory Pub/Sub Event Bus for Real-time Inter-AI Pipeline Traces & Logs.
 */

const MAX_LOGS = 200;
let logsBuffer = [];
const listeners = new Set();

/**
 * Emits a structured log event representing an action or data passed between IAs.
 * @param {Object} eventData
 * @param {string} eventData.from - Source module / AI agent
 * @param {string} eventData.to - Destination module / AI agent
 * @param {'INFO'|'INTER_AI'|'STORYTELLER'|'CARD_EXTRACTOR'|'PROMPT_TRANSLATOR'|'DIFFUSION_TASK'|'TTS_AUDIO'|'ERROR'} eventData.type
 * @param {string} eventData.summary - Human-readable summary of the event
 * @param {*} [eventData.payload] - Optional request/response details
 * @param {Object} [eventData.metrics] - Optional metrics (tokens, latencyMs, resolution, steps)
 * @param {string} [eventData.timestamp] - ISO timestamp
 */
export function emitAILog({
  from = 'SYSTEM',
  to = 'ALL',
  type = 'INFO',
  summary = '',
  payload = null,
  metrics = null,
  timestamp = new Date().toISOString()
}) {
  const logEntry = {
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    from,
    to,
    type,
    summary,
    payload,
    metrics,
    timestamp
  };

  logsBuffer.push(logEntry);
  if (logsBuffer.length > MAX_LOGS) {
    logsBuffer = logsBuffer.slice(logsBuffer.length - MAX_LOGS);
  }

  // Notify all active subscribers
  listeners.forEach((callback) => {
    try {
      callback(logEntry, logsBuffer);
    } catch (err) {
      console.warn('[aiLogEmitter listener error]:', err);
    }
  });

  return logEntry;
}

/**
 * Retrieves the current logs buffer, optionally filtered by event type.
 * @param {string} [filterType='ALL']
 * @returns {Array} Array of log entries
 */
export function getAILogs(filterType = 'ALL') {
  if (!filterType || filterType === 'ALL') {
    return [...logsBuffer];
  }
  return logsBuffer.filter((entry) => entry.type === filterType || entry.from === filterType || entry.to === filterType);
}

/**
 * Clears the logs buffer in memory.
 */
export function clearAILogs() {
  logsBuffer = [];
  listeners.forEach((callback) => {
    try {
      callback(null, []);
    } catch (e) {}
  });
}

/**
 * Subscribes a callback to live AI events.
 * @param {Function} callback - Function receiving (newEntry, allLogs)
 * @returns {Function} Unsubscribe function
 */
export function subscribeToAILogs(callback) {
  if (typeof callback === 'function') {
    listeners.add(callback);
  }
  return () => {
    listeners.delete(callback);
  };
}
