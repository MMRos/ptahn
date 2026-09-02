import * as serverApi from './serverApi';
import { 
  parseOrchestratorInboundJSON,
  parseOrchestratorOutboundJSON,
  deduplicateVisualAssets,
  formatFinalNarrativeWithTags,
  executeInboundOrchestration
} from './orchestratorPipeline';

jest.mock('./serverApi');

describe('orchestratorPipeline utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    if (serverApi.getServerBaseUrl && serverApi.getServerBaseUrl.mockReturnValue) {
      serverApi.getServerBaseUrl.mockReturnValue('http://localhost:3001');
    }
    if (serverApi.requestRerank && serverApi.requestRerank.mockImplementation) {
      serverApi.requestRerank.mockImplementation(async (query = '', candidates = []) => {
        const scores = {};
        const lowerQuery = query.toLowerCase();
        candidates.forEach(c => {
          const title = (c.title || '').toLowerCase();
          const text = (c.text || '').toLowerCase();
          if (title && lowerQuery.includes(title)) {
            scores[c.id || c.title] = 0.85;
          } else if (text.includes('lobo') && lowerQuery.includes('lobo')) {
            scores[c.id || c.title] = 0.80;
          } else if (text.includes('claro') && lowerQuery.includes('claro')) {
            scores[c.id || c.title] = 0.75;
          } else {
            scores[c.id || c.title] = 0.12;
          }
        });
        return scores;
      });
    }
  });
  describe('parseOrchestratorInboundJSON', () => {
    test('parses clean json block from inbound SLM response', () => {
      const rawOutput = `\`\`\`json
{
  "translatedInput": "Hello, is anyone in the workshop?",
  "semanticScores": {
    "card-1": 0.95,
    "card-2": 0.10
  },
  "contextSummary": "Player arrives at the workshop seeking assistance.",
  "sceneContext": {
    "currentLocation": "The Workshop",
    "activeCharacters": ["Azgael"]
  }
}
\`\`\``;

      const parsed = parseOrchestratorInboundJSON(rawOutput, 'Hola, ¿hay alguien en el taller?');
      expect(parsed.translatedInput).toBe('Hello, is anyone in the workshop?');
      expect(parsed.semanticScores['card-1']).toBe(0.95);
      expect(parsed.contextSummary).toContain('Player arrives');
    });

    test('falls back gracefully on malformed json', () => {
      const rawOutput = 'Some non-json response text';
      const parsed = parseOrchestratorInboundJSON(rawOutput, 'Texto de fallback');

      expect(parsed.translatedInput).toBe('Texto de fallback');
      expect(parsed.semanticScores).toEqual({});
    });
  });

  describe('parseOrchestratorOutboundJSON', () => {
    test('parses valid outbound JSON structure', () => {
      const rawOutput = JSON.stringify({
        formattedText: '*Azgael levantó la vista.* "Bienvenido a la forja."',
        areaA_expression: { characterName: 'Azgael', expression: 'concentrado' },
        areaB_location: { locationName: 'La Forja' },
        discoveredEntities: [
          { name: 'Martillo Rúnico', type: 'Objeto', summary: 'Martillo grabado con runas.' }
        ],
        diffusionTasks: [
          { targetName: 'Martillo Rúnico', prompt: 'glowing runic hammer, fantasy smithy' }
        ]
      });

      const parsed = parseOrchestratorOutboundJSON(rawOutput, 'Fallback narrative');
      expect(parsed.formattedText).toContain('Bienvenido a la forja.');
      expect(parsed.areaA_expression.characterName).toBe('Azgael');
      expect(parsed.discoveredEntities.length).toBe(1);
    });
  });

  describe('deduplicateVisualAssets', () => {
    const existingCards = [
      {
        id: 'c-loc-1',
        title: 'La Ciudadela',
        type: 'Lugar',
        cover: 'https://example.com/ciudadela.jpg'
      },
      {
        id: 'c-npc-1',
        title: 'Aria',
        type: 'Personaje',
        cover: 'https://example.com/aria.jpg',
        images: [{ id: 'img-1', url: 'https://example.com/aria.jpg', label: 'Normal' }]
      }
    ];

    test('suppresses diffusion task and reuses existing cover if entity already has image', () => {
      const diffusionTasks = [
        { targetName: 'La Ciudadela', prompt: 'fantasy citadel wallpaper' },
        { targetName: 'Bosque Sombrío', prompt: 'dark mystical forest' }
      ];

      const result = deduplicateVisualAssets(diffusionTasks, existingCards);

      // La Ciudadela already has cover, should be marked shouldGenerate: false
      const ciudadelaTask = result.find(t => t.targetName === 'La Ciudadela');
      expect(ciudadelaTask.shouldGenerate).toBe(false);
      expect(ciudadelaTask.existingAssetUrl).toBe('https://example.com/ciudadela.jpg');

      // Bosque Sombrío is brand new, should be marked shouldGenerate: true
      const bosqueTask = result.find(t => t.targetName === 'Bosque Sombrío');
      expect(bosqueTask.shouldGenerate).toBe(true);
      expect(bosqueTask.existingAssetUrl).toBeNull();
    });
  });

  describe('formatFinalNarrativeWithTags', () => {
    test('preserves dialogue quotes and asterisks correctly', () => {
      const text = '"Hola forjador," *dijo mientras observaba la espada.* ~Parece muy afilada.~';
      const formatted = formatFinalNarrativeWithTags(text);

      expect(formatted).toContain('"Hola forjador,"');
      expect(formatted).toContain('*dijo mientras observaba la espada.*');
      expect(formatted).toContain('~Parece muy afilada.~');
    });
  });

  describe('executeInboundOrchestration with reranker and sceneContext', () => {
    test('identifies primary target and anchors sceneContext for user actions', async () => {
      const cards = [
        { id: 'c-wolf', title: 'Lobo Gris', type: 'Personaje', traits: ['Feroz', 'Depredador'], intro: 'Gran lobo gris merodeando' },
        { id: 'c-glade', title: 'Claro en la Llanura', type: 'Lugar', intro: 'Claro abierto rodeado de árboles' },
        { id: 'c-elf', title: 'Elfa Oscura', type: 'Personaje', traits: ['Hechicera'], intro: 'Enemiga de piel pálida' }
      ];

      const result = await executeInboundOrchestration({
        userMessage: 'coloco el sable en su yugular dejando que lo note',
        cards,
        recentMessages: [
          { from: 'narrator', text: 'Un gran lobo gris gruñe amenazante en el claro.' }
        ]
      });

      expect(result).toBeDefined();
      expect(result.sceneContext).toBeDefined();
      expect(result.sceneContext.primaryTarget).toBe('Lobo Gris');
      expect(result.sceneContext.targetType).toBe('Personaje');
      expect(result.sceneContext.activeLocation).toBe('Claro en la Llanura');
      expect(result.filteredCards.length).toBeGreaterThan(0);
    });

    test('Branch 3a: when no cards are invoked, returns empty filteredCards and preserves natural scenario environment without forcing unmentioned dungeons', async () => {
      const scenario = {
        title: 'Rising an Empire',
        presentation: 'El viento sopla con fuerza sobre la llanura, llevando el polvo. Estás de pie en el centro de un claro rodeado de árboles...'
      };
      // Scenario only has unmentioned races and dungeons
      const cards = [
        { id: 'c-dungeon', title: 'Mazmorras errantes', type: 'Lugar', activationMode: 'dynamic', intro: 'Mazmorra mágica que cambia de lugar' },
        { id: 'c-elf', title: 'Elfos', type: 'Raza', activationMode: 'dynamic', intro: 'Raza antigua y orgullosa' }
      ];

      const result = await executeInboundOrchestration({
        userMessage: 'Desenfundo el sable y lo extiendo hacia él. Soy un vampiro con sangre vieja.',
        cards,
        recentMessages: [
          { from: 'narrator', text: 'El viento sopla sobre la llanura... Un gran lobo gris acecha en el claro de los árboles.' }
        ],
        scenario,
        currentTurn: 1
      });

      // Branch 3a: No cards were invoked by mention or semantic threshold
      expect(result.filteredCards).toHaveLength(0);
      // Location MUST NOT be forced to "Mazmorras errantes"
      expect(result.sceneContext.activeLocation).not.toBe('Mazmorras errantes');
      // Location must be the natural environment detected from scenario ("Claro del bosque" or "Llanura")
      expect(['Claro del bosque', 'Llanura']).toContain(result.sceneContext.activeLocation);
    });

    test('Branch 3b: when a card is invoked, only that card is included and uninvoked facets remain natural', async () => {
      const scenario = {
        title: 'Rising an Empire',
        presentation: 'El viento sopla con fuerza sobre la llanura...'
      };
      const cards = [
        { id: 'c-beast', title: 'Bestiálidos', type: 'Raza', activationMode: 'dynamic', intro: 'Criaturas híbridas y fieras' },
        { id: 'c-dungeon', title: 'Mazmorras errantes', type: 'Lugar', activationMode: 'dynamic', intro: 'Mazmorra mágica que cambia de lugar' }
      ];

      const result = await executeInboundOrchestration({
        userMessage: 'Sospecho que este lobo es un ejemplar de los Bestiálidos.',
        cards,
        recentMessages: [
          { from: 'narrator', text: 'El lobo gruñe en la llanura solitaria.' }
        ],
        scenario,
        currentTurn: 1
      });

      // Branch 3b: Bestiálidos is invoked by explicit mention
      expect(result.filteredCards.map(c => c.title)).toContain('Bestiálidos');
      // Mazmorras errantes was NOT invoked and must NOT be in filteredCards
      expect(result.filteredCards.map(c => c.title)).not.toContain('Mazmorras errantes');
      // Location must still be Llanura, NOT Mazmorras errantes
      expect(result.sceneContext.activeLocation).toBe('Llanura');
    });
  });
});
