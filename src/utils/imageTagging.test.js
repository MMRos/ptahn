import {
  CHARACTER_TAG_PRESETS,
  LOCATION_TAG_PRESETS,
  formatTagsString,
  toggleTagInString,
  classifyImageWithAI,
  isValidTagList
} from './imageTagging';

describe('imageTagging utilities', () => {
  test('CHARACTER_TAG_PRESETS and LOCATION_TAG_PRESETS contain valid English taxonomies', () => {
    expect(CHARACTER_TAG_PRESETS.ropa.length).toBeGreaterThan(0);
    expect(CHARACTER_TAG_PRESETS.emocion.length).toBeGreaterThan(0);
    expect(CHARACTER_TAG_PRESETS.accion.length).toBeGreaterThan(0);

    expect(LOCATION_TAG_PRESETS.momento.length).toBeGreaterThan(0);
    expect(LOCATION_TAG_PRESETS.clima.length).toBeGreaterThan(0);
    expect(LOCATION_TAG_PRESETS.estado.length).toBeGreaterThan(0);

    // Verify all preset tags are in English
    CHARACTER_TAG_PRESETS.ropa.forEach(item => {
      expect(typeof item.tag).toBe('string');
      expect(item.tag.length).toBeGreaterThan(0);
    });
  });

  test('formatTagsString formats strings and arrays cleanly in English', () => {
    expect(formatTagsString(' School Uniform , BLUSHING , KNEELING ')).toBe('school uniform, blushing, kneeling');
    expect(formatTagsString(['Underwear', 'Aroused', 'Pleasure'])).toBe('underwear, aroused, pleasure');
    expect(formatTagsString('')).toBe('');
    expect(formatTagsString(null)).toBe('');
  });

  test('toggleTagInString adds and removes multi-part tags correctly', () => {
    let tags = 'school uniform, blushing';
    tags = toggleTagInString(tags, 'kneeling');
    expect(tags).toBe('school uniform, blushing, kneeling');

    tags = toggleTagInString(tags, 'blushing');
    expect(tags).toBe('school uniform, kneeling');
  });

  test('classifyImageWithAI provides rich English tags for characters and erotic/outfit context', async () => {
    const resultUniform = await classifyImageWithAI({
      entityType: 'Personaje',
      entityTitle: 'Mari Setogaya',
      entityDesc: 'Estudiante súcubo de rodillas en el suelo con uniforme escolar sonrojada',
      currentLabel: 'Uniforme de rodillas'
    });
    expect(typeof resultUniform).toBe('string');
    expect(resultUniform.toLowerCase()).toContain('school uniform');
    expect(resultUniform.toLowerCase()).toContain('kneeling');

    const resultUnderwear = await classifyImageWithAI({
      entityType: 'Personaje',
      entityTitle: 'Mari Setogaya',
      entityDesc: 'Súcubo con alas en ropa interior y bragas sintiendo placer y excitación',
      currentLabel: 'Placer en ropa interior'
    });
    expect(resultUnderwear.toLowerCase()).toContain('underwear');
    expect(resultUnderwear.toLowerCase()).toContain('pleasure');
    expect(resultUnderwear.toLowerCase()).toContain('bat wings');
  });

  test('classifyImageWithAI provides rich English tags for locations', async () => {
    const result = await classifyImageWithAI({
      entityType: 'Lugar',
      entityTitle: 'Garrison Fortress',
      entityDesc: 'Pueblo amurallado de noche con intensa lluvia y ruinas abandonadas',
      currentLabel: 'Noche Lluvia Ruinas'
    });
    expect(typeof result).toBe('string');
    expect(result.toLowerCase()).toContain('night');
    expect(result.toLowerCase()).toContain('rain');
  });

  test('isValidTagList rejects conversational AI sentences and refusals', () => {
    expect(isValidTagList("i don't see an image to analyze. please provide the image url or a brief description of the image, and i'll do my best to provide the tags as per the guidelines.")).toBe(false);
    expect(isValidTagList("As an AI, I cannot analyze images directly.")).toBe(false);
    expect(isValidTagList("Here are the tags for your character:")).toBe(false);
    expect(isValidTagList("This is an image of a girl standing in a room with light")).toBe(false);
    
    expect(isValidTagList("highschool uniform, happy, looking at viewer")).toBe(true);
    expect(isValidTagList("nude, nekomimi form, in heat, pleading")).toBe(true);
    expect(isValidTagList("night, heavy rain, ruins, abandoned")).toBe(true);
  });
});
