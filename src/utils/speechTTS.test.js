import { speakBrowserUtterance, cancelBrowserSpeech, getBrowserVoices } from './speechTTS';

describe('SpeechTTS Engine Tests', () => {
  let mockSpeak;
  let mockCancel;
  let mockGetVoices;

  beforeEach(() => {
    mockSpeak = jest.fn();
    mockCancel = jest.fn();
    mockGetVoices = jest.fn().mockReturnValue([
      { voiceURI: 'Microsoft Helena - Spanish (Spain)', lang: 'es-ES', name: 'Helena' },
      { voiceURI: 'Google US English', lang: 'en-US', name: 'Google US' }
    ]);

    window.speechSynthesis = {
      speak: mockSpeak,
      cancel: mockCancel,
      getVoices: mockGetVoices
    };

    // Polyfill SpeechSynthesisUtterance for testing
    global.SpeechSynthesisUtterance = class {
      constructor(text) {
        this.text = text;
        this.pitch = 1.0;
        this.rate = 1.0;
        this.lang = 'es-ES';
      }
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('cancelBrowserSpeech invokes window.speechSynthesis.cancel', () => {
    cancelBrowserSpeech();
    expect(mockCancel).toHaveBeenCalled();
  });

  test('getBrowserVoices returns available voices', () => {
    const voices = getBrowserVoices();
    expect(voices.length).toBe(2);
    expect(voices[0].name).toBe('Helena');
  });

  test('speakBrowserUtterance cancels previous speech and starts utterance with matched voice', () => {
    const onEndMock = jest.fn();
    const utterance = speakBrowserUtterance({
      text: 'Saludos aventurero',
      voiceURI: 'Google US English',
      pitch: 1.2,
      rate: 0.9,
      onEnd: onEndMock
    });

    expect(mockCancel).toHaveBeenCalled();
    expect(utterance).toBeDefined();
    expect(utterance.text).toBe('Saludos aventurero');
    expect(utterance.voice.name).toBe('Google US');
    expect(utterance.pitch).toBe(1.2);
    expect(utterance.rate).toBe(0.9);
    expect(mockSpeak).toHaveBeenCalledWith(utterance);
  });

  test('speakBrowserUtterance gracefully calls onEnd when text is empty', () => {
    const onEndMock = jest.fn();
    const result = speakBrowserUtterance({ text: '', onEnd: onEndMock });
    expect(result).toBeNull();
    expect(onEndMock).toHaveBeenCalled();
  });
});
