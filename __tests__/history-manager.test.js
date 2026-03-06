// Mock browser APIs
const localStorageData = {};
global.localStorage = {
  getItem: jest.fn((key) => localStorageData[key] || null),
  setItem: jest.fn((key, value) => { localStorageData[key] = value; }),
  removeItem: jest.fn((key) => { delete localStorageData[key]; }),
  clear: jest.fn(() => { Object.keys(localStorageData).forEach(k => delete localStorageData[k]); })
};

global.document = {
  getElementById: jest.fn(() => null),
  createElement: jest.fn(() => ({
    textContent: '',
    get innerHTML() {
      return this.textContent
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }
  }))
};

global.confirm = jest.fn(() => true);

// Load HistoryManager - use Function constructor to expose class from browser-style file
const fs = require('fs');
const code = fs.readFileSync(require('path').join(__dirname, '..', 'history-manager.js'), 'utf8');
const HistoryManager = new Function('localStorage', 'document', 'confirm', code + '\nreturn HistoryManager;')(global.localStorage, global.document, global.confirm);

describe('HistoryManager', () => {
  let manager;

  beforeEach(() => {
    localStorage.clear();
    Object.keys(localStorageData).forEach(k => delete localStorageData[k]);
    jest.clearAllMocks();
    manager = new HistoryManager();
  });

  test('starts with empty history', () => {
    expect(manager.getHistory()).toEqual([]);
  });

  test('addEntry adds to history', () => {
    manager.addEntry('encode', 'Hello', 'SGVsbG8=', 'base64');
    expect(manager.getHistory().length).toBe(1);
    expect(manager.getHistory()[0].type).toBe('encode');
    expect(manager.getHistory()[0].encoding).toBe('base64');
  });

  test('addEntry stores input/output truncated to 1000 chars', () => {
    const longInput = 'A'.repeat(2000);
    manager.addEntry('encode', longInput, 'output', 'base64');
    expect(manager.getHistory()[0].input.length).toBe(1000);
    expect(manager.getHistory()[0].inputSize).toBe(2000);
  });

  test('newest entries come first', () => {
    manager.addEntry('encode', 'first', 'out1', 'base64');
    manager.addEntry('decode', 'second', 'out2', 'hex');
    expect(manager.getHistory()[0].input).toBe('second');
    expect(manager.getHistory()[1].input).toBe('first');
  });

  test('limits to maxHistory entries', () => {
    manager.maxHistory = 5;
    for (let i = 0; i < 10; i++) {
      manager.addEntry('encode', `input${i}`, `output${i}`, 'base64');
    }
    expect(manager.getHistory().length).toBe(5);
  });

  test('clearHistory empties history', () => {
    manager.addEntry('encode', 'test', 'output', 'base64');
    manager.clearHistory();
    expect(manager.getHistory()).toEqual([]);
  });

  test('deleteEntry removes specific entry', () => {
    // Use jest.spyOn to make Date.now return different values
    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValueOnce(now).mockReturnValueOnce(now + 1);
    manager.addEntry('encode', 'keep', 'out1', 'base64');
    manager.addEntry('encode', 'delete', 'out2', 'hex');
    const idToDelete = manager.getHistory()[0].id;
    manager.deleteEntry(idToDelete);
    expect(manager.getHistory().length).toBe(1);
    expect(manager.getHistory()[0].input).toBe('keep');
    jest.restoreAllMocks();
  });

  test('restoreEntry returns entry by id', () => {
    manager.addEntry('encode', 'test', 'output', 'base64');
    const id = manager.getHistory()[0].id;
    const entry = manager.restoreEntry(id);
    expect(entry).not.toBeNull();
    expect(entry.input).toBe('test');
  });

  test('restoreEntry returns null for non-existent id', () => {
    expect(manager.restoreEntry(99999)).toBeNull();
  });

  test('saveHistory persists to localStorage', () => {
    manager.addEntry('encode', 'test', 'output', 'base64');
    expect(localStorage.setItem).toHaveBeenCalledWith(
      'conversionHistory',
      expect.any(String)
    );
  });

  test('loadHistory restores from localStorage', () => {
    const data = [{ id: 1, input: 'saved', output: 'data', encoding: 'base64', type: 'encode', timestamp: new Date().toISOString() }];
    localStorageData['conversionHistory'] = JSON.stringify(data);
    const newManager = new HistoryManager();
    expect(newManager.getHistory().length).toBe(1);
    expect(newManager.getHistory()[0].input).toBe('saved');
  });

  test('loadHistory handles corrupt data gracefully', () => {
    localStorageData['conversionHistory'] = 'not valid json{{{';
    const newManager = new HistoryManager();
    expect(newManager.getHistory()).toEqual([]);
  });

  test('formatTimestamp returns human-readable strings', () => {
    const now = new Date();
    expect(manager.formatTimestamp(now.toISOString())).toBe('Just now');

    const fiveMinAgo = new Date(now - 5 * 60000);
    expect(manager.formatTimestamp(fiveMinAgo.toISOString())).toBe('5m ago');

    const twoHoursAgo = new Date(now - 2 * 3600000);
    expect(manager.formatTimestamp(twoHoursAgo.toISOString())).toBe('2h ago');

    const threeDaysAgo = new Date(now - 3 * 86400000);
    expect(manager.formatTimestamp(threeDaysAgo.toISOString())).toBe('3d ago');
  });

  test('importHistory merges with existing', () => {
    manager.addEntry('encode', 'existing', 'out', 'base64');
    const importData = JSON.stringify([
      { id: 999, input: 'imported', output: 'data', encoding: 'hex', type: 'decode', timestamp: new Date().toISOString() }
    ]);
    const result = manager.importHistory(importData);
    expect(result).toBe(true);
    expect(manager.getHistory().length).toBe(2);
  });

  test('importHistory rejects invalid JSON', () => {
    const result = manager.importHistory('not json');
    expect(result).toBe(false);
  });

  test('importHistory rejects non-array', () => {
    const result = manager.importHistory(JSON.stringify({ not: 'array' }));
    expect(result).toBe(false);
  });

  test('escapeHtml escapes special characters', () => {
    const escaped = manager.escapeHtml('<script>alert("xss")</script>');
    expect(escaped).not.toContain('<script>');
  });
});
