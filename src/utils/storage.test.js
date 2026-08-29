/**
 * @jest-environment jsdom
 */
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
    expect(settings.llmServerUrl).toBe('http://localhost:3001');
    expect(settings.sendOnShiftEnter).toBe(true);
    expect(settings.showLocationBackground).toBe(true);
    expect(settings.showCharacterSidebar).toBe(true);
    expect(settings.chatBackgroundOpacity).toBe(0.85);
    expect(settings.preferredImageModel).toBe('malaAnimeMixNSFW_v70WithoutVAE.safetensors');
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

  test('relinkAllCreationsToUser correctly attributes unassigned and legacy creations to active user', () => {
    const { relinkAllCreationsToUser } = require('./storage');
    const mockUser = {
      id: 'usr-azgael',
      username: 'Azgael',
      userKey: 'PTAH-34FA-2C91-422F-98A1'
    };

    const initialData = {
      scenarios: [
        { id: 'sc-1', title: 'World 1' }, // No creator
        { id: 'sc-2', title: 'World 2', creatorName: 'Creador Ptah' }, // Legacy name
        { id: 'sc-3', title: 'World 3', creatorId: 'other-user', creatorName: 'Other' } // Different user
      ],
      cards: [
        { id: 'c-1', name: 'Char 1', type: 'Personaje' }
      ],
      narrators: [
        { id: 'n-1', name: 'Narrator 1' }
      ],
      tools: []
    };

    const { data: updated, modifiedCount } = relinkAllCreationsToUser(initialData, mockUser);
    expect(modifiedCount).toBe(4);
    expect(updated.scenarios[0].creatorId).toBe('usr-azgael');
    expect(updated.scenarios[0].creatorName).toBe('Azgael');
    expect(updated.scenarios[0].creatorKey).toBe('PTAH-34FA-2C91-422F-98A1');
    expect(updated.scenarios[1].creatorName).toBe('Azgael');
    expect(updated.scenarios[2].creatorId).toBe('other-user'); // Preserved
    expect(updated.cards[0].creatorName).toBe('Azgael');
    expect(updated.narrators[0].creatorName).toBe('Azgael');
  });
});

