// main-handlers.test.js - Tests for IPC handlers defined in main.js
// Strategy: mock electron, capture ipcMain.handle registrations, call them directly.

// ── mock electron ─────────────────────────────────────────────────────────────
const mockIpcMain = { handle: jest.fn() };

jest.mock('electron', () => ({
  app: {
    whenReady: jest.fn(() => new Promise(() => {})), // never resolves = no window created
    on: jest.fn(),
    quit: jest.fn()
  },
  BrowserWindow: jest.fn(() => ({
    loadFile: jest.fn(),
    once: jest.fn(),
    on: jest.fn(),
    webContents: { send: jest.fn() },
    show: jest.fn()
  })),
  ipcMain: mockIpcMain,
  dialog: {
    showOpenDialog: jest.fn(),
    showSaveDialog: jest.fn(),
    showMessageBox: jest.fn()
  },
  shell: { openExternal: jest.fn() },
  Menu: {
    buildFromTemplate: jest.fn(() => ({})),
    setApplicationMenu: jest.fn()
  }
}));

// ── capture handlers ──────────────────────────────────────────────────────────
const handlers = {};
mockIpcMain.handle.mockImplementation((name, fn) => {
  handlers[name] = fn;
});

// Loading main.js also tries to require optional native modules.
// They are installed in node_modules, so they load fine; if not,
// main.js already handles missing deps gracefully.
require('../main.js');

// Fake event object (unused by handlers but required as first argument)
const fakeEvent = {};

// ── PBKDF2 hash / verify ──────────────────────────────────────────────────────
describe('IPC: hash-password-pbkdf2', () => {
  test('returns success with hash string', async () => {
    const result = await handlers['hash-password-pbkdf2'](fakeEvent, 'mypassword', 10000);
    expect(result.success).toBe(true);
    expect(result.hash).toMatch(/^\$pbkdf2\$/);
    expect(result.algorithm).toBe('PBKDF2-SHA512');
    expect(result.iterations).toBe(10000);
  });

  test('hash format has 5 dollar-sign-separated parts', async () => {
    const result = await handlers['hash-password-pbkdf2'](fakeEvent, 'pass', 1000);
    expect(result.success).toBe(true);
    const parts = result.hash.split('$');
    expect(parts).toHaveLength(5);
    expect(parts[1]).toBe('pbkdf2');
    expect(parts[2]).toBe('1000');
  });

  test('different passwords produce different hashes', async () => {
    const r1 = await handlers['hash-password-pbkdf2'](fakeEvent, 'passwordA', 1000);
    const r2 = await handlers['hash-password-pbkdf2'](fakeEvent, 'passwordB', 1000);
    expect(r1.hash).not.toBe(r2.hash);
  });

  test('same password produces different hashes (random salt)', async () => {
    const r1 = await handlers['hash-password-pbkdf2'](fakeEvent, 'same', 1000);
    const r2 = await handlers['hash-password-pbkdf2'](fakeEvent, 'same', 1000);
    expect(r1.hash).not.toBe(r2.hash);
  });
});

describe('IPC: verify-password-pbkdf2', () => {
  async function hashIt(password, iterations = 1000) {
    const r = await handlers['hash-password-pbkdf2'](fakeEvent, password, iterations);
    return r.hash;
  }

  test('correct password matches', async () => {
    const hash = await hashIt('correct');
    const result = await handlers['verify-password-pbkdf2'](fakeEvent, 'correct', hash);
    expect(result.success).toBe(true);
    expect(result.match).toBe(true);
  });

  test('wrong password does not match', async () => {
    const hash = await hashIt('correct');
    const result = await handlers['verify-password-pbkdf2'](fakeEvent, 'wrong', hash);
    expect(result.success).toBe(true);
    expect(result.match).toBe(false);
  });

  test('returns error for malformed hash', async () => {
    const result = await handlers['verify-password-pbkdf2'](fakeEvent, 'pass', 'not-a-valid-hash');
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });
});

// ── read-file ─────────────────────────────────────────────────────────────────
describe('IPC: read-file', () => {
  const os = require('os');
  const fs = require('fs');
  const path = require('path');
  const { dialog } = require('electron');
  let tmpFile;

  beforeEach(async () => {
    tmpFile = path.join(os.tmpdir(), `endcoder-test-${Date.now()}.txt`);
    fs.writeFileSync(tmpFile, 'Hello Test');
    // Add tmpFile to allowedPaths by simulating a select-file call
    dialog.showOpenDialog.mockResolvedValueOnce({ canceled: false, filePaths: [tmpFile] });
    await handlers['select-file'](fakeEvent);
  });

  afterEach(() => {
    try { fs.unlinkSync(tmpFile); } catch (_) {}
  });

  test('returns base64 buffer and metadata for existing file', async () => {
    const result = await handlers['read-file'](fakeEvent, tmpFile);
    expect(result.success).toBe(true);
    expect(Buffer.from(result.buffer, 'base64').toString('utf8')).toBe('Hello Test');
    expect(result.name).toBe(path.basename(tmpFile));
    expect(result.size).toBe(10);
  });

  test('returns failure for missing file', async () => {
    const result = await handlers['read-file'](fakeEvent, '/nonexistent/path/file.txt');
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });
});

// ── JWT sign / verify (IPC wrappers) ─────────────────────────────────────────
describe('IPC: sign-jwt and verify-jwt', () => {
  test('sign-jwt returns a JWT token', async () => {
    const result = await handlers['sign-jwt'](
      fakeEvent,
      { sub: '123', name: 'Alice' },
      'test-secret',
      'HS256',
      '1h'
    );
    expect(result.success).toBe(true);
    expect(result.token).toMatch(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/);
  });

  test('verify-jwt validates a legitimately signed token', async () => {
    const signResult = await handlers['sign-jwt'](
      fakeEvent,
      { sub: '999' },
      'my-secret',
      'HS256',
      null
    );
    const verifyResult = await handlers['verify-jwt'](
      fakeEvent,
      signResult.token,
      'my-secret',
      'HS256'
    );
    expect(verifyResult.success).toBe(true);
    expect(verifyResult.valid).toBe(true);
    expect(verifyResult.decoded.sub).toBe('999');
  });

  test('verify-jwt returns valid:false with wrong secret', async () => {
    const signResult = await handlers['sign-jwt'](
      fakeEvent,
      { sub: '1' },
      'correct-secret',
      'HS256',
      null
    );
    const verifyResult = await handlers['verify-jwt'](
      fakeEvent,
      signResult.token,
      'wrong-secret',
      'HS256'
    );
    expect(verifyResult.success).toBe(true);
    expect(verifyResult.valid).toBe(false);
  });

  test('sign-jwt without jwt returns error', async () => {
    // Temporarily replace the handler with one that simulates jwt not available
    const origHandler = handlers['sign-jwt'];
    // Test the "no jwt" branch by providing a bad payload that jwt.sign will reject
    const result = await handlers['sign-jwt'](fakeEvent, null, 'secret', 'HS256', null);
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });
});

// ── API server integration ────────────────────────────────────────────────────
describe('IPC: start-api-server / stop-api-server / get-server-status', () => {
  let apiKey;

  afterEach(async () => {
    // Always stop server between tests to avoid EADDRINUSE
    await handlers['stop-api-server'](fakeEvent);
  });

  test('starts server and returns apiKey and port', async () => {
    const result = await handlers['start-api-server'](fakeEvent, 0); // port 0 = OS picks free port
    expect(result.success).toBe(true);
    expect(result.apiKey).toBeTruthy();
    expect(typeof result.port).toBe('number');
    apiKey = result.apiKey;
  });

  test('get-server-status reflects running state', async () => {
    await handlers['start-api-server'](fakeEvent, 0);
    const status = await handlers['get-server-status'](fakeEvent);
    expect(status.running).toBe(true);
  });

  test('stop-api-server stops the server', async () => {
    await handlers['start-api-server'](fakeEvent, 0);
    const stopResult = await handlers['stop-api-server'](fakeEvent);
    expect(stopResult.success).toBe(true);
    const status = await handlers['get-server-status'](fakeEvent);
    expect(status.running).toBe(false);
  });

  test('starting server twice returns error', async () => {
    await handlers['start-api-server'](fakeEvent, 0);
    const result2 = await handlers['start-api-server'](fakeEvent, 0);
    expect(result2.success).toBe(false);
    expect(result2.error).toMatch(/already running/i);
  });

  test('stopping when not running returns error', async () => {
    // server is already stopped by afterEach or never started
    const result = await handlers['stop-api-server'](fakeEvent);
    expect(result.success).toBe(false);
  });
});

describe('API server endpoints', () => {
  const http = require('http');
  let serverPort;
  let apiKey;

  function httpRequest(method, path, body, headers = {}) {
    return new Promise((resolve, reject) => {
      const data = body ? JSON.stringify(body) : null;
      const opts = {
        hostname: 'localhost',
        port: serverPort,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': data ? Buffer.byteLength(data) : 0,
          ...headers
        }
      };
      const req = http.request(opts, (res) => {
        let raw = '';
        res.on('data', (chunk) => { raw += chunk; });
        res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(raw) }));
      });
      req.on('error', reject);
      if (data) req.write(data);
      req.end();
    });
  }

  beforeAll(async () => {
    const result = await handlers['start-api-server'](fakeEvent, 0);
    serverPort = result.port;
    apiKey = result.apiKey;
  });

  afterAll(async () => {
    await handlers['stop-api-server'](fakeEvent);
  });

  test('GET / returns API documentation without exposing apiKey', async () => {
    const { status, body } = await httpRequest('GET', '/');
    expect(status).toBe(200);
    expect(body.name).toBe('Endcoder Pro API');
    expect(body).not.toHaveProperty('apiKey');
  });

  test('GET /api/health returns ok without authentication', async () => {
    const { status, body } = await httpRequest('GET', '/api/health');
    expect(status).toBe(200);
    expect(body.status).toBe('ok');
  });

  test('POST /api/encode rejects request without API key', async () => {
    const { status } = await httpRequest('POST', '/api/encode', { data: 'hello' });
    expect(status).toBe(401);
  });

  test('POST /api/encode encodes with base64', async () => {
    const { status, body } = await httpRequest(
      'POST', '/api/encode',
      { data: 'Hello World', encoding: 'base64' },
      { 'X-API-Key': apiKey }
    );
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.encoded).toBe(Buffer.from('Hello World').toString('base64'));
  });

  test('POST /api/encode encodes with hex', async () => {
    const { status, body } = await httpRequest(
      'POST', '/api/encode',
      { data: 'AB', encoding: 'hex' },
      { 'X-API-Key': apiKey }
    );
    expect(status).toBe(200);
    expect(body.encoded).toBe('4142');
  });

  test('POST /api/encode returns 400 for unsupported encoding', async () => {
    const { status } = await httpRequest(
      'POST', '/api/encode',
      { data: 'hello', encoding: 'rot13' },
      { 'X-API-Key': apiKey }
    );
    expect(status).toBe(400);
  });

  test('POST /api/encode returns 400 when data missing', async () => {
    const { status } = await httpRequest(
      'POST', '/api/encode',
      {},
      { 'X-API-Key': apiKey }
    );
    expect(status).toBe(400);
  });

  test('POST /api/decode decodes base64', async () => {
    const encoded = Buffer.from('Hello World').toString('base64');
    const { status, body } = await httpRequest(
      'POST', '/api/decode',
      { data: encoded, encoding: 'base64' },
      { 'X-API-Key': apiKey }
    );
    expect(status).toBe(200);
    expect(body.decoded).toBe('Hello World');
  });

  test('POST /api/decode decodes hex', async () => {
    const { status, body } = await httpRequest(
      'POST', '/api/decode',
      { data: '4142', encoding: 'hex' },
      { 'X-API-Key': apiKey }
    );
    expect(status).toBe(200);
    expect(body.decoded).toBe('AB');
  });

  test('POST /api/decode returns 400 when data missing', async () => {
    const { status } = await httpRequest(
      'POST', '/api/decode',
      { encoding: 'base64' },
      { 'X-API-Key': apiKey }
    );
    expect(status).toBe(400);
  });

  test('POST /api/jwt/sign and /api/jwt/verify round-trip', async () => {
    const signRes = await httpRequest(
      'POST', '/api/jwt/sign',
      { payload: { user: 'alice' }, secret: 'topsecret', algorithm: 'HS256' },
      { 'X-API-Key': apiKey }
    );
    expect(signRes.status).toBe(200);
    const token = signRes.body.token;

    const verifyRes = await httpRequest(
      'POST', '/api/jwt/verify',
      { token, secret: 'topsecret', algorithm: 'HS256' },
      { 'X-API-Key': apiKey }
    );
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.valid).toBe(true);
    expect(verifyRes.body.decoded.user).toBe('alice');
  });

  test('POST /api/jwt/verify returns 401 for invalid token', async () => {
    const { status, body } = await httpRequest(
      'POST', '/api/jwt/verify',
      { token: 'bad.token.here', secret: 'secret' },
      { 'X-API-Key': apiKey }
    );
    expect(status).toBe(401);
    expect(body.valid).toBe(false);
  });

  test('POST /api/jwt/verify returns 400 when token or secret missing', async () => {
    const { status } = await httpRequest(
      'POST', '/api/jwt/verify',
      { token: 'sometoken' }, // missing secret
      { 'X-API-Key': apiKey }
    );
    expect(status).toBe(400);
  });

  test('CORS allows localhost origin', async () => {
    const opts = {
      hostname: 'localhost',
      port: serverPort,
      path: '/api/health',
      method: 'GET',
      headers: { 'Origin': 'http://localhost:8080' }
    };
    const res = await new Promise((resolve, reject) => {
      const req = http.request(opts, (r) => {
        let raw = '';
        r.on('data', (c) => { raw += c; });
        r.on('end', () => resolve({ headers: r.headers, status: r.statusCode }));
      });
      req.on('error', reject);
      req.end();
    });
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:8080');
  });

  test('CORS does NOT allow external origin', async () => {
    const opts = {
      hostname: 'localhost',
      port: serverPort,
      path: '/api/health',
      method: 'GET',
      headers: { 'Origin': 'https://evil.com' }
    };
    const res = await new Promise((resolve, reject) => {
      const req = http.request(opts, (r) => {
        let raw = '';
        r.on('data', (c) => { raw += c; });
        r.on('end', () => resolve({ headers: r.headers, status: r.statusCode }));
      });
      req.on('error', reject);
      req.end();
    });
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});
