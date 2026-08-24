/**
 * NSFW & Intimacy Dynamics Matrix
 * 
 * Determines behavioral resistance, eroticism thresholds, and content limits
 * based on the combination of Scenario NSFW and Character NSFW boolean flags.
 */

export const INTIMACY_PROFILES = {
  SFW_SCENARIO_SFW_CHAR: 'SFW_SCENARIO_SFW_CHAR',
  SFW_SCENARIO_NSFW_CHAR: 'SFW_SCENARIO_NSFW_CHAR',
  NSFW_SCENARIO_SFW_CHAR: 'NSFW_SCENARIO_SFW_CHAR',
  NSFW_SCENARIO_NSFW_CHAR: 'NSFW_SCENARIO_NSFW_CHAR'
};

/**
 * Resolves the specific intimacy and demeanor profile for a character given world and character NSFW flags.
 * 
 * @param {Object} params
 * @param {boolean} params.isScenarioNsfw
 * @param {boolean} params.isCharacterNsfw
 * @param {string} [params.characterName]
 * @returns {Object} { profileKey, label, behaviorDirective, worldLimitDirective }
 */
export function resolveCharacterIntimacyProfile({ isScenarioNsfw = false, isCharacterNsfw = false, characterName = 'El Personaje' }) {
  const isScenNsfw = Boolean(isScenarioNsfw);
  const isCharNsfw = Boolean(isCharacterNsfw);

  if (!isScenNsfw && !isCharNsfw) {
    return {
      profileKey: INTIMACY_PROFILES.SFW_SCENARIO_SFW_CHAR,
      label: 'Casto y Modesto (SFW / Puro)',
      worldLimitDirective: 'STRICT SFW: Graphic sexual acts or anatomical explicitness are FORBIDDEN.',
      behaviorDirective: `${characterName} behaves chastely and modestly. They maintain personal boundaries, do not initiate lustful advances, and react with natural decorum, shyness, or innocence toward inappropriate suggestions. Romance must remain wholesome and tender.`
    };
  }

  if (!isScenNsfw && isCharNsfw) {
    return {
      profileKey: INTIMACY_PROFILES.SFW_SCENARIO_NSFW_CHAR,
      label: 'Sensual, Sugerente y Ecchi (No Explícito)',
      worldLimitDirective: 'STRICT SFW WORLD LIMIT: Explicit adult anatomical acts are FORBIDDEN (Cap at Ecchi / Suggestive / Erotic allure).',
      behaviorDirective: `${characterName} is naturally sensual, flirtatious, teasing, and coquettish ("Ecchi"). They enjoy provocative banter, suggestive looks, and playful physical allure, but the scene must ALWAYS stop at the non-explicit boundary without crossing into graphic pornography.`
    };
  }

  if (isScenNsfw && !isCharNsfw) {
    return {
      profileKey: INTIMACY_PROFILES.NSFW_SCENARIO_SFW_CHAR,
      label: 'Reticente con Curva de Intimidad Creciente (Alta Resistencia Inicial)',
      worldLimitDirective: 'NSFW PERMITTED IN WORLD, BUT SUBJECT TO CHARACTER WILL AND CONSENT.',
      behaviorDirective: `${characterName} is NOT inherently NSFW and exhibits strong natural modesty, hesitation, or resistance. They will NOT engage in casual or immediate adult intimacy. Lowering their guard requires an emotional connection, gradual courtship, deep trust, genuine love, or significant, patient persuasion over time.`
    };
  }

  // isScenNsfw && isCharNsfw
  return {
    profileKey: INTIMACY_PROFILES.NSFW_SCENARIO_NSFW_CHAR,
    label: 'Desinhibido, Receptivo y Predispuesto',
    worldLimitDirective: 'NSFW WORLD & MATURE CONTENT PERMITTED.',
    behaviorDirective: `${characterName} is uninhibited, sexually open, and readily predisposed to passion. They have little to no resistance to romantic or physical intimacy, welcoming advances and adult encounters with natural enthusiasm and eager responsiveness.`
  };
}

/**
 * Builds the complete system prompt directive for the Game Master.
 * 
 * @param {Object} params
 * @param {Object} [params.scenario]
 * @param {Object} [params.userChar]
 * @param {Array} [params.npcs]
 * @returns {string}
 */
export function getNsfwDynamicsDirective({ scenario = null, userChar = null, npcs = [] }) {
  const isScenarioNsfw = Boolean(scenario?.nsfw);
  
  const worldSection = isScenarioNsfw
    ? `- SCENARIO CONTENT LIMIT: NSFW ENABLED (Mature & Adult Content Permitted). Explicit romantic/physical interactions are allowable, but each character's individual resistance and personality MUST be strictly respected.`
    : `- SCENARIO CONTENT LIMIT: SFW ONLY (Strictly Non-Explicit). NO graphic pornography or anatomical sexual descriptions are permitted. The ceiling of romantic tension is "Ecchi", sensual allure, or suggestive flirting, always fading to black or remaining non-explicit.`;

  const characterProfiles = [];

  if (userChar) {
    const charName = userChar.title || userChar.name || 'Player Character';
    const isCharNsfw = Boolean(userChar.nsfw);
    const profile = resolveCharacterIntimacyProfile({
      isScenarioNsfw,
      isCharacterNsfw: isCharNsfw,
      characterName: `Player Character (${charName})`
    });
    characterProfiles.push(`* [PLAYER {{user}} - ${charName}]: Dynamic = "${profile.label}".\n  Directive: ${profile.behaviorDirective}`);
  }

  if (Array.isArray(npcs) && npcs.length > 0) {
    npcs.forEach(npc => {
      const npcName = npc.title || npc.name || 'NPC';
      const isNpcNsfw = Boolean(npc.nsfw);
      const profile = resolveCharacterIntimacyProfile({
        isScenarioNsfw,
        isCharacterNsfw: isNpcNsfw,
        characterName: `NPC (${npcName})`
      });
      characterProfiles.push(`* [NPC - ${npcName}]: Dynamic = "${profile.label}".\n  Directive: ${profile.behaviorDirective}`);
    });
  }

  const profilesText = characterProfiles.length > 0
    ? `[CHARACTER INTIMACY & RESISTANCE PROFILES]:\n${characterProfiles.join('\n')}`
    : `[CHARACTER INTIMACY DYNAMICS]: Apply the scenario's standard modesty and boundaries based on character dispositions.`;

  return `
[NSFW, EROTICISM & INTIMACY DYNAMICS MATRIX]:
${worldSection}

${profilesText}

[KEY INVIOLABLE HARNESS PRINCIPLES ON INTIMACY]:
1. If the Scenario is NOT NSFW, explicit sexual content is STRICTLY FORBIDDEN. Maximum allowable tone is "Ecchi" / sensual flirting.
2. If a Character is NOT NSFW (SFW) in an NSFW Scenario, they are RETICENT and resistant; you must NEVER make them immediately compliant or easy. They demand a growing emotional curve, trust-building, affection, or convincing reasons before any intimacy.
3. If a Character IS NSFW in an NSFW Scenario, they are PREDISPOSED and uninhibited, yielding naturally and easily.
4. If a Character IS NSFW in an SFW Scenario, they are SUGGESTIVE / SENSUAL ("Ecchi"), but never cross into explicit acts.
`.trim();
}
