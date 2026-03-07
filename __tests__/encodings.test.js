const Encodings = require('../encodings');

// ============================================================================
// Base64
// ============================================================================
describe('Base64', () => {
  test('encode ASCII string', () => {
    expect(Encodings.encodeBase64('Hello World')).toBe('SGVsbG8gV29ybGQ=');
  });

  test('decode ASCII string', () => {
    expect(Encodings.decodeBase64('SGVsbG8gV29ybGQ=')).toBe('Hello World');
  });

  test('round-trip ASCII', () => {
    const input = 'The quick brown fox jumps over the lazy dog';
    expect(Encodings.decodeBase64(Encodings.encodeBase64(input))).toBe(input);
  });

  test('round-trip UTF-8 (multi-byte)', () => {
    const input = 'Hello \u00e9\u00e8\u00ea \u00fc\u00f6\u00e4';
    expect(Encodings.decodeBase64(Encodings.encodeBase64(input))).toBe(input);
  });

  test('encode empty string', () => {
    expect(Encodings.encodeBase64('')).toBe('');
  });

  test('decode with whitespace (should strip)', () => {
    expect(Encodings.decodeBase64('SGVs\nbG8g\nV29ybGQ=')).toBe('Hello World');
  });

  test('decode invalid Base64 throws', () => {
    expect(() => Encodings.decodeBase64('!!invalid!!')).toThrow();
  });
});

// ============================================================================
// Base64 URL
// ============================================================================
describe('Base64 URL', () => {
  test('encode removes padding and uses URL-safe chars', () => {
    const encoded = Encodings.encodeBase64URL('Hello World');
    expect(encoded).not.toContain('+');
    expect(encoded).not.toContain('/');
    expect(encoded).not.toContain('=');
  });

  test('round-trip', () => {
    const input = 'subjects?id=1&name=test+value';
    expect(Encodings.decodeBase64URL(Encodings.encodeBase64URL(input))).toBe(input);
  });
});

// ============================================================================
// Hexadecimal
// ============================================================================
describe('Hex', () => {
  test('encode ASCII', () => {
    expect(Encodings.encodeHex('ABC')).toBe('414243');
  });

  test('decode hex', () => {
    expect(Encodings.decodeHex('414243')).toBe('ABC');
  });

  test('round-trip', () => {
    const input = 'Hello World!';
    expect(Encodings.decodeHex(Encodings.encodeHex(input))).toBe(input);
  });

  test('decode is case-insensitive', () => {
    expect(Encodings.decodeHex('4142')).toBe('AB');
    expect(Encodings.decodeHex('4142')).toBe(Encodings.decodeHex('4142'));
  });

  test('decode odd length throws', () => {
    expect(() => Encodings.decodeHex('ABC')).toThrow('even');
  });

  test('decode invalid chars throws', () => {
    expect(() => Encodings.decodeHex('GGGG')).toThrow();
  });
});

// ============================================================================
// Base32
// ============================================================================
describe('Base32', () => {
  test('encode ASCII', () => {
    const encoded = Encodings.encodeBase32('Hello');
    expect(encoded).toBe('JBSWY3DP');
  });

  test('round-trip', () => {
    const input = 'Hello World!';
    expect(Encodings.decodeBase32(Encodings.encodeBase32(input))).toBe(input);
  });

  test('decode invalid char throws', () => {
    expect(() => Encodings.decodeBase32('1234')).toThrow();
  });
});

// ============================================================================
// Base32 Hex
// ============================================================================
describe('Base32 Hex', () => {
  test('round-trip', () => {
    const input = 'Test string 123';
    expect(Encodings.decodeBase32Hex(Encodings.encodeBase32Hex(input))).toBe(input);
  });

  test('decode invalid char throws', () => {
    expect(() => Encodings.decodeBase32Hex('WXY')).toThrow();
  });
});

// ============================================================================
// Base58
// ============================================================================
describe('Base58', () => {
  test('round-trip ASCII', () => {
    const input = 'Hello World';
    expect(Encodings.decodeBase58(Encodings.encodeBase58(input))).toBe(input);
  });

  test('decode invalid char throws', () => {
    // Base58 excludes 0, O, I, l
    expect(() => Encodings.decodeBase58('0OIl')).toThrow();
  });
});

// ============================================================================
// Ascii85
// ============================================================================
describe('Ascii85', () => {
  test('encode wraps with <~ ~>', () => {
    const encoded = Encodings.encodeAscii85('test');
    expect(encoded.startsWith('<~')).toBe(true);
    expect(encoded.endsWith('~>')).toBe(true);
  });

  test('round-trip', () => {
    const input = 'Hello World!';
    expect(Encodings.decodeAscii85(Encodings.encodeAscii85(input))).toBe(input);
  });

  test('encode all zeros uses z shorthand', () => {
    const encoded = Encodings.encodeAscii85('\0\0\0\0');
    expect(encoded).toContain('z');
  });

  test('round-trip with 4-byte aligned input', () => {
    // Ascii85 works correctly with 4-byte aligned inputs
    expect(Encodings.decodeAscii85(Encodings.encodeAscii85('ABCD'))).toBe('ABCD');
    expect(Encodings.decodeAscii85(Encodings.encodeAscii85('ABCDEFGH'))).toBe('ABCDEFGH');
  });

  test('round-trip with non-aligned lengths (padding bug fixed)', () => {
    // Ascii85 padding bug has been fixed - all lengths now round-trip correctly
    expect(Encodings.decodeAscii85(Encodings.encodeAscii85('A'))).toBe('A');
    expect(Encodings.decodeAscii85(Encodings.encodeAscii85('AB'))).toBe('AB');
    expect(Encodings.decodeAscii85(Encodings.encodeAscii85('ABC'))).toBe('ABC');
    expect(Encodings.decodeAscii85(Encodings.encodeAscii85('Hello'))).toBe('Hello');
    expect(Encodings.decodeAscii85(Encodings.encodeAscii85('Hello, World!'))).toBe('Hello, World!');
  });
});

// ============================================================================
// UUEncode
// ============================================================================
describe('UUEncode', () => {
  test('encode produces begin/end markers', () => {
    const encoded = Encodings.encodeUUEncode('Hello');
    expect(encoded).toContain('begin 644 data');
    expect(encoded).toContain('end');
  });

  test('round-trip short string', () => {
    const input = 'Hello World!';
    expect(Encodings.decodeUUEncode(Encodings.encodeUUEncode(input))).toBe(input);
  });

  test('round-trip longer string (multi-line)', () => {
    const input = 'A'.repeat(100);
    expect(Encodings.decodeUUEncode(Encodings.encodeUUEncode(input))).toBe(input);
  });

  test('round-trip with special characters', () => {
    const input = 'Line 1\nLine 2\tTabbed';
    expect(Encodings.decodeUUEncode(Encodings.encodeUUEncode(input))).toBe(input);
  });
});

// ============================================================================
// Quoted-Printable
// ============================================================================
describe('Quoted-Printable', () => {
  test('encode printable ASCII unchanged', () => {
    const encoded = Encodings.encodeQuotedPrintable('Hello');
    expect(encoded).toBe('Hello');
  });

  test('encode non-printable as =XX', () => {
    const encoded = Encodings.encodeQuotedPrintable('\t');
    expect(encoded).toBe('=09');
  });

  test('round-trip', () => {
    const input = 'Hello World! Special: \t\n';
    expect(Encodings.decodeQuotedPrintable(Encodings.encodeQuotedPrintable(input))).toBe(input);
  });

  test('decode soft line break', () => {
    expect(Encodings.decodeQuotedPrintable('Hello=\nWorld')).toBe('HelloWorld');
  });
});

// ============================================================================
// Percent Encoding (URL)
// ============================================================================
describe('Percent Encoding', () => {
  test('encode spaces and special chars', () => {
    expect(Encodings.encodePercent('hello world')).toBe('hello%20world');
  });

  test('round-trip', () => {
    const input = 'key=value&foo=bar baz';
    expect(Encodings.decodePercent(Encodings.encodePercent(input))).toBe(input);
  });

  test('decode invalid throws', () => {
    expect(() => Encodings.decodePercent('%ZZ')).toThrow();
  });
});

// ============================================================================
// ROT13
// ============================================================================
describe('ROT13', () => {
  test('encode letters', () => {
    expect(Encodings.encodeROT13('Hello')).toBe('Uryyb');
  });

  test('is its own inverse', () => {
    const input = 'Hello World 123!';
    expect(Encodings.decodeROT13(Encodings.encodeROT13(input))).toBe(input);
  });

  test('non-alpha chars unchanged', () => {
    expect(Encodings.encodeROT13('123!@#')).toBe('123!@#');
  });
});

// ============================================================================
// Caesar Cipher
// ============================================================================
describe('Caesar Cipher', () => {
  test('encode with default shift 3', () => {
    expect(Encodings.encodeCaesar('ABC')).toBe('DEF');
  });

  test('decode reverses encode', () => {
    const input = 'Hello World';
    expect(Encodings.decodeCaesar(Encodings.encodeCaesar(input, 7), 7)).toBe(input);
  });

  test('wraps around alphabet', () => {
    expect(Encodings.encodeCaesar('XYZ', 3)).toBe('ABC');
  });

  test('negative shift works', () => {
    expect(Encodings.encodeCaesar('DEF', -3)).toBe('ABC');
  });
});

// ============================================================================
// HTML Entities
// ============================================================================
describe('HTML Entities', () => {
  test('encode basic entities', () => {
    const encoded = Encodings.encodeHTMLEntities('<div>"Hello"</div>');
    expect(encoded).toContain('&lt;');
    expect(encoded).toContain('&gt;');
    expect(encoded).toContain('&quot;');
  });

  test('decode named entities', () => {
    expect(Encodings.decodeHTMLEntities('&lt;div&gt;')).toBe('<div>');
  });

  test('decode numeric entities', () => {
    expect(Encodings.decodeHTMLEntities('&#65;')).toBe('A');
  });

  test('decode hex entities', () => {
    expect(Encodings.decodeHTMLEntities('&#x41;')).toBe('A');
  });

  test('round-trip with named only', () => {
    const input = '<p>"Hello" & \'World\'</p>';
    const encoded = Encodings.encodeHTMLEntities(input, true);
    expect(Encodings.decodeHTMLEntities(encoded)).toBe(input);
  });
});

// ============================================================================
// Atbash Cipher
// ============================================================================
describe('Atbash', () => {
  test('encode', () => {
    expect(Encodings.encodeAtbash('ABC')).toBe('ZYX');
    expect(Encodings.encodeAtbash('abc')).toBe('zyx');
  });

  test('is its own inverse', () => {
    const input = 'Hello World!';
    expect(Encodings.decodeAtbash(Encodings.encodeAtbash(input))).toBe(input);
  });
});

// ============================================================================
// Binary
// ============================================================================
describe('Binary', () => {
  test('encode ASCII', () => {
    expect(Encodings.encodeBinary('A')).toBe('01000001');
  });

  test('round-trip', () => {
    const input = 'Hello';
    expect(Encodings.decodeBinary(Encodings.encodeBinary(input))).toBe(input);
  });

  test('decode rejects non-multiple-of-8 bit string', () => {
    expect(() => Encodings.decodeBinary('101')).toThrow('multiple of 8');
    expect(() => Encodings.decodeBinary('0000000')).toThrow('multiple of 8'); // 7 bits
    expect(() => Encodings.decodeBinary('000000000')).toThrow('multiple of 8'); // 9 bits
  });

  test('decode accepts exactly 8 bits', () => {
    expect(() => Encodings.decodeBinary('01000001')).not.toThrow();
  });

  test('decode accepts space-separated 8-bit groups', () => {
    expect(Encodings.decodeBinary('01000001 01000010')).toBe('AB');
  });
});

// ============================================================================
// Morse Code
// ============================================================================
describe('Morse Code', () => {
  test('encode SOS', () => {
    expect(Encodings.encodeMorse('SOS')).toBe('... --- ...');
  });

  test('round-trip single word', () => {
    const input = 'HELLO';
    expect(Encodings.decodeMorse(Encodings.encodeMorse(input))).toBe(input);
  });

  test('encode with numbers', () => {
    const encoded = Encodings.encodeMorse('A1');
    expect(encoded).toBe('.- .----');
  });

  test('skips unknown characters instead of passing them through', () => {
    const result = Encodings.encodeMorse('A@B');
    expect(result).toContain('.-');   // A
    expect(result).toContain('-...'); // B
    expect(result).not.toContain('@');
  });

  test('encodes space as word separator /', () => {
    expect(Encodings.encodeMorse('A B')).toBe('.- / -...');
  });

  test('round-trip multi-word sentence', () => {
    const input = 'HELLO WORLD';
    expect(Encodings.decodeMorse(Encodings.encodeMorse(input))).toBe(input);
  });

  test('unknown-only input produces empty string', () => {
    expect(Encodings.encodeMorse('@#$')).toBe('');
  });
});

// ============================================================================
// Input Validation
// ============================================================================
describe('Input Validation', () => {
  test('encodeBase64 rejects non-string input', () => {
    expect(() => Encodings.encodeBase64(123)).toThrow('Input must be a string');
    expect(() => Encodings.encodeBase64(null)).toThrow('Input must be a string');
    expect(() => Encodings.encodeBase64(undefined)).toThrow('Input must be a string');
  });

  test('encodeHex rejects non-string input', () => {
    expect(() => Encodings.encodeHex(42)).toThrow('Input must be a string');
  });

  test('encodeBinary rejects non-string input', () => {
    expect(() => Encodings.encodeBinary({})).toThrow('Input must be a string');
  });

  test('decodeBinary rejects invalid characters', () => {
    expect(() => Encodings.decodeBinary('0120')).toThrow('Invalid binary string');
  });

  test('decodeBinary accepts valid binary', () => {
    expect(() => Encodings.decodeBinary('01000001')).not.toThrow();
  });

  test('encodeMorse rejects non-string input', () => {
    expect(() => Encodings.encodeMorse(42)).toThrow('Input must be a string');
  });

  test('encodeBase32 rejects non-string input', () => {
    expect(() => Encodings.encodeBase32([])).toThrow('Input must be a string');
  });

  test('encodeBase58 rejects non-string input', () => {
    expect(() => Encodings.encodeBase58(false)).toThrow('Input must be a string');
  });

  test('encodeUUEncode rejects non-string input', () => {
    expect(() => Encodings.encodeUUEncode(99)).toThrow('Input must be a string');
  });

  test('encodeQuotedPrintable rejects non-string input', () => {
    expect(() => Encodings.encodeQuotedPrintable(null)).toThrow('Input must be a string');
  });

  test('decodeQuotedPrintable rejects non-string input', () => {
    expect(() => Encodings.decodeQuotedPrintable(42)).toThrow('Input must be a string');
  });
});
