import { getAIBaseUrl, resolveAIModel } from './aiClient';

describe('aiClient Utilities', () => {
  test('getAIBaseUrl returns trimmed customUrl when provided', () => {
    const url = getAIBaseUrl('http://192.168.1.50:1234///');
    expect(url).toBe('http://192.168.1.50:1234');
  });

  test('getAIBaseUrl returns valid configured or default URL when nothing provided', () => {
    const url = getAIBaseUrl(null);
    expect(url.startsWith('http://')).toBe(true);
  });

  test('resolveAIModel returns preferredModelId when provided', async () => {
    const model = await resolveAIModel('my-custom-model-7b');
    expect(model).toBe('my-custom-model-7b');
  });
});
