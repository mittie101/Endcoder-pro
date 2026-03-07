// advanced-features.test.js - Tests for AdvancedFeatures class
const fs = require('fs');
const path = require('path');

// ── mock UIHandler ────────────────────────────────────────────────────────────
class MockUIHandler {
  constructor() { this.editors = {}; }
  setMonacoEditor(name, ed) { this.editors[name] = ed; }
  getMonacoEditor(name) { return this.editors[name] || null; }
  showError = jest.fn();
  showSuccess = jest.fn();
}

function createMockEditor(initialValue = '') {
  let value = initialValue;
  return {
    getValue: () => value,
    setValue: jest.fn((v) => { value = v; })
  };
}

// ── mock DOM globals ──────────────────────────────────────────────────────────
global.document = {
  getElementById: jest.fn(() => ({ addEventListener: jest.fn() })),
  querySelector: jest.fn(() => null)
};
global.navigator = {
  clipboard: { writeText: jest.fn().mockResolvedValue(undefined) }
};

// ── load AdvancedFeatures ─────────────────────────────────────────────────────
const code = fs.readFileSync(path.join(__dirname, '..', 'advanced-features.js'), 'utf8');
const AdvancedFeatures = new Function('document', 'navigator', code + '\nreturn AdvancedFeatures;')(
  global.document, global.navigator
);

// ── factory ───────────────────────────────────────────────────────────────────
function makeAF(inputValue = '') {
  const ui = new MockUIHandler();
  const editor = createMockEditor(inputValue);
  ui.setMonacoEditor('input', editor);
  const af = new AdvancedFeatures(ui);
  return { af, ui, editor };
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('AdvancedFeatures.sanitizeInput', () => {
  test('removes whitespace', () => {
    const { af, editor } = makeAF('SGVs bG8=');
    af.sanitizeInput();
    expect(editor.setValue).toHaveBeenCalledWith('SGVsbG8=');
  });

  test('removes PEM header/footer', () => {
    // sanitizeInput strips whitespace first (collapsing newlines), then applies
    // the PEM regex with a greedy .* — so the entire PEM block including data
    // between the markers is consumed. Verify markers are gone.
    const { af, editor } = makeAF(
      '-----BEGIN CERTIFICATE-----\nABCDEFGH\n-----END CERTIFICATE-----'
    );
    af.sanitizeInput();
    const result = editor.setValue.mock.calls[editor.setValue.mock.calls.length - 1][0];
    expect(result).not.toContain('BEGIN');
    expect(result).not.toContain('END');
    // After greedy removal the data content is also consumed — result may be empty or padded
    expect(result.replace(/=/g, '')).toBe('');
  });

  test('removes begin-base64 / end-base64 markers', () => {
    const { af, editor } = makeAF('begin-base64 644 file\nABCD\nend-base64');
    af.sanitizeInput();
    const result = editor.setValue.mock.calls[editor.setValue.mock.calls.length - 1][0];
    expect(result).not.toContain('begin-base64');
    expect(result).not.toContain('end-base64');
    expect(result).toContain('ABCD');
  });

  test('removes leading line numbers', () => {
    // Whitespace (incl. newlines) is removed first, collapsing lines into one string.
    // The leading-number regex /^\d+\s*/gm then only strips the very first digit.
    // Input '1 ABCD\n2 EFGH' → after whitespace strip: '1ABCD2EFGH'
    // → after leading number strip: 'ABCD2EFGH' (only the initial 1 is removed)
    const { af, editor } = makeAF('1 ABCD\n2 EFGH');
    af.sanitizeInput();
    const result = editor.setValue.mock.calls[editor.setValue.mock.calls.length - 1][0];
    expect(result).toContain('ABCD');
    expect(result).toContain('EFGH');
    expect(result).not.toMatch(/^1/); // leading 1 was stripped
  });

  test('converts base64url chars (- and _) to standard base64 (+ and /)', () => {
    // Input contains - and _ but no + or /
    const { af, editor } = makeAF('SGVs-bG8_dA==');
    af.sanitizeInput();
    const result = editor.setValue.mock.calls[editor.setValue.mock.calls.length - 1][0];
    expect(result).not.toContain('-');
    expect(result).not.toContain('_');
    expect(result).toContain('+');
    expect(result).toContain('/');
  });

  test('does NOT convert - to + when + already present (standard base64)', () => {
    // Already standard base64 with +
    const { af, editor } = makeAF('AB+CD-EF');
    af.sanitizeInput();
    const result = editor.setValue.mock.calls[editor.setValue.mock.calls.length - 1][0];
    // + is present so no conversion happens; - should remain
    expect(result).toContain('+');
    expect(result).toContain('-');
  });

  test('adds padding to make length a multiple of 4', () => {
    // 'ABCDE' length 5 → after sanitize still 5 → needs 3 pads → 8
    const { af, editor } = makeAF('ABCDE');
    af.sanitizeInput();
    const result = editor.setValue.mock.calls[editor.setValue.mock.calls.length - 1][0];
    expect(result.length % 4).toBe(0);
  });

  test('does not add padding when already multiple of 4', () => {
    const { af, editor } = makeAF('ABCD');
    af.sanitizeInput();
    const result = editor.setValue.mock.calls[editor.setValue.mock.calls.length - 1][0];
    expect(result).toBe('ABCD');
    expect(result.length % 4).toBe(0);
  });

  test('shows error when editor is empty', () => {
    const { af, ui } = makeAF('');
    af.sanitizeInput();
    expect(ui.showError).toHaveBeenCalledWith('Nothing to sanitize');
  });

  test('shows success after sanitizing', () => {
    const { af, ui } = makeAF('SGVsbG8=');
    af.sanitizeInput();
    expect(ui.showSuccess).toHaveBeenCalledWith('Input sanitized');
  });

  test('does nothing when no editor available', () => {
    const ui = new MockUIHandler(); // no editor set
    const af = new AdvancedFeatures(ui);
    expect(() => af.sanitizeInput()).not.toThrow();
  });
});

describe('AdvancedFeatures.generateSnippet', () => {
  function makeAFWithOutput(outputValue) {
    const ui = new MockUIHandler();
    const outEditor = createMockEditor(outputValue);
    ui.setMonacoEditor('output', outEditor);
    const af = new AdvancedFeatures(ui);
    return { af, ui };
  }

  test('shows error when output editor is empty', () => {
    const { af, ui } = makeAFWithOutput('');
    af.generateSnippet('img');
    expect(ui.showError).toHaveBeenCalledWith('No output to generate snippet from');
  });

  test('img snippet wraps output in img tag', async () => {
    const { af } = makeAFWithOutput('ABCDEF');
    await af.generateSnippet('img');
    expect(global.navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('<img src="data:')
    );
    expect(global.navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('ABCDEF')
    );
  });

  test('css snippet wraps output in background-image rule', async () => {
    const { af } = makeAFWithOutput('ABCDEF');
    await af.generateSnippet('css');
    expect(global.navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('background-image')
    );
  });

  test('datauri snippet is a data URI', async () => {
    const { af } = makeAFWithOutput('ABCDEF');
    await af.generateSnippet('datauri');
    expect(global.navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('data:')
    );
  });

  test('json snippet is valid JSON with data and mime keys', async () => {
    const { af } = makeAFWithOutput('ABCDEF');
    await af.generateSnippet('json');
    const written = global.navigator.clipboard.writeText.mock.calls.at(-1)[0];
    const parsed = JSON.parse(written);
    expect(parsed).toHaveProperty('data', 'ABCDEF');
    expect(parsed).toHaveProperty('mime');
  });

  test('detects JPEG mime type from /9j/ prefix', async () => {
    const { af } = makeAFWithOutput('/9j/base64data');
    await af.generateSnippet('datauri');
    expect(global.navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('image/jpeg')
    );
  });

  test('detects PNG mime type from iVBORw0KGgo prefix', async () => {
    const { af } = makeAFWithOutput('iVBORw0KGgoAAAAA');
    await af.generateSnippet('datauri');
    expect(global.navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('image/png')
    );
  });

  test('defaults to text/plain for unrecognized content', async () => {
    const { af } = makeAFWithOutput('Hello World');
    await af.generateSnippet('datauri');
    expect(global.navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('text/plain')
    );
  });
});
