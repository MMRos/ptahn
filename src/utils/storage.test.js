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
  });

  test('saveChatSettings correctly writes to localStorage and loadChatSettings retrieves it', () => {
    const custom = {
      ...DEFAULT_CHAT_SETTINGS,
      preferredLanguage: 'Français',
      lmStudioUrl: 'http://127.0.0.1:9999'
    };
    saveChatSettings(custom);

    const loaded = loadChatSettings();
    expect(loaded.preferredLanguage).toBe('Français');
    expect(loaded.lmStudioUrl).toBe('http://127.0.0.1:9999');
  });

  test('loadChatSettings safely recovers from corrupted JSON in localStorage', () => {
    localStorage.setItem(CHAT_SETTINGS_KEY, '{invalid_json');
    const settings = loadChatSettings();
    expect(settings).toEqual(DEFAULT_CHAT_SETTINGS);
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
