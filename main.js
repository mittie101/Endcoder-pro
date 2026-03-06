const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs').promises;

// Optional dependencies with fallbacks
let Jimp;
try {
  Jimp = require('jimp');
  console.log('Jimp loaded successfully for image processing');
} catch (e) {
  console.warn('Jimp not available - image optimization disabled');
}

let jwt;
try {
  jwt = require('jsonwebtoken');
} catch (e) {
  console.warn('jsonwebtoken not available - JWT features disabled');
}

let express, bodyParser;
try {
  express = require('express');
  bodyParser = require('body-parser');
} catch (e) {
  console.warn('Express not available - API server disabled');
}

let bcrypt;
try {
  bcrypt = require('bcrypt');
  console.log('✓ bcrypt loaded successfully for password hashing');
} catch (e) {
  console.error('✗ bcrypt not available:', e.message);
  console.error('Full error:', e);
}

let argon2;
try {
  argon2 = require('argon2');
  console.log('✓ argon2 loaded successfully for password hashing');
} catch (e) {
  console.error('✗ argon2 not available:', e.message);
  console.error('Full error:', e);
}

let mainWindow;
let serverInstance = null;
let serverPort = 3000;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true
    },
    backgroundColor: '#1a1a2e',
    show: false
  });

  mainWindow.loadFile('index.html');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  createMenu();

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (serverInstance) {
      serverInstance.close();
    }
  });
}

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Open File',
          accelerator: 'CmdOrCtrl+O',
          click: () => mainWindow.webContents.send('menu-open-file')
        },
        {
          label: 'Save Output',
          accelerator: 'CmdOrCtrl+S',
          click: () => mainWindow.webContents.send('menu-save-output')
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => app.quit()
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'Server',
      submenu: [
        {
          label: 'Start Local API Server',
          click: () => mainWindow.webContents.send('start-server')
        },
        {
          label: 'Stop Local API Server',
          click: () => mainWindow.webContents.send('stop-server')
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Documentation',
          click: () => shell.openExternal('https://github.com/mittie101/Endcoder-pro')
        },
        { type: 'separator' },
        {
          label: 'About',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Endcoder Pro',
              message: 'Endcoder Pro v3.0.0',
              detail: 'Professional encoding/decoding tool with Monaco Editor, JWT verification, image optimization, and developer API.'
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// File operations
ipcMain.handle('select-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'All Files', extensions: ['*'] },
      { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'] },
      { name: 'Text Files', extensions: ['txt', 'json', 'xml', 'html', 'css', 'js'] }
    ]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const stats = await fs.stat(filePath);
    const buffer = await fs.readFile(filePath);
    
    return {
      success: true,
      buffer: buffer.toString('base64'),
      size: stats.size,
      name: path.basename(filePath),
      path: filePath
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

ipcMain.handle('save-file', async (event, data, defaultName = 'output.txt') => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName,
    filters: [
      { name: 'All Files', extensions: ['*'] },
      { name: 'Text Files', extensions: ['txt'] },
      { name: 'Base64 Files', extensions: ['b64'] }
    ]
  });

  if (!result.canceled && result.filePath) {
    try {
      await fs.writeFile(result.filePath, data);
      return { success: true, path: result.filePath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  return { success: false, error: 'Save cancelled' };
});

// Image optimization with Jimp
ipcMain.handle('optimize-image', async (event, filePath, options) => {
  if (!Jimp) {
    return {
      success: false,
      error: 'Jimp library not available. Install with: npm install jimp'
    };
  }
  
  try {
    const { width, height, format, quality } = options;
    
    // Get original file size
    const stats = await fs.stat(filePath);
    const originalSize = stats.size;
    
    // Read image with Jimp
    const image = await Jimp.read(filePath);
    
    // Resize if dimensions provided
    if (width || height) {
      if (width && height) {
        image.resize(width, height);
      } else if (width) {
        image.resize(width, Jimp.AUTO);
      } else if (height) {
        image.resize(Jimp.AUTO, height);
      }
    }
    
    // Set quality
    if (quality) {
      image.quality(quality);
    }
    
    // Get buffer based on format
    let buffer;
    let outputFormat = format || 'jpeg';
    
    switch(outputFormat.toLowerCase()) {
      case 'png':
        buffer = await image.getBufferAsync(Jimp.MIME_PNG);
        break;
      case 'jpeg':
      case 'jpg':
        buffer = await image.getBufferAsync(Jimp.MIME_JPEG);
        break;
      case 'bmp':
        buffer = await image.getBufferAsync(Jimp.MIME_BMP);
        break;
      case 'webp':
      case 'avif':
        // Jimp doesn't support WebP/AVIF, use JPEG instead
        buffer = await image.getBufferAsync(Jimp.MIME_JPEG);
        outputFormat = 'jpeg';
        break;
      default:
        buffer = await image.getBufferAsync(Jimp.MIME_JPEG);
        outputFormat = 'jpeg';
    }
    
    return {
      success: true,
      buffer: buffer.toString('base64'),
      format: outputFormat,
      width: image.bitmap.width,
      height: image.bitmap.height,
      size: buffer.length,
      originalSize: originalSize
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

// JWT operations
ipcMain.handle('verify-jwt', async (event, token, secret, algorithm = 'HS256') => {
  if (!jwt) {
    return {
      success: false,
      error: 'JWT library not available. Install with: npm install jsonwebtoken'
    };
  }
  
  try {
    // Try to verify with secret
    const decoded = jwt.verify(token, secret, { algorithms: [algorithm] });
    
    return {
      success: true,
      valid: true,
      decoded: decoded,
      message: 'Token is valid and signature verified'
    };
  } catch (error) {
    // Token invalid or signature doesn't match
    try {
      // Decode without verification to show payload
      const decoded = jwt.decode(token, { complete: true });
      
      return {
        success: true,
        valid: false,
        decoded: decoded,
        error: error.message,
        message: 'Token signature verification failed'
      };
    } catch (decodeError) {
      return {
        success: false,
        error: decodeError.message
      };
    }
  }
});

ipcMain.handle('sign-jwt', async (event, payload, secret, algorithm = 'HS256', expiresIn = null) => {
  if (!jwt) {
    return {
      success: false,
      error: 'JWT library not available. Install with: npm install jsonwebtoken'
    };
  }
  
  try {
    const options = { algorithm };
    if (expiresIn) {
      options.expiresIn = expiresIn;
    }
    
    const token = jwt.sign(payload, secret, options);
    
    return {
      success: true,
      token: token,
      decoded: jwt.decode(token, { complete: true })
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

// Password Hashing with bcrypt
ipcMain.handle('hash-password-bcrypt', async (event, password, rounds = 10) => {
  if (!bcrypt) {
    return {
      success: false,
      error: 'bcrypt not available. Run install-password-hash.bat or use PBKDF2 fallback.',
      fallback: true
    };
  }
  
  try {
    const hash = await bcrypt.hash(password, rounds);
    
    return {
      success: true,
      hash: hash,
      algorithm: 'bcrypt',
      rounds: rounds
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

// Verify bcrypt password
ipcMain.handle('verify-password-bcrypt', async (event, password, hash) => {
  if (!bcrypt) {
    return {
      success: false,
      error: 'bcrypt not available. Run install-password-hash.bat',
      fallback: true
    };
  }
  
  try {
    const isMatch = await bcrypt.compare(password, hash);
    
    return {
      success: true,
      match: isMatch
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

// Password Hashing with Argon2
ipcMain.handle('hash-password-argon2', async (event, password, options = {}) => {
  if (!argon2) {
    return {
      success: false,
      error: 'argon2 not available. Run install-password-hash.bat or use PBKDF2 fallback.',
      fallback: true
    };
  }
  
  try {
    const {
      memoryCost = 65536,  // 64 MB
      timeCost = 3,
      parallelism = 4
    } = options;
    
    const hash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: memoryCost,
      timeCost: timeCost,
      parallelism: parallelism
    });
    
    return {
      success: true,
      hash: hash,
      algorithm: 'argon2id',
      options: {
        memoryCost,
        timeCost,
        parallelism
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

// Verify Argon2 password
ipcMain.handle('verify-password-argon2', async (event, password, hash) => {
  if (!argon2) {
    return {
      success: false,
      error: 'argon2 not available. Run install-password-hash.bat',
      fallback: true
    };
  }
  
  try {
    const isMatch = await argon2.verify(hash, password);
    
    return {
      success: true,
      match: isMatch
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

// PBKDF2 Fallback (when bcrypt/argon2 not available)
ipcMain.handle('hash-password-pbkdf2', async (event, password, iterations = 100000) => {
  try {
    const crypto = require('crypto');
    const salt = crypto.randomBytes(16);
    const hash = crypto.pbkdf2Sync(password, salt, iterations, 64, 'sha512');
    
    // Combine salt and hash
    const combined = `$pbkdf2$${iterations}$${salt.toString('base64')}$${hash.toString('base64')}`;
    
    return {
      success: true,
      hash: combined,
      algorithm: 'PBKDF2-SHA512',
      iterations: iterations
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

// Verify PBKDF2 password
ipcMain.handle('verify-password-pbkdf2', async (event, password, hashString) => {
  try {
    const crypto = require('crypto');
    
    // Parse the hash string
    const parts = hashString.split('$');
    if (parts.length !== 5 || parts[1] !== 'pbkdf2') {
      throw new Error('Invalid PBKDF2 hash format');
    }
    
    const iterations = parseInt(parts[2]);
    const salt = Buffer.from(parts[3], 'base64');
    const originalHash = Buffer.from(parts[4], 'base64');
    
    // Hash the provided password with the same salt
    const hash = crypto.pbkdf2Sync(password, salt, iterations, 64, 'sha512');
    
    // Compare hashes
    const isMatch = crypto.timingSafeEqual(originalHash, hash);
    
    return {
      success: true,
      match: isMatch
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

// Local HTTP API Server
ipcMain.handle('start-api-server', async (event, port = 3000) => {
  if (!express || !bodyParser) {
    return {
      success: false,
      error: 'Express not available. Install with: npm install express body-parser'
    };
  }
  
  try {
    if (serverInstance) {
      return {
        success: false,
        error: 'Server already running',
        port: serverPort
      };
    }

    const apiApp = express();
    apiApp.use(bodyParser.json({ limit: '50mb' }));
    apiApp.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

    // Generate API key if not exists
    const crypto = require('crypto');
    const API_KEY = process.env.ENDCODER_API_KEY || crypto.randomBytes(32).toString('hex');
    
    // Store API key for display
    apiApp.locals.apiKey = API_KEY;

    // CORS headers
    apiApp.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
      res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      next();
    });

    // API Key Authentication Middleware (except root and health)
    const authenticateAPIKey = (req, res, next) => {
      // Skip auth for root documentation and health check
      if (req.path === '/' || req.path === '/api/health') {
        return next();
      }

      const apiKey = req.headers['x-api-key'];
      
      if (!apiKey || apiKey !== API_KEY) {
        return res.status(401).json({ 
          error: 'Unauthorized',
          message: 'Invalid or missing X-API-Key header'
        });
      }
      
      next();
    };

    apiApp.use(authenticateAPIKey);

    // Root route - API documentation
    apiApp.get('/', (req, res) => {
      res.json({
        name: 'Endcoder Pro API',
        version: '3.0.0',
        description: 'Local REST API for encoding/decoding operations',
        authentication: {
          required: true,
          method: 'X-API-Key header',
          apiKey: apiApp.locals.apiKey,
          note: 'Include "X-API-Key: [your-key]" header in all API requests (except / and /api/health)'
        },
        endpoints: {
          'POST /api/encode': {
            description: 'Encode data',
            authentication: 'Required',
            body: {
              data: 'string (required)',
              encoding: 'base64 | base64url | hex (default: base64)'
            }
          },
          'POST /api/decode': {
            description: 'Decode data',
            authentication: 'Required',
            body: {
              data: 'string (required)',
              encoding: 'base64 | base64url | hex (default: base64)',
              outputEncoding: 'utf8 | ascii | hex (default: utf8)'
            }
          },
          'POST /api/jwt/verify': {
            description: 'Verify JWT token',
            authentication: 'Required',
            body: {
              token: 'string (required)',
              secret: 'string (required)',
              algorithm: 'HS256 | HS384 | HS512 (default: HS256)'
            }
          },
          'POST /api/jwt/sign': {
            description: 'Sign JWT token',
            authentication: 'Required',
            body: {
              payload: 'object (required)',
              secret: 'string (required)',
              algorithm: 'HS256 | HS384 | HS512 (default: HS256)',
              expiresIn: 'string (optional, e.g. "1h", "7d")'
            }
          },
          'GET /api/health': {
            description: 'Health check endpoint',
            authentication: 'Not required'
          }
        }
      });
    });

    // Encode endpoint
    apiApp.post('/api/encode', (req, res) => {
      try {
        const { data, encoding = 'base64' } = req.body;
        
        if (!data) {
          return res.status(400).json({ error: 'Data is required' });
        }

        const buffer = Buffer.from(data, 'utf8');
        let encoded;

        switch (encoding.toLowerCase()) {
          case 'base64':
            encoded = buffer.toString('base64');
            break;
          case 'base64url':
            encoded = buffer.toString('base64url');
            break;
          case 'hex':
            encoded = buffer.toString('hex');
            break;
          default:
            return res.status(400).json({ error: 'Unsupported encoding' });
        }

        res.json({
          success: true,
          encoded: encoded,
          encoding: encoding,
          originalSize: buffer.length,
          encodedSize: encoded.length
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Decode endpoint
    apiApp.post('/api/decode', (req, res) => {
      try {
        const { data, encoding = 'base64', outputEncoding = 'utf8' } = req.body;
        
        if (!data) {
          return res.status(400).json({ error: 'Data is required' });
        }

        let buffer;

        switch (encoding.toLowerCase()) {
          case 'base64':
          case 'base64url':
            buffer = Buffer.from(data, encoding);
            break;
          case 'hex':
            buffer = Buffer.from(data, 'hex');
            break;
          default:
            return res.status(400).json({ error: 'Unsupported encoding' });
        }

        const decoded = buffer.toString(outputEncoding);

        res.json({
          success: true,
          decoded: decoded,
          encoding: encoding,
          encodedSize: data.length,
          decodedSize: buffer.length
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // JWT verify endpoint
    apiApp.post('/api/jwt/verify', (req, res) => {
      try {
        const { token, secret, algorithm = 'HS256' } = req.body;
        
        if (!token || !secret) {
          return res.status(400).json({ error: 'Token and secret are required' });
        }

        const decoded = jwt.verify(token, secret, { algorithms: [algorithm] });
        
        res.json({
          success: true,
          valid: true,
          decoded: decoded
        });
      } catch (error) {
        res.status(401).json({
          success: false,
          valid: false,
          error: error.message
        });
      }
    });

    // JWT sign endpoint
    apiApp.post('/api/jwt/sign', (req, res) => {
      try {
        const { payload, secret, algorithm = 'HS256', expiresIn } = req.body;
        
        if (!payload || !secret) {
          return res.status(400).json({ error: 'Payload and secret are required' });
        }

        const options = { algorithm };
        if (expiresIn) {
          options.expiresIn = expiresIn;
        }

        const token = jwt.sign(payload, secret, options);
        
        res.json({
          success: true,
          token: token
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Health check
    apiApp.get('/api/health', (req, res) => {
      res.json({
        status: 'ok',
        version: '3.0.0',
        uptime: process.uptime()
      });
    });

    serverInstance = apiApp.listen(port, 'localhost', () => {
      serverPort = port;
      console.log(`API Server running on http://localhost:${port}`);
    });

    return {
      success: true,
      port: port,
      apiKey: API_KEY,
      message: `Server started on http://localhost:${port}`
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

ipcMain.handle('stop-api-server', async () => {
  try {
    if (!serverInstance) {
      return {
        success: false,
        error: 'Server not running'
      };
    }

    await new Promise((resolve) => {
      serverInstance.close(resolve);
    });
    
    serverInstance = null;
    
    return {
      success: true,
      message: 'Server stopped'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

ipcMain.handle('get-server-status', async () => {
  return {
    running: serverInstance !== null,
    port: serverPort
  };
});
