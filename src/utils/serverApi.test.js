import { 
  fetchServerStatus, 
  fetchAvailableModels, 
  loadModelOnServer, 
  fetchAppDataFromServer, 
  saveAppDataToServer, 
  fetchNetworkInfo,
  sendChatToServer,
  fetchNativeImageModels,
  fetchImageEngineStatus,
  generateNativeImage
} from './serverApi';

describe('Server API Client Layer', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    jest.restoreAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('fetchServerStatus returns online status when endpoint responds', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'online', engine: 'native-llama', activeModel: 'test-model.gguf' })
    });

    const status = await fetchServerStatus('http://localhost:3001');
    expect(status.online).toBe(true);
    expect(status.engine).toBe('native-llama');
    expect(status.activeModel).toBe('test-model.gguf');
  });

  test('fetchServerStatus gracefully reports offline on network failure', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Connection refused'));

    const status = await fetchServerStatus('http://localhost:3001');
    expect(status.online).toBe(false);
    expect(status.error).toBeDefined();
  });

  test('fetchAvailableModels retrieves list of GGUF models', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ models: [{ id: 'm1', filename: 'model1.gguf', formattedSize: '4.2 GB' }] })
    });

    const result = await fetchAvailableModels('http://localhost:3001');
    expect(result.models.length).toBe(1);
    expect(result.models[0].filename).toBe('model1.gguf');
  });

  test('fetchNativeImageModels retrieves diffusion models', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, count: 1, models: [{ id: 'm1', filename: 'DreamShaperXL.safetensors' }] })
    });

    const result = await fetchNativeImageModels('http://localhost:3001');
    expect(result.success).toBe(true);
    expect(result.models.length).toBe(1);
  });

  test('generateNativeImage posts prompt and receives image payload', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, base64: 'data:image/png;base64,mock', url: '/api/images/files/p1.png' })
    });

    const result = await generateNativeImage('dragon warrior', { width: 512, height: 768 }, 'http://localhost:3001');
    expect(result.success).toBe(true);
    expect(result.base64).toBe('data:image/png;base64,mock');
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/images/generate',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
    );
  });

  test('sendChatToServer formats and dispatches messages to /api/ai/chat', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ reply: '¡Hola aventurero!', success: true })
    });

    const response = await sendChatToServer([{ role: 'user', content: 'Hola' }], { model: 'm1' }, 'http://localhost:3001');
    expect(response.reply).toBe('¡Hola aventurero!');
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/ai/chat',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
    );
  });

  test('fetchAppDataFromServer and saveAppDataToServer handle payload correctly', async () => {
    const mockData = { scenarios: [{ id: 's1' }], cards: [] };
    global.fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: mockData }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) });

    const loaded = await fetchAppDataFromServer('http://localhost:3001');
    expect(loaded.data.scenarios.length).toBe(1);

    const saved = await saveAppDataToServer(mockData, 'http://localhost:3001');
    expect(saved.success).toBe(true);
  });

  test('fetchNetworkInfo retrieves LAN IP and QR code data', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ip: '192.168.1.50', port: 3001, url: 'http://192.168.1.50:3001', qrData: 'data:image/png;base64,...' })
    });

    const info = await fetchNetworkInfo('http://localhost:3001');
    expect(info.ip).toBe('192.168.1.50');
    expect(info.port).toBe(3001);
    expect(info.url).toBe('http://192.168.1.50:3001');
  });
});
