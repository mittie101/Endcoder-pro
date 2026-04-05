const { contextBridge, ipcRenderer } = require('electron');

// Read the per-session style nonce passed via webPreferences.additionalArguments.
// Exposing MonacoEnvironment via contextBridge sets window.MonacoEnvironment in the page world
// before any page script executes, so Monaco's dynamic <style> tags get the correct nonce
// and style-src 'unsafe-inline' can be dropped from the CSP.
const _nonceArg = process.argv.find(a => a.startsWith('--style-nonce='));
const _styleNonce = _nonceArg ? _nonceArg.slice('--style-nonce='.length) : '';

contextBridge.exposeInMainWorld('MonacoEnvironment', {
    nonce: _styleNonce,
    getWorkerUrl: function (_moduleId, _label) {
        // All workers share the single bundled worker entry point
        return './vendor/editor.worker.bundle.js';
    }
});

contextBridge.exposeInMainWorld('electronAPI', {
    // File operations
    selectFile: () => ipcRenderer.invoke('select-file'),
    readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
    saveFile: (data, defaultName) => ipcRenderer.invoke('save-file', data, defaultName),
    saveImage: (base64Data, defaultName, format) => ipcRenderer.invoke('save-image', base64Data, defaultName, format),

    // Image optimization
    optimizeImage: (filePath, options) => ipcRenderer.invoke('optimize-image', filePath, options),

    // JWT operations
    verifyJWT: (token, secret, algorithm) => ipcRenderer.invoke('verify-jwt', token, secret, algorithm),
    signJWT: (payload, secret, algorithm, expiresIn) => ipcRenderer.invoke('sign-jwt', payload, secret, algorithm, expiresIn),

    // Password Hashing
    hashPasswordBcrypt:  (password, rounds)      => ipcRenderer.invoke('hash-password-bcrypt', password, rounds),
    verifyPasswordBcrypt:(password, hash)         => ipcRenderer.invoke('verify-password-bcrypt', password, hash),
    hashPasswordArgon2:  (password, options)      => ipcRenderer.invoke('hash-password-argon2', password, options),
    verifyPasswordArgon2:(password, hash)         => ipcRenderer.invoke('verify-password-argon2', password, hash),
    hashPasswordPBKDF2:  (password, iterations)   => ipcRenderer.invoke('hash-password-pbkdf2', password, iterations),
    verifyPasswordPBKDF2:(password, hash)         => ipcRenderer.invoke('verify-password-pbkdf2', password, hash),

    // API Server
    startAPIServer:  (port) => ipcRenderer.invoke('start-api-server', port),
    stopAPIServer:   ()     => ipcRenderer.invoke('stop-api-server'),
    getServerStatus: ()     => ipcRenderer.invoke('get-server-status'),

    // API key rotation
    rotateAPIKey: () => ipcRenderer.invoke('rotate-api-key'),

    // Menu events — each returns an unsubscribe function to prevent listener accumulation
    onMenuOpenFile:  (cb) => { ipcRenderer.on('menu-open-file',  cb); return () => ipcRenderer.removeListener('menu-open-file',  cb); },
    onMenuSaveOutput:(cb) => { ipcRenderer.on('menu-save-output',cb); return () => ipcRenderer.removeListener('menu-save-output',cb); },
    onStartServer:   (cb) => { ipcRenderer.on('start-server',    cb); return () => ipcRenderer.removeListener('start-server',    cb); },
    onStopServer:    (cb) => { ipcRenderer.on('stop-server',     cb); return () => ipcRenderer.removeListener('stop-server',     cb); },
    onUpdateReady:   (cb) => { ipcRenderer.on('update-ready',    cb); return () => ipcRenderer.removeListener('update-ready',    cb); },

    // Dialogs
    showConfirmDialog: (title, message) => ipcRenderer.invoke('show-confirm-dialog', title, message),
});
