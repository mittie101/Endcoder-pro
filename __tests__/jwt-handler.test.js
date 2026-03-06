// Test the pure logic functions of JWTHandler
// parseJWT and formatTokenInfo don't need Electron APIs

// Mock DOM
global.document = {
  getElementById: jest.fn(() => null),
  createElement: jest.fn(() => ({ textContent: '', get innerHTML() { return this.textContent; } }))
};
global.window = {};

// Load the class - use Function constructor to expose class from browser-style file
const fs = require('fs');
const code = fs.readFileSync(require('path').join(__dirname, '..', 'jwt-handler.js'), 'utf8');
const JWTHandler = new Function('document', code + '\nreturn JWTHandler;')(global.document);

describe('JWTHandler', () => {
  let handler;
  const mockUI = {
    showError: jest.fn(),
    showSuccess: jest.fn(),
    showLoading: jest.fn(),
    getMonacoEditor: jest.fn(() => null),
    setMonacoEditor: jest.fn()
  };

  beforeEach(() => {
    handler = new JWTHandler(mockUI);
    jest.clearAllMocks();
  });

  describe('parseJWT', () => {
    // Build a valid JWT manually: header.payload.signature
    function makeJWT(header, payload, sig = 'fakesig') {
      const h = btoa(JSON.stringify(header));
      const p = btoa(JSON.stringify(payload));
      return `${h}.${p}.${sig}`;
    }

    test('parses a valid JWT token', () => {
      const token = makeJWT(
        { alg: 'HS256', typ: 'JWT' },
        { sub: '123', name: 'Test', iat: 1516239022 }
      );
      const result = handler.parseJWT(token);
      expect(result.header.alg).toBe('HS256');
      expect(result.payload.sub).toBe('123');
      expect(result.payload.name).toBe('Test');
      expect(result.signature).toBe('fakesig');
    });

    test('throws on token with wrong number of parts', () => {
      expect(() => handler.parseJWT('only.two')).toThrow('Invalid JWT format');
      expect(() => handler.parseJWT('one')).toThrow('Invalid JWT format');
      expect(() => handler.parseJWT('a.b.c.d')).toThrow('Invalid JWT format');
    });

    test('throws on invalid base64 in header', () => {
      expect(() => handler.parseJWT('!!!.payload.sig')).toThrow();
    });

    test('throws on invalid JSON in payload', () => {
      const badPayload = btoa('not json');
      const header = btoa(JSON.stringify({ alg: 'HS256' }));
      expect(() => handler.parseJWT(`${header}.${badPayload}.sig`)).toThrow();
    });
  });

  describe('formatTokenInfo', () => {
    test('formats issued at time', () => {
      const parsed = {
        header: { alg: 'HS256' },
        payload: { iat: 1516239022 },
        signature: 'sig'
      };
      const html = handler.formatTokenInfo(parsed);
      expect(html).toContain('Issued At:');
    });

    test('formats expiration with expired flag', () => {
      const parsed = {
        header: { alg: 'HS256' },
        payload: { exp: 1000000000 }, // 2001 - definitely expired
        signature: 'sig'
      };
      const html = handler.formatTokenInfo(parsed);
      expect(html).toContain('Expires:');
      expect(html).toContain('EXPIRED');
    });

    test('formats expiration with valid flag for future date', () => {
      const futureTimestamp = Math.floor(Date.now() / 1000) + 86400; // 1 day from now
      const parsed = {
        header: { alg: 'HS256' },
        payload: { exp: futureTimestamp },
        signature: 'sig'
      };
      const html = handler.formatTokenInfo(parsed);
      expect(html).toContain('Valid');
    });

    test('formats issuer, subject, audience', () => {
      const parsed = {
        header: { alg: 'HS256' },
        payload: {
          iss: 'test-issuer',
          sub: 'user123',
          aud: 'my-app'
        },
        signature: 'sig'
      };
      const html = handler.formatTokenInfo(parsed);
      expect(html).toContain('Issuer:');
      expect(html).toContain('test-issuer');
      expect(html).toContain('Subject:');
      expect(html).toContain('user123');
      expect(html).toContain('Audience:');
      expect(html).toContain('my-app');
    });

    test('formats array audience', () => {
      const parsed = {
        header: { alg: 'HS256' },
        payload: { aud: ['app1', 'app2'] },
        signature: 'sig'
      };
      const html = handler.formatTokenInfo(parsed);
      expect(html).toContain('app1, app2');
    });

    test('handles payload with no standard claims', () => {
      const parsed = {
        header: { alg: 'HS256' },
        payload: { custom: 'data' },
        signature: 'sig'
      };
      const html = handler.formatTokenInfo(parsed);
      expect(html).toContain('jwt-info');
      // Should not contain any of the standard claim labels
      expect(html).not.toContain('Issued At:');
      expect(html).not.toContain('Expires:');
    });
  });
});
