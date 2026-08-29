import { getBaseUrl } from './lmstudio';

describe('LM Studio URL Resolution Tests', () => {
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
      preferredLanguage: 'Español',
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
    
    // Should fall back to default URL rather than throwing an exception
    const url = getBaseUrl();
    expect(url).toBe('http://localhost:3001');
  });
});
