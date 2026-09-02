/**
 * sceneStateTracker.js
 * 
 * Environmental State Tracking & Message Turn Indexing (F048).
 * Tracks physical location, primary active entity, time of day, and weather
 * across roleplay turns with state inertia and inheritance.
 */

const TIME_OF_DAY_PATTERNS = [
  { name: 'Medianoche', pattern: /\b(medianoche)\b/i },
  { name: 'Madrugada', pattern: /\b(madrugada|altas horas)\b/i },
  { name: 'Atardecer', pattern: /\b(atardecer|crep[uú]sculo|ocaso|se pone el sol|sol se oculta|caída del sol)\b/i },
  { name: 'Amanecer', pattern: /\b(amanecer|alba|aurora|primeras luces|sale el sol|se eleva sobre el horizonte|amaneciendo)\b/i },
  { name: 'Mediodía', pattern: /\b(mediod[ií]a|pleno mediod[ií]a|sol en el c[eé]nit)\b/i },
  { name: 'Noche', pattern: /\b(noche|anochecer|cae la noche|oscuridad nocturna|bajo las estrellas|luna llena)\b/i },
  { name: 'Mañana', pattern: /\b(mañana|a primera hora|media mañana|temprano)\b/i },
  { name: 'Tarde', pattern: /\b(tarde|por la tarde|media tarde|caer la tarde)\b/i }
];

const WEATHER_PATTERNS = [
  { name: 'Tormenta', pattern: /\b(tormenta|trueno[s]?|rel[aá]mpago[s]?|tempestad|rayos)\b/i },
  { name: 'Lluvioso', pattern: /\b(lluvia|lloviendo|llovizna|chubasco|aguacero|diluvio)\b/i },
  { name: 'Nevada / Helada', pattern: /\b(nieve|nevando|nevada|ventisca|escarcha|hielo polar|helada)\b/i },
  { name: 'Niebla / Bruma', pattern: /\b(niebla|bruma|neblina|densa niebla)\b/i },
  { name: 'Viento fuerte', pattern: /\b(viento sopla|vendaval|hurac[aá]n|viento a[uú]lla|ráfagas de viento|fuerte viento)\b/i },
  { name: 'Despejado', pattern: /\b(cielo despejado|soleado|sol radiante|cielo azul|sin nubes)\b/i },
  { name: 'Nublado', pattern: /\b(nublado|cielo gris|nubes densas|encapotado|cielo plomizo)\b/i }
];

const NATURAL_ENVIRONMENT_PATTERNS = [
  { name: 'Claro del bosque', pattern: /\b(claro rodeado de [aá]rboles|claro del bosque|claro en el bosque)\b/i },
  { name: 'Llanura', pattern: /\b(llanura|pradera|prado|estepa|campo abierto)\b/i },
  { name: 'Cueva', pattern: /\b(cueva|caverna|gruta|subterr[aá]neo)\b/i },
  { name: 'Bosque', pattern: /\b(bosque|arboleda|selva|espesura|fronda)\b/i },
  { name: 'Colina', pattern: /\b(colina|cima de la colina|loma)\b/i },
  { name: 'Montaña', pattern: /\b(monta[ñn]a|cordillera|pico|cumbre|risco)\b/i },
  { name: 'Camino', pattern: /\b(camino|sendero|ruta|carretera)\b/i },
  { name: 'Valle', pattern: /\b(valle|ca[ñn][oó]n|desfiladero)\b/i },
  { name: 'Taberna', pattern: /\b(taberna|posada|cantina|bar)\b/i },
  { name: 'Despacho', pattern: /\b(despacho|oficina|estudio)\b/i },
  { name: 'Habitación', pattern: /\b(habitaci[oó]n|dormitorio|alcoba|aposento)\b/i },
  { name: 'Castillo', pattern: /\b(castillo|fortaleza|torre[oó]n|palacio)\b/i },
  { name: 'Pueblo / Aldea', pattern: /\b(pueblo|aldea|villa|asentamiento)\b/i },
  { name: 'Ciudad', pattern: /\b(ciudad|calle|plaza|mercado)\b/i },
  { name: 'Costa / Playa', pattern: /\b(costa|playa|orilla|mar|oc[eé]ano|puerto)\b/i },
  { name: 'Río / Lago', pattern: /\b(r[ií]o|lago|laguna|arroyo|riachuelo)\b/i }
];

/**
 * Detects natural / open environment cues from narrative text when no location card is active.
 * @param {string} text 
 * @returns {string|null}
 */
export function detectNaturalEnvironment(text = '') {
  if (!text || typeof text !== 'string') return null;
  for (const item of NATURAL_ENVIRONMENT_PATTERNS) {
    if (item.pattern.test(text)) {
      return item.name;
    }
  }
  return null;
}

/**
 * Detects time of day cues from narrative text.
 * @param {string} text 
 * @returns {string|null}
 */
export function detectTimeOfDay(text = '') {
  if (!text || typeof text !== 'string') return null;
  for (const item of TIME_OF_DAY_PATTERNS) {
    if (item.pattern.test(text)) {
      return item.name;
    }
  }
  return null;
}

/**
 * Detects atmospheric / weather cues from narrative text.
 * @param {string} text 
 * @returns {string|null}
 */
export function detectWeather(text = '') {
  if (!text || typeof text !== 'string') return null;
  for (const item of WEATHER_PATTERNS) {
    if (item.pattern.test(text)) {
      return item.name;
    }
  }
  return null;
}

/**
 * Resolves the environmental scene state by combining detected cues,
 * inbound analysis, and the previous state with physical inertia.
 * 
 * @param {Object} params
 * @returns {Object}
 */
export function resolveSceneState({
  previousState = null,
  inboundContext = {},
  currentText = '',
  scenario = null,
  currentTurn = null
} = {}) {
  const detectedTime = detectTimeOfDay(currentText) || detectTimeOfDay(inboundContext?.contextSummary || '');
  const detectedWeather = detectWeather(currentText) || detectWeather(inboundContext?.contextSummary || '');
  const detectedEnv = detectNaturalEnvironment(currentText) || 
                      detectNaturalEnvironment(scenario?.presentation || scenario?.intro || '');

  // Inherit or update time of day
  const timeOfDay = detectedTime || 
                    previousState?.timeOfDay || 
                    detectTimeOfDay(scenario?.intro || '') || 
                    'Día';

  // Inherit or update weather
  const weather = detectedWeather || 
                  previousState?.weather || 
                  detectWeather(scenario?.intro || '') || 
                  'Despejado';

  // Inherit or update location (Prioridad: Tarjeta activa invocada -> Inercia previa -> Entorno natural detectado -> Título de escenario)
  const location = inboundContext?.activeLocation || 
                   previousState?.location || 
                   detectedEnv ||
                   scenario?.title || 
                   null;

  // Primary target focus
  const primaryTarget = inboundContext?.primaryTarget || 
                        previousState?.primaryTarget || 
                        null;

  const targetType = inboundContext?.targetType || 
                     previousState?.targetType || 
                     null;

  const targetTraits = inboundContext?.targetTraits || 
                       previousState?.targetTraits || 
                       [];

  const activeEntities = inboundContext?.activeEntities || 
                         previousState?.activeEntities || 
                         (primaryTarget ? [primaryTarget] : []);

  const turn = (currentTurn !== null && currentTurn !== undefined)
    ? currentTurn
    : (previousState?.turn !== undefined ? previousState.turn + 1 : 0);

  return {
    turn,
    location,
    primaryTarget,
    targetType,
    targetTraits,
    activeEntities,
    timeOfDay,
    weather,
    updatedAt: new Date().toISOString()
  };
}

/**
 * Ensures all messages in an array have sequential monotonically increasing turn indices.
 * @param {Array<Object>} messages 
 * @returns {Array<Object>}
 */
export function normalizeMessageTurns(messages = []) {
  if (!Array.isArray(messages)) return [];
  return messages.map((m, idx) => ({
    ...m,
    turn: (m.turn !== undefined && typeof m.turn === 'number') ? m.turn : idx
  }));
}
