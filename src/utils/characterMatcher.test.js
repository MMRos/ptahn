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

    test('handles characters without images array gracefully', () => {
      const bareChar = { id: 'bare', title: 'Bare NPC', cover: 'https://example.com/bare.jpg' };
      const matched = matchCharacterExpression(bareChar, 'Hola');
      expect(matched).toBeDefined();
      expect(matched.url).toBe('https://example.com/bare.jpg');
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
