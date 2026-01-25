const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // File operations
  selectFile: () => ipcRenderer.invoke('select-file'),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  saveFile: (data, defaultName) => ipcRenderer.invoke('save-file', data, defaultName),
  
  // Image optimization
  optimizeImage: (filePath, options) => ipcRenderer.invoke('optimize-image', filePath, options),
  
  // JWT operations
  verifyJWT: (token, secret, algorithm) => ipcRenderer.invoke('verify-jwt', token, secret, algorithm),
  signJWT: (payload, secret, algorithm, expiresIn) => ipcRenderer.invoke('sign-jwt', payload, secret, algorithm, expiresIn),
  
  // Password Hashing
  hashPasswordBcrypt: (password, rounds) => ipcRenderer.invoke('hash-password-bcrypt', password, rounds),
  verifyPasswordBcrypt: (password, hash) => ipcRenderer.invoke('verify-password-bcrypt', password, hash),
  hashPasswordArgon2: (password, options) => ipcRenderer.invoke('hash-password-argon2', password, options),
  verifyPasswordArgon2: (password, hash) => ipcRenderer.invoke('verify-password-argon2', password, hash),
  hashPasswordPBKDF2: (password, iterations) => ipcRenderer.invoke('hash-password-pbkdf2', password, iterations),
  verifyPasswordPBKDF2: (password, hash) => ipcRenderer.invoke('verify-password-pbkdf2', password, hash),
  
  // API Server
  startAPIServer: (port) => ipcRenderer.invoke('start-api-server', port),
  stopAPIServer: () => ipcRenderer.invoke('stop-api-server'),
  getServerStatus: () => ipcRenderer.invoke('get-server-status'),
  
  // Menu events
  onMenuOpenFile: (callback) => ipcRenderer.on('menu-open-file', callback),
  onMenuSaveOutput: (callback) => ipcRenderer.on('menu-save-output', callback),
  onStartServer: (callback) => ipcRenderer.on('start-server', callback),
  onStopServer: (callback) => ipcRenderer.on('stop-server', callback)
});
