import { 
  parseOrchestratorInboundJSON,
  parseOrchestratorOutboundJSON,
  deduplicateVisualAssets,
  formatFinalNarrativeWithTags
} from './orchestratorPipeline';

describe('orchestratorPipeline utility', () => {
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
});
