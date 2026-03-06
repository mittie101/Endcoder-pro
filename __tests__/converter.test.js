// Mock window.Encodings for browser-side Converter class
const Encodings = require('../encodings');
global.window = { Encodings };

// Load Converter - use Function constructor to expose class from browser-style file
const fs = require('fs');
const converterCode = fs.readFileSync(require('path').join(__dirname, '..', 'converter.js'), 'utf8');
const Converter = new Function('window', converterCode + '\nreturn Converter;')(global.window);

describe('Converter', () => {
  let converter;

  beforeEach(() => {
    converter = new Converter();
  });

  describe('encode', () => {
    test('encodes base64', () => {
      expect(converter.encode('Hello', 'base64')).toBe('SGVsbG8=');
    });

    test('encodes hex', () => {
      expect(converter.encode('AB', 'hex')).toBe('4142');
    });

    test('encodes binary', () => {
      expect(converter.encode('A', 'binary')).toBe('01000001');
    });

    test('encodes all supported formats without error', () => {
      const formats = [
        'base64', 'base64url', 'base32', 'base32hex', 'hex',
        'binary', 'ascii85', 'base58', 'uuencode', 'quoted-printable', 'percent'
      ];
      for (const format of formats) {
        expect(() => converter.encode('test', format)).not.toThrow();
      }
    });

    test('throws on unknown encoding', () => {
      expect(() => converter.encode('test', 'unknown')).toThrow('Unknown encoding');
    });
  });

  describe('decode', () => {
    test('decodes base64', () => {
      expect(converter.decode('SGVsbG8=', 'base64')).toBe('Hello');
    });

    test('decodes hex', () => {
      expect(converter.decode('4142', 'hex')).toBe('AB');
    });

    test('trims whitespace from input', () => {
      expect(converter.decode('  SGVsbG8=  ', 'base64')).toBe('Hello');
    });

    test('throws on empty input', () => {
      expect(() => converter.decode('', 'base64')).toThrow('empty');
    });

    test('throws on unknown encoding', () => {
      expect(() => converter.decode('test', 'unknown')).toThrow('Unknown encoding');
    });
  });

  describe('round-trips through all encodings', () => {
    const formats = [
      'base64', 'base64url', 'base32', 'base32hex', 'hex',
      'binary', 'ascii85', 'base58', 'uuencode', 'quoted-printable', 'percent'
    ];

    for (const format of formats) {
      test(`round-trip: ${format}`, () => {
        const input = 'Hello World 123';
        const encoded = converter.encode(input, format);
        const decoded = converter.decode(encoded, format);
        expect(decoded).toBe(input);
      });
    }
  });

  describe('detectEncoding', () => {
    test('detects hex strings correctly', () => {
      // Improved heuristics: hex with a-f chars scores higher than base64
      expect(converter.detectEncoding('4142434445')).toBe('hex');
    });

    test('detects binary strings correctly', () => {
      // Improved heuristics: 8-bit aligned binary detected as binary
      expect(converter.detectEncoding('01010101')).toBe('binary');
    });

    test('detects base64 with padding', () => {
      expect(converter.detectEncoding('SGVsbG8=')).toBe('base64');
    });

    test('detects ascii85 wrapped in delimiters', () => {
      expect(converter.detectEncoding('<~87cURD]j~>')).toBe('ascii85');
    });

    test('detects morse code', () => {
      expect(converter.detectEncoding('.... . .-.. .-.. ---')).toBe('morse');
    });

    test('detects percent encoding', () => {
      expect(converter.detectEncoding('hello%20world')).toBe('percent');
    });

    test('returns unknown for plain text', () => {
      expect(converter.detectEncoding('Hello World! This is a test.')).toBe('unknown');
    });
  });

  describe('getEncodingInfo', () => {
    test('returns info for known encoding', () => {
      const info = converter.getEncodingInfo('base64');
      expect(info.name).toBe('Base64');
      expect(info.charset).toBeTruthy();
    });

    test('returns Unknown for invalid encoding', () => {
      const info = converter.getEncodingInfo('nonexistent');
      expect(info.name).toBe('Unknown');
    });
  });
});
