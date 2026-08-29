import {
  fetchSystemTelemetry,
  calculateTokensSpeed,
  formatBytesToGB
} from './systemTelemetry';

describe('systemTelemetry - System Metrics & Hardware Aggregator Tests', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test('formatBytesToGB formats byte count into human-readable GB string', () => {
    expect(formatBytesToGB(1073741824)).toBe('1.0');
    expect(formatBytesToGB(8589934592)).toBe('8.0');
    expect(formatBytesToGB(0)).toBe('0.0');
  });

  test('calculateTokensSpeed computes accurate tokens per second', () => {
    expect(calculateTokensSpeed(100, 2000)).toBe(50.0);
    expect(calculateTokensSpeed(0, 1000)).toBe(0);
    expect(calculateTokensSpeed(50, 0)).toBe(0);
  });

  test('WHEN telemetry endpoint returns valid data THEN metrics are structured correctly', async () => {
    const mockTelemetryPayload = {
      success: true,
      cpu: { usagePercent: 35, cores: 8, model: 'AMD Ryzen 7' },
      ram: { totalBytes: 34359738368, freeBytes: 17179869184, usedBytes: 17179869184, usagePercent: 50 },
      gpu: { name: 'NVIDIA RTX 4070', usagePercent: 65, vramUsedMB: 8192, vramTotalMB: 12288, vramPercent: 66, tempC: 58 },
      models: [
        { id: 'precog-magnum-31b', name: 'Precog-Magnum 31B', engine: 'LLM', status: 'loaded', tokensGenerated: 5400, tokPerSec: 42.5 },
        { id: 'v6.safetensors', name: 'v6.safetensors (SDXL)', engine: 'DIFFUSION', status: 'loaded', imagesGenerated: 4 }
      ]
    };

    global.fetch = jest.fn().mockImplementation((url) => {
      if (url.includes('/api/system/telemetry')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockTelemetryPayload)
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: [] })
      });
    });

    const result = await fetchSystemTelemetry('http://localhost:3001');

    expect(result.success).toBe(true);
    expect(result.cpu.usagePercent).toBe(35);
    expect(result.gpu.name).toBe('NVIDIA RTX 4070');
    expect(result.gpu.vramPercent).toBe(66);
    expect(result.models.length).toBe(2);
    expect(result.models[0].name).toContain('Precog-Magnum');
  });

  test('WHEN server is unreachable THEN returns offline fallback telemetry without throwing', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));

    const result = await fetchSystemTelemetry('http://localhost:3001');

    expect(result.success).toBe(false);
    expect(result.offline).toBe(true);
    expect(result.models).toBeDefined();
    expect(result.cpu).toBeDefined();
  });
});
