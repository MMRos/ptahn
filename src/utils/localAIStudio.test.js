import { getBaseUrl, resolveModelId, translateChatMessage, translateVisualPromptToEnglish, RECOMMENDED_MODELS } from './localAIStudio';

describe('Local AI Studio Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.restoreAllMocks();
  });

  test('should return fallback default URL when localStorage is empty', () => {
    const url = getBaseUrl();
    expect(url).toBe('http://localhost:3001');
  });

  test('should return custom URL from localStorage when configured', () => {
    const mockSettings = {
      preferredModel: 'deepseek-r1-distill-qwen-7b',
      preferredLanguage: 'auto',
      responseLength: 1000,
      llmServerUrl: 'http://127.0.0.1:62594'
    };
    localStorage.setItem('ptah-chat-settings', JSON.stringify(mockSettings));

    const url = getBaseUrl();
    expect(url).toBe('http://127.0.0.1:62594');
  });

  test('should strip trailing slash from resolved URL', () => {
    const mockSettings = {
      llmServerUrl: 'http://127.0.0.1:62594/'
    };
    localStorage.setItem('ptah-chat-settings', JSON.stringify(mockSettings));

    const url = getBaseUrl();
    expect(url).toBe('http://127.0.0.1:62594');
  });

  test('should prioritize passed baseUrl argument over localStorage', () => {
    const mockSettings = {
      llmServerUrl: 'http://127.0.0.1:62594'
    };
    localStorage.setItem('ptah-chat-settings', JSON.stringify(mockSettings));

    const url = getBaseUrl('http://127.0.0.1:12345');
    expect(url).toBe('http://127.0.0.1:12345');
  });

  test('should safely handle corrupted localStorage JSON', () => {
    localStorage.setItem('ptah-chat-settings', '{corrupted_json');
    const url = getBaseUrl();
    expect(url).toBe('http://localhost:3001');
  });

  test('should expose recommended models with descriptive metadata', () => {
    expect(RECOMMENDED_MODELS.chat).toBeDefined();
    expect(RECOMMENDED_MODELS.orchestrator).toBeDefined();
    expect(RECOMMENDED_MODELS.chat.id).toContain('Precog-Magnum-31B');
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

  test('should translate visual prompt to English SDXL tags via LLM completions', async () => {
    const mockEnglishTags = '1man, solo, muscular anthro horse, equine humanoid, brown mane hair, alert horse ears, dark intelligent eyes, leather loincloth, mismatched plate armor, holding spiked mace, warrior';
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
          choices: [{ message: { content: `<think>Translating</think>${mockEnglishTags}` } }]
        })
      });
    });

    const prompt = 'Kaelen es un alfa équido colosal, melena castaña, taparrabos de cuero, armadura de placas, maza de pinchos.';
    const res = await translateVisualPromptToEnglish(prompt, 'Anime / Ilustración Estilizada 2.5D');

    expect(res).toContain('1man, solo, muscular anthro horse');
    expect(res).toContain('holding spiked mace');
    expect(res).toContain('stylized 2.5D anime concept art');
    expect(res).toContain('cinematic illumination');
  });

  test('should fallback gracefully to heuristic visual dictionary if LLM is unreachable', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));

    const prompt = 'Kaelen alfa équido colosal con taparrabos de cuero y maza de pinchos';
    const res = await translateVisualPromptToEnglish(prompt, 'Fantasía Oscura');

    expect(res).toContain('muscular anthro horse stallion, equine humanoid');
    expect(res).toContain('towering colossal muscular build');
    expect(res).toContain('rugged leather loincloth');
    expect(res).toContain('lethal spiked iron mace weapon');
    expect(res).toContain('dark fantasy aesthetic');
  });
});
