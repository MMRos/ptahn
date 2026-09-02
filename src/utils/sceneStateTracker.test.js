import {
  detectTimeOfDay,
  detectWeather,
  detectNaturalEnvironment,
  resolveSceneState,
  normalizeMessageTurns
} from './sceneStateTracker';

describe('sceneStateTracker Utility (F048)', () => {
  describe('detectTimeOfDay', () => {
    test('detects morning / sunrise cues', () => {
      expect(detectTimeOfDay('El sol se eleva sobre el horizonte, pintando el cielo de naranja y rosado.')).toBe('Amanecer');
      expect(detectTimeOfDay('A primera hora de la mañana partimos.')).toBe('Mañana');
    });

    test('detects noon / afternoon / evening cues', () => {
      expect(detectTimeOfDay('El sol abrasa en pleno mediodía.')).toBe('Mediodía');
      expect(detectTimeOfDay('Durante la tarde exploramos los alrededores.')).toBe('Tarde');
      expect(detectTimeOfDay('El ocaso tiñe las nubes en el crepúsculo.')).toBe('Atardecer');
    });

    test('detects night / midnight / dawn cues', () => {
      expect(detectTimeOfDay('Bajo la noche oscura caminamos en silencio.')).toBe('Noche');
      expect(detectTimeOfDay('Llegó la medianoche sin novedad.')).toBe('Medianoche');
      expect(detectTimeOfDay('En la fría madrugada antes del alba.')).toBe('Madrugada');
    });

    test('returns null when no temporal cues are present', () => {
      expect(detectTimeOfDay('Desenvaino mi sable y miro al frente.')).toBeNull();
    });
  });

  describe('detectWeather', () => {
    test('detects wind, storm, and rain cues', () => {
      expect(detectWeather('El viento sopla con fuerza sobre la llanura llevando el polvo.')).toBe('Viento fuerte');
      expect(detectWeather('Truenos y relámpagos anuncian una violenta tormenta.')).toBe('Tormenta');
      expect(detectWeather('Una lluvia constante cae sobre las hojas.')).toBe('Lluvioso');
    });

    test('detects fog, snow, and clear skies', () => {
      expect(detectWeather('Una densa niebla reduce la visibilidad a pocos metros.')).toBe('Niebla / Bruma');
      expect(detectWeather('La ventisca de nieve hiela nuestros rostros.')).toBe('Nevada / Helada');
      expect(detectWeather('El cielo despejado y soleado nos acompaña.')).toBe('Despejado');
    });

    test('returns null when no atmospheric cues are present', () => {
      expect(detectWeather('Hablo con el herrero sobre la forja.')).toBeNull();
    });
  });

  describe('detectNaturalEnvironment', () => {
    test('detects open plains and forest clearing cues', () => {
      expect(detectNaturalEnvironment('El viento sopla con fuerza sobre la llanura, llevando el polvo.')).toBe('Llanura');
      expect(detectNaturalEnvironment('Estás de pie en el centro de un claro rodeado de árboles.')).toBe('Claro del bosque');
      expect(detectNaturalEnvironment('Nos adentramos en la espesura del bosque.')).toBe('Bosque');
    });

    test('detects mountainous, cavern, and urban interiors', () => {
      expect(detectNaturalEnvironment('Ascendemos por la ladera de la montaña.')).toBe('Montaña');
      expect(detectNaturalEnvironment('Entramos en una oscura cueva bajo el risco.')).toBe('Cueva');
      expect(detectNaturalEnvironment('Nos sentamos en la taberna ruidosa.')).toBe('Taberna');
    });

    test('returns null when no natural environment cues are present', () => {
      expect(detectNaturalEnvironment('Desenfundo el sable y miro al lobo con gesto neutro.')).toBeNull();
    });
  });

  describe('resolveSceneState with Inertia & Inheritance', () => {
    test('inherits previous timeOfDay and weather when current message lacks environmental cues', () => {
      const previousState = {
        location: 'Vallebruma',
        primaryTarget: 'Lobo Gris',
        timeOfDay: 'Amanecer',
        weather: 'Viento fuerte',
        turn: 1
      };

      const resolved = resolveSceneState({
        previousState,
        inboundContext: { primaryTarget: 'Lobo Gris', activeLocation: 'Vallebruma' },
        currentText: 'Coloco el sable en su yugular dejando que lo note.'
      });

      expect(resolved.location).toBe('Vallebruma');
      expect(resolved.timeOfDay).toBe('Amanecer');
      expect(resolved.weather).toBe('Viento fuerte');
      expect(resolved.primaryTarget).toBe('Lobo Gris');
    });

    test('updates timeOfDay and weather dynamically when new cues appear in the story', () => {
      const previousState = {
        location: 'Vallebruma',
        timeOfDay: 'Tarde',
        weather: 'Despejado',
        turn: 4
      };

      const resolved = resolveSceneState({
        previousState,
        inboundContext: { activeLocation: 'Cueva de Hielo' },
        currentText: 'Cae la noche cerrada mientras una densa niebla desciende sobre nosotros.'
      });

      expect(resolved.location).toBe('Cueva de Hielo');
      expect(resolved.timeOfDay).toBe('Noche');
      expect(resolved.weather).toBe('Niebla / Bruma');
    });

    test('extracts natural environment from scenario presentation when no location card is provided and no previous location exists', () => {
      const scenario = {
        title: 'Rising an Empire',
        presentation: 'El viento sopla con fuerza sobre la llanura... Estás de pie en el centro de un claro rodeado de árboles...'
      };

      const resolved = resolveSceneState({
        previousState: null,
        inboundContext: { primaryTarget: 'Lobo', activeLocation: null },
        currentText: 'Desenfundo el sable y miro al lobo.',
        scenario,
        currentTurn: 1
      });

      // Debe detectar Claro del bosque (o Llanura) en vez del título genérico o inventarse una mazmorra
      expect(resolved.location).toBe('Claro del bosque');
      expect(resolved.primaryTarget).toBe('Lobo');
    });
  });

  describe('normalizeMessageTurns', () => {
    test('indexes message 0 for initial scenario message and counts sequentially', () => {
      const msgs = [
        { from: 'narrator', text: 'El viento sopla en la llanura...' },
        { from: 'user', text: 'Desenvaino mi sable.' },
        { from: 'ai', text: 'El lobo gruñe amenazante.' }
      ];

      const indexed = normalizeMessageTurns(msgs);
      expect(indexed[0].turn).toBe(0);
      expect(indexed[1].turn).toBe(1);
      expect(indexed[2].turn).toBe(2);
    });

    test('preserves existing turn indices when valid', () => {
      const msgs = [
        { from: 'narrator', text: 'Inicio', turn: 0 },
        { from: 'user', text: 'Acción 1', turn: 1 }
      ];
      const indexed = normalizeMessageTurns(msgs);
      expect(indexed[0].turn).toBe(0);
      expect(indexed[1].turn).toBe(1);
    });
  });
});
