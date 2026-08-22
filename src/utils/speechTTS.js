/**
 * Speech Synthesis Engine (TTS) for Ptahn
 * Encapsulates browser Web Speech API with safe lifecycle management and event callbacks.
 */

/**
 * Safely cancels any ongoing or queued browser speech synthesis.
 */
export function cancelBrowserSpeech() {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {
      console.warn('[SpeechTTS]: Error cancelling speech synthesis:', e);
    }
  }
}

/**
 * Retrieves the available system voices from the browser.
 * @returns {SpeechSynthesisVoice[]}
 */
export function getBrowserVoices() {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    try {
      return window.speechSynthesis.getVoices() || [];
    } catch (e) {
      console.warn('[SpeechTTS]: Error fetching voices:', e);
    }
  }
  return [];
}

/**
 * Speaks text using the browser Web Speech API.
 * 
 * @param {Object} options
 * @param {string} options.text - Text to speak.
 * @param {string} [options.voiceURI] - Optional voice URI identifier.
 * @param {number} [options.pitch=1.0] - Voice pitch modifier (0.5 to 2.0).
 * @param {number} [options.rate=1.0] - Voice speed modifier (0.5 to 2.0).
 * @param {string} [options.lang='es-ES'] - Fallback language code.
 * @param {Function} [options.onStart] - Callback when speech starts.
 * @param {Function} [options.onEnd] - Callback when speech ends.
 * @param {Function} [options.onError] - Callback on speech error.
 * @returns {SpeechSynthesisUtterance|null}
 */
export function speakBrowserUtterance({
  text = '',
  voiceURI = '',
  pitch = 1.0,
  rate = 1.0,
  lang = 'es-ES',
  onStart = null,
  onEnd = null,
  onError = null
} = {}) {
  if (!text || typeof window === 'undefined' || !window.speechSynthesis) {
    if (onEnd) onEnd();
    return null;
  }

  cancelBrowserSpeech();

  try {
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = getBrowserVoices();

    if (voiceURI) {
      const selectedVoice = voices.find(v => v.voiceURI === voiceURI);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
        utterance.lang = selectedVoice.lang;
      } else {
        utterance.lang = lang;
      }
    } else {
      utterance.lang = lang;
    }

    utterance.pitch = typeof pitch === 'number' ? pitch : 1.0;
    utterance.rate = typeof rate === 'number' ? rate : 1.0;

    if (onStart) {
      utterance.onstart = onStart;
    }
    if (onEnd) {
      utterance.onend = onEnd;
    }
    if (onError) {
      utterance.onerror = onError;
    }

    window.speechSynthesis.speak(utterance);
    return utterance;
  } catch (error) {
    console.warn('[SpeechTTS]: Failed to execute speakBrowserUtterance:', error);
    if (onError) onError(error);
    if (onEnd) onEnd();
    return null;
  }
}
