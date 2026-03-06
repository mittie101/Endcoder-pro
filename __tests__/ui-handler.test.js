// Test the pure utility functions of UIHandler

// Mock DOM APIs
global.document = {
  getElementById: jest.fn(() => null),
  querySelectorAll: jest.fn(() => []),
  querySelector: jest.fn(() => null),
  addEventListener: jest.fn(),
  body: {
    style: {},
    classList: { toggle: jest.fn() },
    setAttribute: jest.fn(),
    removeAttribute: jest.fn(),
    getAttribute: jest.fn()
  },
  createElement: jest.fn(() => ({
    className: '',
    textContent: '',
    style: {},
    classList: { add: jest.fn(), remove: jest.fn() },
    appendChild: jest.fn(),
    remove: jest.fn()
  }))
};

global.window = {};
global.monaco = {
  editor: {
    setTheme: jest.fn()
  }
};

// Load UIHandler - use Function constructor to expose class from browser-style file
const fs = require('fs');
const code = fs.readFileSync(require('path').join(__dirname, '..', 'ui-handler.js'), 'utf8');
const UIHandler = new Function('document', 'monaco', code + '\nreturn UIHandler;')(global.document, global.monaco);

describe('UIHandler', () => {
  let ui;

  beforeEach(() => {
    ui = new UIHandler();
    jest.clearAllMocks();
  });

  describe('formatBytes', () => {
    test('formats 0 bytes', () => {
      expect(ui.formatBytes(0)).toBe('0 Bytes');
    });

    test('formats bytes (< 1KB)', () => {
      expect(ui.formatBytes(500)).toBe('500 Bytes');
    });

    test('formats KB', () => {
      expect(ui.formatBytes(1024)).toBe('1 KB');
      expect(ui.formatBytes(1536)).toBe('1.5 KB');
    });

    test('formats MB', () => {
      expect(ui.formatBytes(1048576)).toBe('1 MB');
      expect(ui.formatBytes(5242880)).toBe('5 MB');
    });

    test('formats GB', () => {
      expect(ui.formatBytes(1073741824)).toBe('1 GB');
    });
  });

  describe('formatNumber', () => {
    test('formats small numbers', () => {
      expect(ui.formatNumber(42)).toBe('42');
    });

    test('formats large numbers with locale separators', () => {
      const result = ui.formatNumber(1234567);
      // The exact format depends on locale, but should contain digits
      expect(result).toContain('1');
      expect(result).toContain('234');
      expect(result).toContain('567');
    });
  });

  describe('setMonacoEditor / getMonacoEditor', () => {
    test('stores and retrieves editors', () => {
      const mockEditor = { getValue: jest.fn() };
      ui.setMonacoEditor('input', mockEditor);
      expect(ui.getMonacoEditor('input')).toBe(mockEditor);
    });

    test('returns null for unset editor', () => {
      expect(ui.getMonacoEditor('nonexistent')).toBeUndefined();
    });
  });

  describe('constructor defaults', () => {
    test('starts on encoder tab', () => {
      expect(ui.currentTab).toBe('encoder');
    });

    test('starts in dark mode', () => {
      expect(ui.isDarkMode).toBe(true);
    });

    test('has null editors', () => {
      expect(ui.getMonacoEditor('input')).toBeNull();
      expect(ui.getMonacoEditor('output')).toBeNull();
    });
  });

  describe('updateMonacoTheme', () => {
    test('sets vs-dark when in dark mode', () => {
      ui.isDarkMode = true;
      ui.updateMonacoTheme();
      expect(monaco.editor.setTheme).toHaveBeenCalledWith('vs-dark');
    });

    test('sets vs when in light mode', () => {
      ui.isDarkMode = false;
      ui.updateMonacoTheme();
      expect(monaco.editor.setTheme).toHaveBeenCalledWith('vs');
    });
  });
});
