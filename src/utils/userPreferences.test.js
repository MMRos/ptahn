import { DEFAULT_CHAT_SETTINGS, loadChatSettings, saveChatSettings } from './storage';

describe('User Preferences & Settings Hydration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('DEFAULT_CHAT_SETTINGS includes nsfwAllowed flag and temperature', () => {
    expect(DEFAULT_CHAT_SETTINGS.nsfwAllowed).toBe(false);
    expect(DEFAULT_CHAT_SETTINGS.sendOnShiftEnter).toBe(true);
    expect(DEFAULT_CHAT_SETTINGS.temperature).toBe(0.70);
  });

  test('loadChatSettings properly parses and respects custom preferences', () => {
    const custom = {
      ...DEFAULT_CHAT_SETTINGS,
      nsfwAllowed: true,
      sendOnShiftEnter: false,
      fontFamily: 'mono',
      dialogueColor: '#e0b448',
      temperature: 1.15
    };
    saveChatSettings(custom);

    const loaded = loadChatSettings();
    expect(loaded.nsfwAllowed).toBe(true);
    expect(loaded.sendOnShiftEnter).toBe(false);
    expect(loaded.fontFamily).toBe('mono');
    expect(loaded.dialogueColor).toBe('#e0b448');
    expect(loaded.temperature).toBe(1.15);
  });
});
