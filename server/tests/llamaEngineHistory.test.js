const { llamaEngine } = require('../engine/llamaEngine');

describe('LlamaEngine Conversational History Validation', () => {
  test('llamaEngine status is accessible and healthy', () => {
    const status = llamaEngine.getStatus();
    expect(status).toHaveProperty('isNativeLoaded');
    expect(status).toHaveProperty('activeModel');
    expect(status).toHaveProperty('status');
  });

  test('generateCompletion rejects when messages array is invalid', async () => {
    await expect(llamaEngine.generateCompletion(null)).rejects.toThrow('messages array is required');
  }, 15000);
});
