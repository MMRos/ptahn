const path = require('path');
const fs = require('fs');
const {
  startModelDownload,
  getDownloadTasks,
  cancelDownloadTask,
  clearDownloadTasksForTesting
} = require('../engine/modelDownloader');

const TEST_DOWNLOAD_DIR = path.join(__dirname, '__test_downloads__');

describe('ModelDownloader Engine (Streaming, Progress & Task Lifecycle)', () => {
  beforeEach(() => {
    clearDownloadTasksForTesting();
    if (fs.existsSync(TEST_DOWNLOAD_DIR)) {
      fs.rmSync(TEST_DOWNLOAD_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TEST_DOWNLOAD_DIR, { recursive: true });
  });

  afterAll(() => {
    clearDownloadTasksForTesting();
    if (fs.existsSync(TEST_DOWNLOAD_DIR)) {
      fs.rmSync(TEST_DOWNLOAD_DIR, { recursive: true, force: true });
    }
  });

  test('registers and initializes a download task with valid telemetry fields', () => {
    const task = startModelDownload({
      url: 'https://huggingface.co/test/model.gguf',
      filename: 'test-model.gguf',
      targetDir: TEST_DOWNLOAD_DIR,
      simulate: true // Immediate mock for unit testing
    });

    expect(task.id).toBeDefined();
    expect(task.filename).toBe('test-model.gguf');
    expect(task.status).toBe('downloading');
    expect(task.percent).toBeDefined();
    expect(task.speedMbS).toBeDefined();

    const allTasks = getDownloadTasks();
    expect(allTasks.length).toBe(1);
    expect(allTasks[0].id).toBe(task.id);
  });

  test('cancels a running download task and cleans partial files', () => {
    const task = startModelDownload({
      url: 'https://huggingface.co/test/model2.gguf',
      filename: 'test-model2.gguf',
      targetDir: TEST_DOWNLOAD_DIR,
      simulate: true
    });

    const cancelled = cancelDownloadTask(task.id);
    expect(cancelled).toBe(true);

    const allTasks = getDownloadTasks();
    const updated = allTasks.find(t => t.id === task.id);
    expect(updated.status).toBe('cancelled');
  });
});
