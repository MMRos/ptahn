import { 
  resolveCharacterIntimacyProfile, 
  getNsfwDynamicsDirective, 
  INTIMACY_PROFILES 
} from './nsfwDynamics';

describe('nsfwDynamics utility', () => {
  describe('resolveCharacterIntimacyProfile', () => {
    test('State 1: Scenario SFW + Character SFW => Casto y Modesto', () => {
      const profile = resolveCharacterIntimacyProfile({
        isScenarioNsfw: false,
        isCharacterNsfw: false,
        characterName: 'Aria'
      });

      expect(profile.profileKey).toBe(INTIMACY_PROFILES.SFW_SCENARIO_SFW_CHAR);
      expect(profile.label).toContain('Casto y Modesto');
      expect(profile.worldLimitDirective).toContain('STRICT SFW');
      expect(profile.behaviorDirective).toContain('chastely and modestly');
    });

    test('State 2: Scenario SFW + Character NSFW => Sensual, Sugerente y Ecchi', () => {
      const profile = resolveCharacterIntimacyProfile({
        isScenarioNsfw: false,
        isCharacterNsfw: true,
        characterName: 'Ty Lee'
      });

      expect(profile.profileKey).toBe(INTIMACY_PROFILES.SFW_SCENARIO_NSFW_CHAR);
      expect(profile.label).toContain('Sensual, Sugerente y Ecchi');
      expect(profile.worldLimitDirective).toContain('STRICT SFW WORLD LIMIT');
      expect(profile.behaviorDirective).toContain('flirtatious, teasing, and coquettish ("Ecchi")');
    });

    test('State 3: Scenario NSFW + Character SFW => Reticente con Curva de Intimidad Creciente', () => {
      const profile = resolveCharacterIntimacyProfile({
        isScenarioNsfw: true,
        isCharacterNsfw: false,
        characterName: 'Kaelen'
      });

      expect(profile.profileKey).toBe(INTIMACY_PROFILES.NSFW_SCENARIO_SFW_CHAR);
      expect(profile.label).toContain('Reticente con Curva de Intimidad Creciente');
      expect(profile.behaviorDirective).toContain('strong natural modesty, hesitation, or resistance');
      expect(profile.behaviorDirective).toContain('emotional connection, gradual courtship, deep trust');
    });

    test('State 4: Scenario NSFW + Character NSFW => Desinhibido y Predispuesto', () => {
      const profile = resolveCharacterIntimacyProfile({
        isScenarioNsfw: true,
        isCharacterNsfw: true,
        characterName: 'Lillith'
      });

      expect(profile.profileKey).toBe(INTIMACY_PROFILES.NSFW_SCENARIO_NSFW_CHAR);
      expect(profile.label).toContain('Desinhibido, Receptivo y Predispuesto');
      expect(profile.behaviorDirective).toContain('uninhibited, sexually open, and readily predisposed to passion');
    });
  });

  describe('getNsfwDynamicsDirective', () => {
    test('builds complete directive for SFW scenario with mixed characters', () => {
      const scenario = { title: 'La Ciudadela', nsfw: false };
      const userChar = { title: 'Azgael', nsfw: false };
      const npcs = [
        { title: 'Sacerdotisa Clara', nsfw: false },
        { title: 'Bailarina Carmín', nsfw: true }
      ];

      const directive = getNsfwDynamicsDirective({ scenario, userChar, npcs });

      expect(directive).toContain('SCENARIO CONTENT LIMIT: SFW ONLY');
      expect(directive).toContain('Player Character (Azgael)');
      expect(directive).toContain('Casto y Modesto');
      expect(directive).toContain('NPC (Bailarina Carmín)');
      expect(directive).toContain('Sensual, Sugerente y Ecchi');
    });

    test('builds complete directive for NSFW scenario with reticent and predisposed characters', () => {
      const scenario = { title: 'Valle del Placer', nsfw: true };
      const userChar = { title: 'Guerrero Puro', nsfw: false };
      const npcs = [
        { title: 'Súcubo Vespera', nsfw: true }
      ];

      const directive = getNsfwDynamicsDirective({ scenario, userChar, npcs });

      expect(directive).toContain('SCENARIO CONTENT LIMIT: NSFW ENABLED');
      expect(directive).toContain('Reticente con Curva de Intimidad Creciente');
      expect(directive).toContain('Desinhibido, Receptivo y Predispuesto');
    });
  });
});
