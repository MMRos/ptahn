import { getBaseUrl, resolveModelId, translateChatMessage, RECOMMENDED_MODELS } from './localAIStudio';

describe('Local AI Studio Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.restoreAllMocks();
  });

  test('should return fallback default URL when localStorage is empty', () => {
    const url = getBaseUrl();
    expect(url).toBe('http://localhost:1234');
  });

  test('should return custom URL from localStorage when configured', () => {
    const mockSettings = {
      preferredModel: 'deepseek-r1-distill-qwen-7b',
      preferredLanguage: 'auto',
      responseLength: 1000,
      lmStudioUrl: 'http://127.0.0.1:62594'
    };
    localStorage.setItem('ptah-chat-settings', JSON.stringify(mockSettings));

    const url = getBaseUrl();
    expect(url).toBe('http://127.0.0.1:62594');
  });

  test('should strip trailing slash from resolved URL', () => {
    const mockSettings = {
      lmStudioUrl: 'http://127.0.0.1:62594/'
    };
    localStorage.setItem('ptah-chat-settings', JSON.stringify(mockSettings));

    const url = getBaseUrl();
    expect(url).toBe('http://127.0.0.1:62594');
  });

  test('should prioritize passed baseUrl argument over localStorage', () => {
    const mockSettings = {
      lmStudioUrl: 'http://127.0.0.1:62594'
    };
    localStorage.setItem('ptah-chat-settings', JSON.stringify(mockSettings));

    const url = getBaseUrl('http://127.0.0.1:12345');
    expect(url).toBe('http://127.0.0.1:12345');
  });

  test('should safely handle corrupted localStorage JSON', () => {
    localStorage.setItem('ptah-chat-settings', '{corrupted_json');
    const url = getBaseUrl();
    expect(url).toBe('http://localhost:1234');
  });

  test('should expose recommended models with descriptive metadata', () => {
    expect(RECOMMENDED_MODELS.chat).toBeDefined();
    expect(RECOMMENDED_MODELS.image).toBeDefined();
    expect(RECOMMENDED_MODELS.image.id).toContain('DreamShaper');
  });

  test('should translate message using local completions endpoint', async () => {
    const mockTranslatedText = '"Saludos viajero," *dijo el guerrero con voz grave.*';
    global.fetch = jest.fn().mockImplementation((url) => {
      if (url.includes('/api/v0/models') || url.includes('/v1/models')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [{ id: 'mock-llm', state: 'loaded' }] })
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: mockTranslatedText } }]
        })
      });
    });

    const res = await translateChatMessage({
      text: '"Greetings traveler," *said the warrior in a deep voice.*',
      targetLanguage: 'es'
    });

    expect(res).toBe(mockTranslatedText);
  });
});
