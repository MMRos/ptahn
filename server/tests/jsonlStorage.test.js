const fs = require('fs');
const path = require('path');
const {
  appendJsonlLine,
  readJsonlTail,
  readJsonlPaginated,
  sliceJsonl
} = require('../storage/jsonlStorage');

const TEST_DIR = path.join(__dirname, '__test_jsonl_data__');

describe('JSONL Storage Engine (Append-Only O(1) & Tail)', () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TEST_DIR, { recursive: true });
  });

  afterAll(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  test('appendJsonlLine appends records atomically one line at a time', () => {
    const file = path.join(TEST_DIR, 'session.jsonl');
    const msg1 = { id: 'm1', role: 'user', content: 'Hola' };
    const msg2 = { id: 'm2', role: 'assistant', content: '¿Qué tal?' };

    expect(appendJsonlLine(file, msg1)).toBe(true);
    expect(appendJsonlLine(file, msg2)).toBe(true);

    const content = fs.readFileSync(file, 'utf-8').trim().split('\n');
    expect(content.length).toBe(2);
    expect(JSON.parse(content[0])).toEqual(msg1);
    expect(JSON.parse(content[1])).toEqual(msg2);
  });

  test('readJsonlTail retrieves only the last N messages efficiently', () => {
    const file = path.join(TEST_DIR, 'session.jsonl');
    for (let i = 1; i <= 10; i++) {
      appendJsonlLine(file, { turn: i, text: `Mensaje ${i}` });
    }

    const tail = readJsonlTail(file, 3);
    expect(tail.length).toBe(3);
    expect(tail[0].turn).toBe(8);
    expect(tail[1].turn).toBe(9);
    expect(tail[2].turn).toBe(10);
  });

  test('readJsonlPaginated returns messages with limit and offset', () => {
    const file = path.join(TEST_DIR, 'session.jsonl');
    for (let i = 1; i <= 20; i++) {
      appendJsonlLine(file, { id: `m_${i}`, turn: i });
    }

    const page1 = readJsonlPaginated(file, { limit: 5, offset: 0 });
    expect(page1.messages.length).toBe(5);
    expect(page1.total).toBe(20);
    expect(page1.messages[0].turn).toBe(1);

    const page2 = readJsonlPaginated(file, { limit: 5, offset: 5 });
    expect(page2.messages[0].turn).toBe(6);
  });

  test('sliceJsonl cuts exactly lines 1 to K into a new file for branching', () => {
    const source = path.join(TEST_DIR, 'original.jsonl');
    const target = path.join(TEST_DIR, 'branch.jsonl');
    for (let i = 1; i <= 15; i++) {
      appendJsonlLine(source, { id: `m_${i}`, text: `Turn ${i}` });
    }

    const result = sliceJsonl(source, target, 7);
    expect(result).toBe(true);
    expect(fs.existsSync(target)).toBe(true);

    const branchLines = fs.readFileSync(target, 'utf-8').trim().split('\n');
    expect(branchLines.length).toBe(7);
    expect(JSON.parse(branchLines[6]).id).toBe('m_7');
  });
});
