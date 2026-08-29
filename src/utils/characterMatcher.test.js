import { 
  detectActiveCharacter, 
  matchCharacterExpression, 
  resolveLocationWallpaper 
} from './characterMatcher';

describe('characterMatcher utilities', () => {
  const mockCharacters = [
    {
      id: 'char-1',
      type: 'Personaje',
      title: 'Azgael',
      cover: 'https://example.com/azgael-default.jpg',
      images: [
        { id: 'img-1', url: 'https://example.com/azgael-default.jpg', label: 'Normal / Principal', isDefault: true },
        { id: 'img-2', url: 'https://example.com/azgael-battle.jpg', label: 'combate, enfadado, espada', isDefault: false },
        { id: 'img-3', url: 'https://example.com/azgael-laugh.jpg', label: 'alegre, sonriendo', isDefault: false }
      ]
    },
    {
      id: 'char-2',
      type: 'Personaje',
      title: 'Ty Lee',
      cover: 'https://example.com/tylee-default.jpg',
      images: [
        { id: 'img-tl-1', url: 'https://example.com/tylee-look.jpg', label: 'observando el entorno', isDefault: true },
        { id: 'img-tl-2', url: 'https://example.com/tylee-jump.jpg', label: 'saltando', isDefault: false },
        { id: 'img-tl-3', url: 'https://example.com/tylee-happy.jpg', label: 'alegre', isDefault: false },
        { id: 'img-tl-4', url: 'https://example.com/tylee-slave.jpg', label: 'esclava, sumisa', isDefault: false }
      ]
    }
  ];

  const mockLocations = [
    {
      id: 'loc-1',
      type: 'Lugar',
      title: 'La Forja',
      cover: 'https://example.com/forge-wallpaper.jpg'
    },
    {
      id: 'loc-2',
      type: 'Lugar',
      title: 'Plaza Mayor',
      cover: 'https://example.com/plaza-wallpaper.jpg'
    }
  ];

  const mockScenario = {
    id: 'scen-1',
    title: 'Tierra de bestias',
    cover: 'https://example.com/scenario-cover.jpg'
  };

  describe('detectActiveCharacter', () => {
    test('detects character mentioned with ==Markup== in the latest message', () => {
      const messages = [
        { from: 'user', text: 'Hola a todos.' },
        { from: 'narrator', text: 'En la plaza, ==Azgael== empuña su hacha de guerra con furia.' }
      ];
      const active = detectActiveCharacter(messages, mockCharacters);
      expect(active).toBeDefined();
      expect(active.title).toBe('Azgael');
    });

    test('detects character mentioned by plain name in the latest message', () => {
      const messages = [
        { from: 'narrator', text: 'Ty Lee da una voltereta rápida en el aire.' }
      ];
      const active = detectActiveCharacter(messages, mockCharacters);
      expect(active).toBeDefined();
      expect(active.title).toBe('Ty Lee');
    });

    test('falls back to default character or user character when no NPC is mentioned', () => {
      const userChar = { id: 'user-1', title: 'René', cover: 'https://example.com/rene.jpg' };
      const messages = [
        { from: 'narrator', text: 'El viento sopla suavemente entre los árboles solitarios.' }
      ];
      const active = detectActiveCharacter(messages, mockCharacters, userChar, mockCharacters[0]);
      expect(active).toBeDefined();
      expect(active.title).toBe('René');
    });
  });

  describe('matchCharacterExpression', () => {
    test('matches specific expression label from text action or emotion', () => {
      const char = mockCharacters[1]; // Ty Lee
      const messageText = '*Ty Lee salta alegre esquivando el ataque con una sonrisa.*';
      const matched = matchCharacterExpression(char, messageText);
      expect(matched).toBeDefined();
      expect(matched.label).toBe('alegre');
      expect(matched.url).toBe('https://example.com/tylee-happy.jpg');
    });

    test('matches multi-word label like "observando el entorno"', () => {
      const char = mockCharacters[1]; // Ty Lee
      const messageText = '*Permanece en silencio observando el entorno con curiosidad.*';
      const matched = matchCharacterExpression(char, messageText);
      expect(matched).toBeDefined();
      expect(matched.label).toBe('observando el entorno');
      expect(matched.url).toBe('https://example.com/tylee-look.jpg');
    });

    test('matches compound label keyword like "esclava" or "sumisa"', () => {
      const char = mockCharacters[1]; // Ty Lee
      const messageText = 'La mantienen como esclava encadenada en la celda.';
      const matched = matchCharacterExpression(char, messageText);
      expect(matched).toBeDefined();
      expect(matched.url).toBe('https://example.com/tylee-slave.jpg');
    });

    test('falls back to isDefault image when no expression keywords match', () => {
      const char = mockCharacters[0]; // Azgael
      const messageText = 'El silencio reina en la posada.';
      const matched = matchCharacterExpression(char, messageText);
      expect(matched).toBeDefined();
      expect(matched.url).toBe('https://example.com/azgael-default.jpg');
    });

    test('matches tags field (e.g. bikini, happy) using synonym expansion', () => {
      const charWithTags = {
        id: 'char-tags-1',
        title: 'Ty Lee',
        cover: 'https://example.com/tylee-default.jpg',
        images: [
          { id: 'img-1', url: 'https://example.com/tylee-default.jpg', label: 'Default', isDefault: true },
          { id: 'img-2', url: 'https://example.com/tylee-bikini.jpg', label: 'Playa', tags: 'bikini, happy', isDefault: false },
          { id: 'img-3', url: 'https://example.com/tylee-armor.jpg', label: 'Guerra', tags: 'armor, combat', isDefault: false }
        ]
      };

      const messageText = 'Ty Lee está nadando feliz en el mar con su traje de baño.';
      const matched = matchCharacterExpression(charWithTags, messageText);
      expect(matched).toBeDefined();
      expect(matched.url).toBe('https://example.com/tylee-bikini.jpg');
    });

    test('matches English tags for characters experiencing pleasure in underwear', () => {
      const mariChar = {
        id: 'char-mari',
        title: 'Mari Setogaya',
        cover: 'https://example.com/mari-default.jpg',
        images: [
          { id: 'img-m1', url: 'https://example.com/mari-uniform-advancing.jpg', tags: 'highschool uniform, advancing to genitals', isDefault: true },
          { id: 'img-m2', url: 'https://example.com/mari-neko-heat.jpg', tags: 'nude, nekomimi form, in heat, pleading', isDefault: false },
          { id: 'img-m3', url: 'https://example.com/mari-ecstasy.jpg', tags: 'topless, panties, underwear, aroused, pleasure, seductive, bat wings', isDefault: false },
          { id: 'img-m4', url: 'https://example.com/mari-sport-knowing.jpg', tags: 'sport clothes, knowing look', isDefault: false }
        ]
      };

      // Test 1: Entrepierna / Genitales
      const advancingContext = 'Mari se arrastra por el suelo hacia su entrepierna con una mirada fija.';
      const matchedAdvancing = matchCharacterExpression(mariChar, advancingContext);
      expect(matchedAdvancing.url).toBe('https://example.com/mari-uniform-advancing.jpg');

      // Test 2: Nekomimi / En celo / Súplica
      const nekoHeatContext = 'Mari adopta su forma de gata nekomimi desnuda, ardiendo en celo y suplicando con ojos húmedos.';
      const matchedNeko = matchCharacterExpression(mariChar, nekoHeatContext);
      expect(matchedNeko.url).toBe('https://example.com/mari-neko-heat.jpg');

      // Test 3: Mirada cómplice / Sport
      const knowingContext = 'Mari te mira con ropa deportiva y una sonrisa cómplice sabiendo lo que planeas.';
      const matchedKnowing = matchCharacterExpression(mariChar, knowingContext);
      expect(matchedKnowing.url).toBe('https://example.com/mari-sport-knowing.jpg');
    });

    test('matches location multi-image variant with English tags like night, rain, ruins', () => {
      const locWithVariants = {
        id: 'loc-var-1',
        type: 'Lugar',
        title: 'Garrison',
        cover: 'https://example.com/garrison-day.jpg',
        images: [
          { id: 'img-g-1', url: 'https://example.com/garrison-day.jpg', label: 'Día', tags: 'day, sunny, intact', isDefault: true },
          { id: 'img-g-2', url: 'https://example.com/garrison-night-rain.jpg', label: 'Noche Lluvia', tags: 'night, rain, storm, ruins', isDefault: false }
        ]
      };

      const messages = [
        { from: 'narrator', text: 'Llegas a las murallas de Garrison bajo una intensa lluvia en plena noche oscura.' }
      ];

      const wallpaper = resolveLocationWallpaper(messages, mockScenario, [locWithVariants], { showLocationBackground: true });
      expect(wallpaper).toBe('https://example.com/garrison-night-rain.jpg');
    });
  });

  describe('resolveLocationWallpaper', () => {
    test('returns location card cover when location title is mentioned in recent messages', () => {
      const messages = [
        { from: 'user', text: 'Vamos hacia La Forja para reparar las armas.' }
      ];
      const wallpaper = resolveLocationWallpaper(messages, mockScenario, mockLocations, { showLocationBackground: true });
      expect(wallpaper).toBe('https://example.com/forge-wallpaper.jpg');
    });

    test('falls back to scenario cover when no location card is specifically mentioned', () => {
      const messages = [
        { from: 'user', text: 'Caminamos por el sendero rocoso.' }
      ];
      const wallpaper = resolveLocationWallpaper(messages, mockScenario, mockLocations, { showLocationBackground: true });
      expect(wallpaper).toBe('https://example.com/scenario-cover.jpg');
    });

    test('returns null when showLocationBackground is false', () => {
      const messages = [
        { from: 'user', text: 'Estamos en La Forja.' }
      ];
      const wallpaper = resolveLocationWallpaper(messages, mockScenario, mockLocations, { showLocationBackground: false });
      expect(wallpaper).toBeNull();
    });
  });
});
