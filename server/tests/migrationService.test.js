const fs = require('fs');
const path = require('path');
const { runMigrationIfNeeded } = require('../storage/migrationService');

const TEST_ROOT = path.join(__dirname, '__test_migration_data__');

describe('Migration Service (Non-Destructive & Zero-Touch Compliant)', () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_ROOT)) {
      fs.rmSync(TEST_ROOT, { recursive: true, force: true });
    }
    fs.mkdirSync(TEST_ROOT, { recursive: true });
  });

  afterAll(() => {
    if (fs.existsSync(TEST_ROOT)) {
      fs.rmSync(TEST_ROOT, { recursive: true, force: true });
    }
  });

  test('migrates appData.json and chats.json into library/ and campaigns/ creating an immutable backup', () => {
    // 1. Create simulated legacy appData.json
    const legacyAppData = {
      scenarios: [{ id: 'sc_legacy_1', title: 'Valle de Elden' }],
      cards: [
        { id: 'card_legacy_1', type: 'personaje', title: 'Ranma' },
        { id: 'card_legacy_2', type: 'lugar', title: 'Castillo Sombrío' }
      ],
      narrators: [{ id: 'narr_legacy_1', name: 'Cronista' }],
      tools: [{ id: 'tool_legacy_1', name: 'Dado d20' }]
    };
    fs.writeFileSync(path.join(TEST_ROOT, 'appData.json'), JSON.stringify(legacyAppData, null, 2));

    // 2. Create simulated legacy chats.json
    const legacyChats = [
      {
        id: 'chat_legacy_1',
        scenarioId: 'sc_legacy_1',
        messages: [
          { role: 'user', content: 'Entro al castillo' },
          { role: 'assistant', content: 'Las puertas chirrían' }
        ]
      }
    ];
    fs.writeFileSync(path.join(TEST_ROOT, 'chats.json'), JSON.stringify(legacyChats, null, 2));

    // 3. Run migration
    const result = runMigrationIfNeeded({ dataDir: TEST_ROOT });
    expect(result.migrated).toBe(true);

    // 4. Verify immutable backup created
    const backupsDir = path.join(TEST_ROOT, 'backups');
    expect(fs.existsSync(backupsDir)).toBe(true);
    const backupFiles = fs.readdirSync(backupsDir);
    expect(backupFiles.some(f => f.includes('legacy_appData_pre_f038'))).toBe(true);

    // 5. Verify library entities populated
    expect(fs.existsSync(path.join(TEST_ROOT, 'library', 'scenarios', 'sc_legacy_1.json'))).toBe(true);
    expect(fs.existsSync(path.join(TEST_ROOT, 'library', 'characters', 'card_legacy_1.json'))).toBe(true);
    expect(fs.existsSync(path.join(TEST_ROOT, 'library', 'lore', 'card_legacy_2.json'))).toBe(true);
    expect(fs.existsSync(path.join(TEST_ROOT, 'library', 'narrators', 'narr_legacy_1.json'))).toBe(true);

    // 6. Verify campaigns created from legacy chats
    const campaignsDir = path.join(TEST_ROOT, 'campaigns');
    expect(fs.existsSync(campaignsDir)).toBe(true);
    const campaignFolders = fs.readdirSync(campaignsDir);
    expect(campaignFolders.length).toBe(1);

    const migratedChat = path.join(campaignsDir, campaignFolders[0], 'chats', 'main.jsonl');
    expect(fs.existsSync(migratedChat)).toBe(true);
    const chatLines = fs.readFileSync(migratedChat, 'utf-8').trim().split('\n');
    expect(chatLines.length).toBe(2);

    // 7. Test Idempotency: Second run does nothing
    const secondRun = runMigrationIfNeeded({ dataDir: TEST_ROOT });
    expect(secondRun.migrated).toBe(false);
    expect(secondRun.reason).toBe('already_migrated');
  });
});
