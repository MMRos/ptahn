const fs = require('fs');
const path = require('path');
const {
  initDocumentEngine,
  createCampaign,
  branchCampaign,
  saveCampaignMemory,
  getCampaignMemories
} = require('../storage/documentEngine');
const { appendJsonlLine } = require('../storage/jsonlStorage');

const TEST_ROOT = path.join(__dirname, '__test_branching_data__');

describe('Campaign Branching & Tagged Memories (with Source Messages Context)', () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_ROOT)) {
      fs.rmSync(TEST_ROOT, { recursive: true, force: true });
    }
    initDocumentEngine({ dataDir: TEST_ROOT });
  });

  afterAll(() => {
    if (fs.existsSync(TEST_ROOT)) {
      fs.rmSync(TEST_ROOT, { recursive: true, force: true });
    }
  });

  test('branchCampaign forks at message K, copying exact lines, state snapshot and earlier memories', () => {
    const origCampaign = createCampaign({
      scenarioId: 'sc_taberna',
      title: 'Aventura en la Taberna'
    });

    const chatFile = path.join(TEST_ROOT, 'campaigns', origCampaign.id, 'chats', 'main.jsonl');
    
    // Simulate 10 chat messages
    for (let i = 1; i <= 10; i++) {
      appendJsonlLine(chatFile, {
        id: `msg_${i}`,
        turn: i,
        role: i % 2 === 1 ? 'user' : 'assistant',
        content: `Línea ${i}`
      });
    }

    // Set entity state in original campaign at turn 5
    const stateFile = path.join(TEST_ROOT, 'campaigns', origCampaign.id, 'states', 'player.state.json');
    fs.writeFileSync(stateFile, JSON.stringify({ hp: 85, gold: 50 }));

    // Add memories: one at turn 3, one at turn 8
    saveCampaignMemory(origCampaign.id, {
      id: 'mem_early',
      turn_range: [2, 3],
      title: 'Pacto con el tabernero',
      tags: ['taberna', 'pacto'],
      source_context: {
        message_ids: ['msg_2', 'msg_3'],
        trigger_excerpt: 'El tabernero asintió...'
      }
    });

    saveCampaignMemory(origCampaign.id, {
      id: 'mem_late',
      turn_range: [7, 8],
      title: 'Traición en el callejón',
      tags: ['callejon', 'combate'],
      source_context: {
        message_ids: ['msg_7', 'msg_8'],
        trigger_excerpt: 'Un asesino saltó...'
      }
    });

    // Execute branching at message 5
    const branched = branchCampaign({
      sourceCampaignId: origCampaign.id,
      branchTurn: 5,
      newTitle: 'Taberna (Ruta Alternativa)'
    });

    expect(branched).toBeDefined();
    expect(branched.id).not.toBe(origCampaign.id);

    // Verify branched chat has exactly 5 lines
    const branchChatFile = path.join(TEST_ROOT, 'campaigns', branched.id, 'chats', 'main.jsonl');
    expect(fs.existsSync(branchChatFile)).toBe(true);
    const lines = fs.readFileSync(branchChatFile, 'utf-8').trim().split('\n');
    expect(lines.length).toBe(5);
    expect(JSON.parse(lines[4]).id).toBe('msg_5');

    // Verify state was copied
    const branchStateFile = path.join(TEST_ROOT, 'campaigns', branched.id, 'states', 'player.state.json');
    expect(fs.existsSync(branchStateFile)).toBe(true);
    const branchedState = JSON.parse(fs.readFileSync(branchStateFile, 'utf-8'));
    expect(branchedState.hp).toBe(85);

    // Verify memories: early memory (turn 3) is included, late memory (turn 8) is excluded
    const branchMemories = getCampaignMemories(branched.id);
    expect(branchMemories.some(m => m.id === 'mem_early')).toBe(true);
    expect(branchMemories.some(m => m.id === 'mem_late')).toBe(false);

    // Verify source context in memory
    const earlyMem = branchMemories.find(m => m.id === 'mem_early');
    expect(earlyMem.source_context.message_ids).toEqual(['msg_2', 'msg_3']);
  });
});
