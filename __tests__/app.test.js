// app.test.js - Tests for App class and escapeHtml
const fs = require('fs');
const path = require('path');

// ── helpers ──────────────────────────────────────────────────────────────────
function createMockEditor(initialValue = '') {
  let value = initialValue;
  const model = {
    getLineCount: () => (value.match(/\n/g) || []).length + 1,
    language: 'plaintext'
  };
  return {
    getValue: () => value,
    setValue: (v) => { value = v; },
    getModel: () => model,
    onDidChangeModelContent: jest.fn(),
    layout: jest.fn()
  };
}

// ── global mocks ──────────────────────────────────────────────────────────────
const mockMonaco = {
  editor: {
    create: jest.fn(() => createMockEditor()),
    setTheme: jest.fn(),
    setModelLanguage: jest.fn()
  }
};

const mockLocalStorage = (() => {
  let store = {};
  return {
    getItem: (k) => store[k] ?? null,
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { store = {}; },
    _store: () => store
  };
})();

const mockBody = {
  _attrs: {},
  getAttribute: function (a) { return this._attrs[a] ?? null; },
  setAttribute: function (a, v) { this._attrs[a] = v; },
  removeAttribute: function (a) { delete this._attrs[a]; },
  appendChild: jest.fn(),
  classList: { toggle: jest.fn(), add: jest.fn(), remove: jest.fn() },
  style: {}
};

const elements = {};
function getOrCreate(id) {
  if (!elements[id]) {
    elements[id] = {
      id,
      textContent: '',
      innerHTML: '',
      style: {},
      title: '',
      disabled: false,
      value: '',
      addEventListener: jest.fn(),
      classList: { toggle: jest.fn(), add: jest.fn(), remove: jest.fn() },
      options: [],
      querySelectorAll: jest.fn(() => []),
      closest: jest.fn(() => null),
      parentElement: null,
      appendChild: jest.fn()
    };
  }
  return elements[id];
}

const mockDocument = {
  getElementById: jest.fn((id) => getOrCreate(id)),
  querySelector: jest.fn(() => null),
  querySelectorAll: jest.fn(() => ({ forEach: jest.fn() })),
  createElement: jest.fn((tag) => ({
    tag,
    textContent: '',
    className: '',
    id: '',
    href: '',
    download: '',
    style: {},
    addEventListener: jest.fn(),
    click: jest.fn(),
    appendChild: jest.fn(),
    removeChild: jest.fn()
  })),
  body: mockBody,
  addEventListener: jest.fn()
};

const mockNavigator = {
  clipboard: { writeText: jest.fn().mockResolvedValue(undefined) }
};

const mockWindow = {
  addEventListener: jest.fn(),
  electronAPI: null
};

// Assign globals before loading app.js
global.monaco = mockMonaco;
global.document = mockDocument;
global.localStorage = mockLocalStorage;
global.navigator = mockNavigator;
global.window = mockWindow;
global.confirm = jest.fn(() => true);
global.TextEncoder = TextEncoder;

// ── mock dependency classes ───────────────────────────────────────────────────
class MockUIHandler {
  constructor() {
    this.editors = {};
  }
  init() {}
  setMonacoEditor(name, ed) { this.editors[name] = ed; }
  getMonacoEditor(name) { return this.editors[name] || null; }
  showNotification = jest.fn();
  showError = jest.fn();
  showSuccess = jest.fn();
  showLoading = jest.fn();
  updateStats = jest.fn();
  confirmAction = jest.fn(() => true);
  formatBytes = jest.fn((b) => `${b}B`);
  switchTab = jest.fn();
}

class MockConverter {
  encode = jest.fn((input, enc) => `encoded(${enc}:${input})`);
  decode = jest.fn((input, enc) => `decoded(${enc}:${input})`);
  detectEncoding = jest.fn(() => 'unknown');
}

class MockHistoryManager {
  addEntry = jest.fn();
  clearHistory = jest.fn();
  exportHistory = jest.fn();
  updateHistoryUI = jest.fn();
}

class MockJWTHandler {
  constructor() {}
  init() {}
}

class MockDiffTool {
  constructor() {}
  init() {}
}

class MockAdvancedFeatures {
  constructor() {}
  init() {}
}

// ── load app.js ───────────────────────────────────────────────────────────────
const appCode = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const { App } = new Function(
  'UIHandler', 'Converter', 'HistoryManager', 'JWTHandler', 'DiffTool', 'AdvancedFeatures',
  appCode + '\nreturn { App };'
)(MockUIHandler, MockConverter, MockHistoryManager, MockJWTHandler, MockDiffTool, MockAdvancedFeatures);

// escapeHtml now lives in utils/escape.js — load it from there
const escapeCode = fs.readFileSync(path.join(__dirname, '..', 'utils', 'escape.js'), 'utf8');
const { escapeHtml } = new Function(escapeCode + '\nreturn { escapeHtml };')();

// ── factory ───────────────────────────────────────────────────────────────────
function makeApp() {
  const app = new App();
  // Wire up mock editors so encode/decode/swap etc. can find them
  const inputEd = createMockEditor('hello');
  const outputEd = createMockEditor('');
  app.ui.setMonacoEditor('input', inputEd);
  app.ui.setMonacoEditor('output', outputEd);
  // Encode select element
  getOrCreate('encodingSelect').value = 'base64';
  return { app, inputEd, outputEd };
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('escapeHtml', () => {
  test('escapes ampersand', () => {
    expect(escapeHtml('a&b')).toBe('a&amp;b');
  });
  test('escapes less-than', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
  });
  test('escapes double quote', () => {
    expect(escapeHtml('"hi"')).toBe('&quot;hi&quot;');
  });
  test('escapes single quote', () => {
    expect(escapeHtml("it's")).toBe('it&#39;s');
  });
  test('converts non-strings', () => {
    expect(escapeHtml(42)).toBe('42');
    expect(escapeHtml(null)).toBe('null');
  });
  test('leaves safe text unchanged', () => {
    expect(escapeHtml('Hello World 123')).toBe('Hello World 123');
  });
  test('escapes multiple entities in one string', () => {
    expect(escapeHtml('<div class="x">a&b</div>')).toBe('&lt;div class=&quot;x&quot;&gt;a&amp;b&lt;/div&gt;');
  });
});

describe('App.updateStatusBar', () => {
  test('sets textContent on #statusBar element', () => {
    const { app } = makeApp();
    const el = getOrCreate('statusBar');
    app.updateStatusBar('Test message');
    expect(el.textContent).toBe('Test message');
  });
});

describe('App.swapInputOutput', () => {
  test('swaps values between input and output editors', () => {
    const { app, inputEd, outputEd } = makeApp();
    inputEd.setValue('INPUT');
    outputEd.setValue('OUTPUT');
    app.swapInputOutput();
    expect(inputEd.getValue()).toBe('OUTPUT');
    expect(outputEd.getValue()).toBe('INPUT');
  });

  test('shows success notification', () => {
    const { app } = makeApp();
    app.swapInputOutput();
    expect(app.ui.showNotification).toHaveBeenCalledWith(
      expect.stringContaining('swapped'), 'success'
    );
  });
});

describe('App.toggleTheme', () => {
  beforeEach(() => {
    mockBody._attrs = {};
    mockLocalStorage.clear();
  });

  test('switches to light theme when no theme set', () => {
    const { app } = makeApp();
    app.toggleTheme();
    expect(mockBody._attrs['data-theme']).toBe('light');
    expect(mockLocalStorage.getItem('theme')).toBe('light');
  });

  test('switches back to dark when light is active', () => {
    mockBody._attrs['data-theme'] = 'light';
    const { app } = makeApp();
    app.toggleTheme();
    expect(mockBody._attrs['data-theme']).toBeUndefined();
    expect(mockLocalStorage.getItem('theme')).toBe('dark');
  });

  test('calls updateMonacoTheme with correct theme', () => {
    const { app } = makeApp();
    app.toggleTheme(); // → light
    expect(mockMonaco.editor.setTheme).toHaveBeenLastCalledWith('vs');
    app.toggleTheme(); // → dark
    expect(mockMonaco.editor.setTheme).toHaveBeenLastCalledWith('vs-dark');
  });
});

describe('App.updateMonacoTheme', () => {
  test('calls monaco.editor.setTheme once with the given theme', () => {
    const { app } = makeApp();
    mockMonaco.editor.setTheme.mockClear();
    app.updateMonacoTheme('vs-dark');
    expect(mockMonaco.editor.setTheme).toHaveBeenCalledTimes(1);
    expect(mockMonaco.editor.setTheme).toHaveBeenCalledWith('vs-dark');
  });
});

describe('App pipeline', () => {
  test('addPipelineStep accumulates steps', () => {
    const { app } = makeApp();
    getOrCreate('pipelineEncoding').value = 'base64';
    getOrCreate('pipelineAction').value = 'encode';
    app.addPipelineStep();
    getOrCreate('pipelineEncoding').value = 'hex';
    getOrCreate('pipelineAction').value = 'decode';
    app.addPipelineStep();
    expect(app.pipelineSteps).toHaveLength(2);
    expect(app.pipelineSteps[0]).toEqual(expect.objectContaining({ encoding: 'base64', action: 'encode' }));
    expect(app.pipelineSteps[1]).toEqual(expect.objectContaining({ encoding: 'hex', action: 'decode' }));
  });

  test('clearPipeline empties steps array', () => {
    const { app } = makeApp();
    app.pipelineSteps = [{ encoding: 'base64', action: 'encode' }];
    app.clearPipeline();
    expect(app.pipelineSteps).toHaveLength(0);
  });

  test('runPipeline with no steps shows error', () => {
    const { app } = makeApp();
    app.pipelineSteps = [];
    app.runPipeline();
    expect(app.ui.showNotification).toHaveBeenCalledWith(
      expect.stringMatching(/step/i), 'error'
    );
  });

  test('runPipeline chains converter calls in order', () => {
    const { app, inputEd, outputEd } = makeApp();
    inputEd.setValue('start');
    app.pipelineSteps = [
      { encoding: 'base64', action: 'encode' },
      { encoding: 'hex', action: 'encode' }
    ];
    // Make encode return predictable values
    app.converter.encode
      .mockReturnValueOnce('step1')
      .mockReturnValueOnce('step2');

    app.runPipeline();

    expect(app.converter.encode).toHaveBeenNthCalledWith(1, 'start', 'base64');
    expect(app.converter.encode).toHaveBeenNthCalledWith(2, 'step1', 'hex');
    expect(outputEd.getValue()).toBe('step2');
  });

  test('runPipeline catches errors and shows notification', () => {
    const { app, inputEd } = makeApp();
    inputEd.setValue('start');
    app.pipelineSteps = [{ encoding: 'base64', action: 'encode' }];
    app.converter.encode.mockImplementationOnce(() => { throw new Error('bad'); });
    app.runPipeline();
    expect(app.ui.showNotification).toHaveBeenCalledWith(
      expect.stringContaining('Pipeline error'), 'error'
    );
  });
});

describe('App.encode', () => {
  test('calls converter.encode and sets output editor', async () => {
    const { app, inputEd, outputEd } = makeApp();
    inputEd.setValue('hello');
    app.converter.encode.mockReturnValue('ENCODED');
    await app.encode();
    expect(outputEd.getValue()).toBe('ENCODED');
    expect(app.ui.showSuccess).toHaveBeenCalledWith('Encoded successfully');
  });

  test('shows error when input is empty', async () => {
    const { app, inputEd } = makeApp();
    inputEd.setValue('');
    await app.encode();
    expect(app.ui.showError).toHaveBeenCalledWith(expect.stringMatching(/enter text/i));
  });

  test('records entry in history with correct args', async () => {
    const { app, inputEd } = makeApp();
    inputEd.setValue('test');
    app.converter.encode.mockReturnValue('RESULT');
    await app.encode();
    expect(app.history.addEntry).toHaveBeenCalledWith(
      'encode', 'test', 'RESULT', 'base64', expect.any(Object)
    );
  });

  test('shows error when converter throws', async () => {
    const { app, inputEd } = makeApp();
    inputEd.setValue('data');
    app.converter.encode.mockImplementation(() => { throw new Error('encode fail'); });
    await app.encode();
    expect(app.ui.showError).toHaveBeenCalledWith('encode fail');
  });
});

describe('App.decode', () => {
  test('calls converter.decode and sets output editor', async () => {
    const { app, inputEd, outputEd } = makeApp();
    inputEd.setValue('ENCODED');
    app.converter.decode.mockReturnValue('plain text');
    await app.decode();
    expect(outputEd.getValue()).toBe('plain text');
    expect(app.ui.showSuccess).toHaveBeenCalledWith('Decoded successfully');
  });

  test('auto-formats valid JSON output', async () => {
    const { app, inputEd, outputEd } = makeApp();
    inputEd.setValue('encoded');
    app.converter.decode.mockReturnValue('{"a":1}');
    await app.decode();
    expect(outputEd.getValue()).toBe(JSON.stringify({ a: 1 }, null, 2));
  });

  test('saves formatted JSON output to history (not raw)', async () => {
    const { app, inputEd } = makeApp();
    inputEd.setValue('encoded');
    app.converter.decode.mockReturnValue('{"x":2}');
    await app.decode();
    const formatted = JSON.stringify({ x: 2 }, null, 2);
    expect(app.history.addEntry).toHaveBeenCalledWith(
      'decode', 'encoded', formatted, 'base64', expect.any(Object)
    );
  });

  test('shows error when input is empty', async () => {
    const { app, inputEd } = makeApp();
    inputEd.setValue('');
    await app.decode();
    expect(app.ui.showError).toHaveBeenCalledWith(expect.stringMatching(/enter text/i));
  });

  test('shows error when converter throws', async () => {
    const { app, inputEd } = makeApp();
    inputEd.setValue('bad');
    app.converter.decode.mockImplementation(() => { throw new Error('decode fail'); });
    await app.decode();
    expect(app.ui.showError).toHaveBeenCalledWith('decode fail');
  });
});

describe('App.restoreFromHistory', () => {
  test('sets editor values and encoding select from history entry', () => {
    const { app, inputEd, outputEd } = makeApp();
    const entry = { input: 'IN', output: 'OUT', encoding: 'hex' };
    app.restoreFromHistory(entry);
    expect(inputEd.getValue()).toBe('IN');
    expect(outputEd.getValue()).toBe('OUT');
    expect(getOrCreate('encodingSelect').value).toBe('hex');
    expect(app.ui.showSuccess).toHaveBeenCalledWith('Restored from history');
  });

  test('switches to encoder tab', () => {
    const { app } = makeApp();
    app.restoreFromHistory({ input: 'x', output: 'y', encoding: 'base64' });
    expect(app.ui.switchTab).toHaveBeenCalledWith('encoder');
  });
});

describe('App.loadOptimizedImageIntoEncoder', () => {
  test('loads base64 into input, clears output, selects base64, and switches tab', () => {
    const { app, inputEd, outputEd } = makeApp();
    outputEd.setValue('stale output');
    getOrCreate('encodingSelect').value = 'hex';

    app.loadOptimizedImageIntoEncoder('YWJj');

    expect(inputEd.getValue()).toBe('YWJj');
    expect(outputEd.getValue()).toBe('');
    expect(getOrCreate('encodingSelect').value).toBe('base64');
    expect(app.ui.switchTab).toHaveBeenCalledWith('encoder');
    expect(app.ui.updateStats).toHaveBeenCalled();
  });
});

describe('App export functions', () => {
  test('exportAsPython escapes backslash', () => {
    const { app, outputEd } = makeApp();
    outputEd.setValue('a\\b');
    app.exportAsPython();
    expect(mockNavigator.clipboard.writeText).toHaveBeenCalledWith("data = b'a\\\\b'");
  });

  test('exportAsPython escapes newline', () => {
    const { app, outputEd } = makeApp();
    outputEd.setValue('line1\nline2');
    app.exportAsPython();
    expect(mockNavigator.clipboard.writeText).toHaveBeenCalledWith("data = b'line1\\nline2'");
  });

  test('exportAsPython escapes tab', () => {
    const { app, outputEd } = makeApp();
    outputEd.setValue('a\tb');
    app.exportAsPython();
    expect(mockNavigator.clipboard.writeText).toHaveBeenCalledWith("data = b'a\\tb'");
  });

  test('exportAsPython escapes single quote', () => {
    const { app, outputEd } = makeApp();
    outputEd.setValue("it's");
    app.exportAsPython();
    expect(mockNavigator.clipboard.writeText).toHaveBeenCalledWith("data = b'it\\'s'");
  });

  test('exportAsCSharp produces correct byte array syntax', () => {
    const { app, outputEd } = makeApp();
    outputEd.setValue('AB');
    app.exportAsCSharp();
    // 'A' = 0x41, 'B' = 0x42
    expect(mockNavigator.clipboard.writeText).toHaveBeenCalledWith(
      'byte[] data = new byte[] { 0x41, 0x42 };'
    );
  });

  test('exportAsJava produces correct cast byte array syntax', () => {
    const { app, outputEd } = makeApp();
    outputEd.setValue('AB');
    app.exportAsJava();
    expect(mockNavigator.clipboard.writeText).toHaveBeenCalledWith(
      'byte[] data = new byte[] { (byte)0x41, (byte)0x42 };'
    );
  });
});

describe('App.clearHistory', () => {
  test('calls history.clearHistory when confirmed', () => {
    const { app } = makeApp();
    app.ui.confirmAction.mockReturnValue(true);
    app.clearHistory();
    expect(app.history.clearHistory).toHaveBeenCalled();
  });

  test('does not clear when user cancels', () => {
    const { app } = makeApp();
    app.ui.confirmAction.mockReturnValue(false);
    app.clearHistory();
    expect(app.history.clearHistory).not.toHaveBeenCalled();
  });
});

describe('App.waitForMonaco', () => {
  test('resolves immediately if monaco already defined', async () => {
    global.monaco = mockMonaco; // already set
    const { app } = makeApp();
    await expect(app.waitForMonaco()).resolves.toBeUndefined();
  });
});
