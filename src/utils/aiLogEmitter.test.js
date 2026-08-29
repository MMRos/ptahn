import {
  emitAILog,
  getAILogs,
  clearAILogs,
  subscribeToAILogs
} from './aiLogEmitter';

describe('aiLogEmitter - Inter-AI Event Bus Tests', () => {
  beforeEach(() => {
    clearAILogs();
  });

  test('WHEN an event is emitted THEN it is recorded in logs buffer', () => {
    emitAILog({
      from: 'STORYTELLER_LLM',
      to: 'COMPENDIUM_EXTRACTOR',
      type: 'INTER_AI',
      summary: 'Story narrative sent for entity extraction',
      payload: { turnCount: 5 }
    });

    const logs = getAILogs();
    expect(logs.length).toBe(1);
    expect(logs[0].from).toBe('STORYTELLER_LLM');
    expect(logs[0].to).toBe('COMPENDIUM_EXTRACTOR');
    expect(logs[0].summary).toContain('Story narrative');
    expect(logs[0].timestamp).toBeDefined();
  });

  test('WHEN filtered by type THEN only matching logs are returned', () => {
    emitAILog({ from: 'STORYTELLER', to: 'EXTRACTOR', type: 'INTER_AI', summary: 'Extraction' });
    emitAILog({ from: 'TRANSLATOR', to: 'DIFFUSION', type: 'DIFFUSION_TASK', summary: 'Image prompt' });
    emitAILog({ from: 'NARRATOR', to: 'TTS', type: 'TTS_AUDIO', summary: 'Speech' });

    expect(getAILogs('ALL').length).toBe(3);
    expect(getAILogs('DIFFUSION_TASK').length).toBe(1);
    expect(getAILogs('DIFFUSION_TASK')[0].from).toBe('TRANSLATOR');
    expect(getAILogs('TTS_AUDIO').length).toBe(1);
  });

  test('WHEN subscriber is registered THEN it receives live updates', () => {
    const mockCallback = jest.fn();
    const unsubscribe = subscribeToAILogs(mockCallback);

    emitAILog({ from: 'EXTRACTOR', to: 'TRANSLATOR', type: 'INTER_AI', summary: 'Entity Kaelen' });

    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'EXTRACTOR',
        to: 'TRANSLATOR'
      }),
      expect.any(Array)
    );

    unsubscribe();
    emitAILog({ from: 'SYSTEM', to: 'ALL', type: 'INFO', summary: 'Second event' });
    expect(mockCallback).toHaveBeenCalledTimes(1);
  });

  test('WHEN exceeding 200 logs THEN oldest logs are pruned (circular buffer)', () => {
    for (let i = 0; i < 220; i++) {
      emitAILog({ from: 'AGENT', to: 'AGENT', type: 'INFO', summary: `Event ${i}` });
    }

    const logs = getAILogs();
    expect(logs.length).toBe(200);
    expect(logs[logs.length - 1].summary).toBe('Event 219');
    expect(logs[0].summary).toBe('Event 20');
  });

  test('WHEN clearAILogs is invoked THEN buffer is emptied', () => {
    emitAILog({ from: 'A', to: 'B', type: 'INFO', summary: 'Test' });
    expect(getAILogs().length).toBe(1);

    clearAILogs();
    expect(getAILogs().length).toBe(0);
  });
});
