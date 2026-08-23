import { 
  loadChatSettings, 
  saveChatSettings, 
  DEFAULT_CHAT_SETTINGS, 
  loadAppData, 
  saveAppData,
  CHAT_SETTINGS_KEY 
} from './storage';

describe('Storage Module Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.restoreAllMocks();
  });

  test('loadChatSettings returns DEFAULT_CHAT_SETTINGS when localStorage is empty', () => {
    const settings = loadChatSettings();
    expect(settings).toEqual(DEFAULT_CHAT_SETTINGS);
    expect(settings.preferredLanguage).toBe('auto');
    expect(settings.lmStudioUrl).toBe('http://localhost:1234');
    expect(settings.sendOnShiftEnter).toBe(true);
    expect(settings.showLocationBackground).toBe(true);
    expect(settings.showCharacterSidebar).toBe(true);
    expect(settings.chatBackgroundOpacity).toBe(0.85);
    expect(settings.preferredImageModel).toBe('DreamShaperXL_Lightning.safetensors');
  });

  test('saveChatSettings correctly writes to localStorage and loadChatSettings retrieves it', () => {
    const custom = {
      ...DEFAULT_CHAT_SETTINGS,
      preferredLanguage: 'Français',
      lmStudioUrl: 'http://127.0.0.1:9999',
      sendOnShiftEnter: false,
      preferredImageModel: 'v6.safetensors'
    };
    saveChatSettings(custom);

    const loaded = loadChatSettings();
    expect(loaded.preferredLanguage).toBe('Français');
    expect(loaded.lmStudioUrl).toBe('http://127.0.0.1:9999');
    expect(loaded.sendOnShiftEnter).toBe(false);
    expect(loaded.preferredImageModel).toBe('v6.safetensors');
  });

  test('loadChatSettings safely recovers from corrupted JSON in localStorage', () => {
    localStorage.setItem(CHAT_SETTINGS_KEY, '{invalid_json');
    const settings = loadChatSettings();
    expect(settings).toEqual(DEFAULT_CHAT_SETTINGS);
    expect(settings.sendOnShiftEnter).toBe(true);
  });

  test('loadChatSettings preserves sendOnShiftEnter as true when legacy settings object lacks it', () => {
    const legacy = { preferredModel: 'legacy-model', preferredLanguage: 'es' };
    localStorage.setItem(CHAT_SETTINGS_KEY, JSON.stringify(legacy));
    const settings = loadChatSettings();
    expect(settings.preferredModel).toBe('legacy-model');
    expect(settings.sendOnShiftEnter).toBe(true);
  });

  test('loadAppData returns default structure and persists updates', () => {
    const initial = loadAppData();
    expect(initial.scenarios).toEqual([]);
    expect(initial.cards).toEqual([]);

    const updated = {
      scenarios: [{ id: 's1', title: 'Test Scenario' }],
      cards: [],
      narrators: [],
      tools: []
    };
    saveAppData(updated);

    const loaded = loadAppData();
    expect(loaded.scenarios.length).toBe(1);
    expect(loaded.scenarios[0].title).toBe('Test Scenario');
  });
});
