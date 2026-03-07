const { ipcMain } = require('electron');
const crypto = require('crypto');

let express, bodyParser;
try {
    express = require('express');
    bodyParser = require('body-parser');
} catch {
    console.warn('Express not available - API server disabled');
}

let jwt;
try {
    jwt = require('jsonwebtoken');
} catch {}

let serverInstance = null;
let serverPort = 3000;

function register() {
    ipcMain.handle('start-api-server', async (event, port = 3000) => {
        if (!express || !bodyParser) {
            return { success: false, error: 'Express not available. Install with: npm install express body-parser' };
        }
        try {
            if (serverInstance) {
                return { success: false, error: 'Server already running', port: serverPort };
            }

            const apiApp = express();
            apiApp.use(bodyParser.json({ limit: '50mb' }));
            apiApp.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

            const API_KEY = process.env.ENDCODER_API_KEY || crypto.randomBytes(32).toString('hex');
            apiApp.locals.apiKey = API_KEY;

            // CORS — localhost origins only
            apiApp.use((req, res, next) => {
                const origin = req.headers.origin;
                if (origin && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
                    res.header('Access-Control-Allow-Origin', origin);
                }
                res.header('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
                res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
                next();
            });

            // API Key Authentication (skip root and health)
            const authenticateAPIKey = (req, res, next) => {
                if (req.path === '/' || req.path === '/api/health') return next();
                const provided = req.headers['x-api-key'] || '';
                const providedBuf = Buffer.from(provided);
                const validBuf = Buffer.from(API_KEY);
                if (providedBuf.length !== validBuf.length || !crypto.timingSafeEqual(providedBuf, validBuf)) {
                    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid or missing X-API-Key header' });
                }
                next();
            };
            apiApp.use(authenticateAPIKey);

            // Root — API documentation
            apiApp.get('/', (req, res) => {
                res.json({
                    name: 'Endcoder Pro API',
                    version: '3.1.0',
                    description: 'Local REST API for encoding/decoding operations',
                    authentication: {
                        required: true,
                        method: 'X-API-Key header',
                        note: 'Include it as "X-API-Key: <key>" in all API requests (except / and /api/health)'
                    },
                    endpoints: {
                        'POST /api/encode':     { description: 'Encode data', authentication: 'Required', body: { data: 'string (required)', encoding: 'base64 | base64url | hex (default: base64)' } },
                        'POST /api/decode':     { description: 'Decode data', authentication: 'Required', body: { data: 'string (required)', encoding: 'base64 | base64url | hex (default: base64)', outputEncoding: 'utf8 | ascii | hex (default: utf8)' } },
                        'POST /api/jwt/verify': { description: 'Verify JWT token', authentication: 'Required', body: { token: 'string (required)', secret: 'string (required)', algorithm: 'HS256 | HS384 | HS512 (default: HS256)' } },
                        'POST /api/jwt/sign':   { description: 'Sign JWT token', authentication: 'Required', body: { payload: 'object (required)', secret: 'string (required)', algorithm: 'HS256 | HS384 | HS512 (default: HS256)', expiresIn: 'string (optional, e.g. "1h", "7d")' } },
                        'GET /api/health':      { description: 'Health check endpoint', authentication: 'Not required' }
                    }
                });
            });

            // Encode
            apiApp.post('/api/encode', (req, res) => {
                try {
                    const { data, encoding = 'base64' } = req.body;
                    if (!data) return res.status(400).json({ error: 'Data is required' });
                    const buffer = Buffer.from(data, 'utf8');
                    let encoded;
                    switch (encoding.toLowerCase()) {
                        case 'base64':    encoded = buffer.toString('base64'); break;
                        case 'base64url': encoded = buffer.toString('base64url'); break;
                        case 'hex':       encoded = buffer.toString('hex'); break;
                        default: return res.status(400).json({ error: 'Unsupported encoding' });
                    }
                    res.json({ success: true, encoded, encoding, originalSize: buffer.length, encodedSize: encoded.length });
                } catch (error) { res.status(500).json({ error: error.message }); }
            });

            // Decode
            apiApp.post('/api/decode', (req, res) => {
                try {
                    const { data, encoding = 'base64', outputEncoding = 'utf8' } = req.body;
                    if (!data) return res.status(400).json({ error: 'Data is required' });
                    let buffer;
                    switch (encoding.toLowerCase()) {
                        case 'base64':
                        case 'base64url': buffer = Buffer.from(data, encoding); break;
                        case 'hex':       buffer = Buffer.from(data, 'hex'); break;
                        default: return res.status(400).json({ error: 'Unsupported encoding' });
                    }
                    res.json({ success: true, decoded: buffer.toString(outputEncoding), encoding, encodedSize: data.length, decodedSize: buffer.length });
                } catch (error) { res.status(500).json({ error: error.message }); }
            });

            // JWT verify
            apiApp.post('/api/jwt/verify', (req, res) => {
                try {
                    const { token, secret, algorithm = 'HS256' } = req.body;
                    if (!token || !secret) return res.status(400).json({ error: 'Token and secret are required' });
                    const decoded = jwt.verify(token, secret, { algorithms: [algorithm] });
                    res.json({ success: true, valid: true, decoded });
                } catch (error) {
                    res.status(401).json({ success: false, valid: false, error: error.message });
                }
            });

            // JWT sign
            apiApp.post('/api/jwt/sign', (req, res) => {
                try {
                    const { payload, secret, algorithm = 'HS256', expiresIn } = req.body;
                    if (!payload || !secret) return res.status(400).json({ error: 'Payload and secret are required' });
                    const options = { algorithm };
                    if (expiresIn) options.expiresIn = expiresIn;
                    res.json({ success: true, token: jwt.sign(payload, secret, options) });
                } catch (error) { res.status(500).json({ error: error.message }); }
            });

            // Health check
            apiApp.get('/api/health', (req, res) => {
                res.json({ status: 'ok', version: '3.1.0', uptime: process.uptime() });
            });

            await new Promise((resolve, reject) => {
                serverInstance = apiApp.listen(port, 'localhost');
                serverInstance.once('listening', resolve);
                serverInstance.once('error', reject);
            });

            serverPort = serverInstance.address().port;
            console.log(`API Server running on http://localhost:${serverPort}`);
            return { success: true, port: serverPort, apiKey: API_KEY, message: `Server started on http://localhost:${serverPort}` };
        } catch (error) {
            serverInstance = null;
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('stop-api-server', async () => {
        try {
            if (!serverInstance) return { success: false, error: 'Server not running' };
            await new Promise((resolve) => serverInstance.close(resolve));
            serverInstance = null;
            return { success: true, message: 'Server stopped' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('get-server-status', async () => ({
        running: serverInstance !== null,
        port: serverPort
    }));
}

function shutdown() {
    if (serverInstance) {
        serverInstance.close();
        serverInstance = null;
    }
}

module.exports = { register, shutdown };
