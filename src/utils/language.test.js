import {
  detectLanguage,
  resolveTargetLanguage,
  getLanguageDirective,
  enrichImagePrompt,
  SUPPORTED_LANGUAGES
} from './language';

describe('Language Detection & Multilingual Management Tests', () => {
  test('should detect Spanish text accurately', () => {
    const text = 'El humanoide con rasgos lobunos esclavo está siendo azotado en una plaza.';
    expect(detectLanguage(text)).toBe('es');
  });

  test('should detect English text accurately', () => {
    const text = 'The enslaved wolfkin is being whipped in the central town square under the watchful eyes of the guards.';
    expect(detectLanguage(text)).toBe('en');
  });

  test('should detect French text accurately', () => {
    const text = 'Le guerrier solitaire marche dans la forêt sombre avec son épée étincelante.';
    expect(detectLanguage(text)).toBe('fr');
  });

  test('should detect German text accurately', () => {
    const text = 'Der Ritter reitet durch den dunklen Wald und sucht nach der alten Festung.';
    expect(detectLanguage(text)).toBe('de');
  });

  test('should detect Japanese text with CJK characters', () => {
    const text = '暗い森の中に潜む狼の戦士。';
    expect(detectLanguage(text)).toBe('ja');
  });

  test('should resolve target language when preference is auto', () => {
    const resolved = resolveTargetLanguage('auto', 'The knight enters the tavern.');
    expect(resolved.code).toBe('en');
  });

  test('should prioritize explicit user preference over input text', () => {
    const resolved = resolveTargetLanguage('English', 'Texto en español con palabras en castellano.');
    expect(resolved.code).toBe('en');
  });

  test('should generate correct language directive for LLM', () => {
    const lang = SUPPORTED_LANGUAGES.find(l => l.code === 'es');
    const directive = getLanguageDirective(lang);
    expect(directive).toContain('Español');
    expect(directive).toContain('MANDATORY OUTPUT LANGUAGE');
  });

  test('should enrich Dark Fantasy image prompt with volumetric lighting in English', () => {
    const prompt = 'humanoide con rasgos lobunos esclavo en una plaza';
    const enriched = enrichImagePrompt(prompt, 'Fantasía Oscura');
    
    // Should translate keywords and add volumetric lighting
    expect(enriched).toContain('enslaved captive in iron shackles');
    expect(enriched).toContain('dark fantasy aesthetic');
    expect(enriched).toContain('volumetric lighting');
    expect(enriched).toContain('chiaroscuro');
    expect(enriched).toContain('visible clear illumination');
  });
});
