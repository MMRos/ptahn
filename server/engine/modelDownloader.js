const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

let activeDownloads = new Map();

/**
 * Format bytes to readable representation
 */
function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const val = bytes / Math.pow(1024, i);
  return `${val.toFixed(2)} ${units[i]}`;
}

/**
 * Start streaming download of a model
 */
function startModelDownload({
  url,
  filename,
  targetDir,
  category = 'llm',
  simulate = false
}) {
  const taskId = `dl-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const cleanFilename = path.basename(filename || 'model.gguf');
  const tempFilePath = path.join(targetDir, `${cleanFilename}.downloading`);
  const finalFilePath = path.join(targetDir, cleanFilename);

  const task = {
    id: taskId,
    filename: cleanFilename,
    url,
    category,
    status: 'downloading',
    percent: 0,
    downloadedBytes: 0,
    totalBytes: 0,
    speedMbS: 0,
    etaSeconds: 0,
    tempFilePath,
    finalFilePath,
    startedAt: Date.now(),
    request: null,
    writeStream: null
  };

  activeDownloads.set(taskId, task);

  if (simulate) {
    // Unit testing fast mock
    task.totalBytes = 100 * 1024 * 1024;
    task.downloadedBytes = 25 * 1024 * 1024;
    task.percent = 25;
    task.speedMbS = 12.5;
    return task;
  }

  // Real HTTP(S) Streaming Download
  const client = url.startsWith('https') ? https : http;

  function performDownload(targetUrl, redirectCount = 0) {
    if (redirectCount > 5) {
      task.status = 'error';
      task.error = 'Demasiadas redirecciones HTTP';
      return;
    }

    try {
      const req = client.get(targetUrl, { headers: { 'User-Agent': 'Ptahn-Desktop-Client/1.0' } }, (res) => {
        // Handle HTTP Redirects (e.g. Hugging Face 302/307 redirects to CDN)
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const newUrl = new URL(res.headers.location, targetUrl).toString();
          performDownload(newUrl, redirectCount + 1);
          return;
        }

        if (res.statusCode !== 200) {
          task.status = 'error';
          task.error = `Error del servidor HTTP ${res.statusCode}`;
          return;
        }

        const total = parseInt(res.headers['content-length'] || '0', 10);
        task.totalBytes = total;

        const writeStream = fs.createWriteStream(tempFilePath);
        task.writeStream = writeStream;

        let downloaded = 0;
        let lastTimestamp = Date.now();
        let lastBytes = 0;

        res.on('data', (chunk) => {
          downloaded += chunk.length;
          task.downloadedBytes = downloaded;

          if (total > 0) {
            task.percent = Number(((downloaded / total) * 100).toFixed(1));
          }

          const now = Date.now();
          const timeDiff = (now - lastTimestamp) / 1000;
          if (timeDiff >= 1.0) {
            const bytesSinceLast = downloaded - lastBytes;
            const speedBytesPerSec = bytesSinceLast / timeDiff;
            task.speedMbS = Number((speedBytesPerSec / (1024 * 1024)).toFixed(2));

            if (total > downloaded && speedBytesPerSec > 0) {
              task.etaSeconds = Math.round((total - downloaded) / speedBytesPerSec);
            }

            lastTimestamp = now;
            lastBytes = downloaded;
          }
        });

        res.pipe(writeStream);

        writeStream.on('finish', () => {
          writeStream.close();
          try {
            if (fs.existsSync(tempFilePath)) {
              fs.renameSync(tempFilePath, finalFilePath);
            }
            task.status = 'completed';
            task.percent = 100;
            task.speedMbS = 0;
          } catch (e) {
            task.status = 'error';
            task.error = e.message;
          }
        });

        writeStream.on('error', (err) => {
          task.status = 'error';
          task.error = err.message;
        });
      });

      task.request = req;

      req.on('error', (err) => {
        task.status = 'error';
        task.error = err.message;
      });
    } catch (err) {
      task.status = 'error';
      task.error = err.message;
    }
  }

  performDownload(url);
  return task;
}

/**
 * Returns all download tasks with human-formatted data
 */
function getDownloadTasks() {
  return Array.from(activeDownloads.values()).map(t => ({
    id: t.id,
    filename: t.filename,
    url: t.url,
    category: t.category,
    status: t.status,
    percent: t.percent,
    downloadedBytes: t.downloadedBytes,
    totalBytes: t.totalBytes,
    formattedDownloaded: formatBytes(t.downloadedBytes),
    formattedTotal: formatBytes(t.totalBytes),
    speedMbS: t.speedMbS,
    etaSeconds: t.etaSeconds,
    error: t.error
  }));
}

/**
 * Cancels a download task and deletes partial temp file
 */
function cancelDownloadTask(taskId) {
  const task = activeDownloads.get(taskId);
  if (!task) return false;

  if (task.request) {
    try { task.request.destroy(); } catch (e) { }
  }
  if (task.writeStream) {
    try { task.writeStream.close(); } catch (e) { }
  }

  try {
    if (fs.existsSync(task.tempFilePath)) {
      fs.unlinkSync(task.tempFilePath);
    }
  } catch (e) { }

  task.status = 'cancelled';
  return true;
}

function clearDownloadTasksForTesting() {
  activeDownloads.clear();
}

module.exports = {
  startModelDownload,
  getDownloadTasks,
  cancelDownloadTask,
  clearDownloadTasksForTesting
};
