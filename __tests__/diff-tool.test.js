// Test the pure computation functions of DiffTool

// Mock DOM APIs needed by DiffTool
global.document = {
  getElementById: jest.fn(() => null),
  createElement: jest.fn((tag) => {
    const el = {
      textContent: '',
      get innerHTML() {
        // Simple HTML escaping for test
        return this.textContent
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
      }
    };
    return el;
  })
};
global.window = {};

// Load DiffTool - use Function constructor to expose class from browser-style file
const fs = require('fs');
const code = fs.readFileSync(require('path').join(__dirname, '..', 'diff-tool.js'), 'utf8');
const DiffTool = new Function('document', code + '\nreturn DiffTool;')(global.document);

describe('DiffTool', () => {
  let diffTool;
  const mockUI = {
    showError: jest.fn(),
    showSuccess: jest.fn(),
    showLoading: jest.fn(),
    getMonacoEditor: jest.fn(() => null)
  };

  beforeEach(() => {
    diffTool = new DiffTool(mockUI); // eslint-disable-line no-use-before-define
    jest.clearAllMocks();
  });

  describe('computeCharDiff', () => {
    test('identical strings have 100% match', () => {
      const result = diffTool.computeCharDiff('hello', 'hello');
      expect(result.matchPercentage).toBe(100);
      expect(result.differences).toBe(0);
      expect(result.matches).toBe(5);
    });

    test('completely different strings have 0% match', () => {
      const result = diffTool.computeCharDiff('abc', 'xyz');
      expect(result.matchPercentage).toBe(0);
      expect(result.differences).toBe(3);
    });

    test('different length strings', () => {
      const result = diffTool.computeCharDiff('abc', 'abcdef');
      expect(result.matches).toBe(3);
      expect(result.differences).toBe(3);
      expect(result.matchPercentage).toBe(50);
    });

    test('empty strings have 0% match (no division by zero)', () => {
      const result = diffTool.computeCharDiff('', '');
      expect(result.matchPercentage).toBe(0);
      expect(result.differences).toBe(0);
    });

    test('one empty string', () => {
      const result = diffTool.computeCharDiff('hello', '');
      expect(result.differences).toBe(5);
      expect(result.matches).toBe(0);
    });

    test('produces highlighted arrays', () => {
      const result = diffTool.computeCharDiff('ab', 'ac');
      expect(result.leftHighlighted).toHaveLength(2);
      expect(result.leftHighlighted[0].type).toBe('match');
      expect(result.leftHighlighted[1].type).toBe('diff');
    });
  });

  describe('computeLineDiff', () => {
    test('identical content shows all matching lines', () => {
      const result = diffTool.computeLineDiff('line1\nline2', 'line1\nline2');
      expect(result.formatted).not.toContain('-');
      expect(result.formatted).not.toContain('+');
    });

    test('different lines are marked', () => {
      const result = diffTool.computeLineDiff('hello', 'world');
      expect(result.formatted).toContain('- 1:');
      expect(result.formatted).toContain('+ 1:');
    });

    test('added lines are shown', () => {
      const result = diffTool.computeLineDiff('line1', 'line1\nline2');
      expect(result.formatted).toContain('+ 2:');
    });
  });

  describe('computeByteDiff', () => {
    test('identical strings have 0 differences', () => {
      const result = diffTool.computeByteDiff('hello', 'hello');
      expect(result.differences).toBe(0);
      expect(result.hexDump).toBe('');
    });

    test('different strings have byte differences', () => {
      const result = diffTool.computeByteDiff('abc', 'axc');
      expect(result.differences).toBe(1);
    });

    test('different length strings count extra bytes', () => {
      const result = diffTool.computeByteDiff('ab', 'abcd');
      expect(result.differences).toBe(2);
    });

    test('generates hex dump when differences exist', () => {
      const result = diffTool.computeByteDiff('hello', 'world');
      expect(result.hexDump).toContain('Offset');
      expect(result.hexDump.length).toBeGreaterThan(0);
    });
  });

  describe('generateHexDump', () => {
    test('produces header and data rows', () => {
      const left = new TextEncoder().encode('AB');
      const right = new TextEncoder().encode('AC');
      const dump = diffTool.generateHexDump(left, right, 2);
      expect(dump).toContain('Offset');
      expect(dump).toContain('00000000');
    });
  });

  describe('escapeHtml', () => {
    test('escapes HTML special characters', () => {
      const result = diffTool.escapeHtml('<script>alert("xss")</script>');
      expect(result).not.toContain('<script>');
      expect(result).toContain('&lt;');
    });
  });

  describe('highlightDiff', () => {
    test('wraps diff items in span', () => {
      const highlighted = [
        { char: 'a', type: 'match' },
        { char: 'b', type: 'diff' }
      ];
      const result = diffTool.highlightDiff(highlighted);
      expect(result).toContain('diff-highlight');
      expect(result).toContain('a');
    });

    test('converts newlines to return symbol', () => {
      const highlighted = [{ char: '\n', type: 'match' }];
      const result = diffTool.highlightDiff(highlighted);
      expect(result).toContain('\u21b5');
    });
  });
});
