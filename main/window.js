const { BrowserWindow, dialog, shell, Menu, app } = require('electron');
const path = require('path');
const crypto = require('crypto');

let mainWindow = null;

function getWindow() {
    return mainWindow;
}

function createWindow(onClosed) {
    // Random per-session nonce for Monaco's dynamic <style> injection.
    // Passed to the renderer via additionalArguments so preload can set MonacoEnvironment.nonce
    // before any page script runs, allowing us to drop 'unsafe-inline' from style-src.
    const styleNonce = crypto.randomBytes(16).toString('base64').replace(/=+$/, '');

    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 600,
        icon: path.join(__dirname, '..', 'icon.ico'),
        webPreferences: {
            preload: path.join(__dirname, '..', 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
            webSecurity: true,
            additionalArguments: [`--style-nonce=${styleNonce}`]
        },
        backgroundColor: '#1a1a2e',
        show: false
    });

    mainWindow.loadFile(path.join(__dirname, '..', 'index.html'));

    // Content Security Policy.
    // Monaco is locally bundled and uses MonacoEnvironment.nonce (set by preload) so all
    // dynamically injected <style> tags carry the nonce — no 'unsafe-inline' needed.
    mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
        callback({
            responseHeaders: {
                ...details.responseHeaders,
                'Content-Security-Policy': [
                    "default-src 'self'; " +
                    "script-src 'self'; " +
                    `style-src 'self' 'nonce-${styleNonce}'; ` +
                    "img-src 'self' data: blob:; " +
                    "connect-src 'self'; " +
                    "worker-src 'self' blob:; " +
                    "font-src 'self' data:"
                ]
            }
        });
    });

    mainWindow.once('ready-to-show', () => mainWindow.show());
    _buildMenu();

    mainWindow.on('closed', () => {
        mainWindow = null;
        if (onClosed) onClosed();
    });

    return mainWindow;
}

function _buildMenu() {
    const template = [
        {
            label: 'File',
            submenu: [
                { label: 'Open File',   accelerator: 'CmdOrCtrl+O', click: () => mainWindow.webContents.send('menu-open-file') },
                { label: 'Save Output', accelerator: 'CmdOrCtrl+S', click: () => mainWindow.webContents.send('menu-save-output') },
                { type: 'separator' },
                { label: 'Exit',        accelerator: 'CmdOrCtrl+Q', click: () => app.quit() }
            ]
        },
        {
            label: 'Edit',
            submenu: [
                { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
                { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }
            ]
        },
        {
            label: 'Server',
            submenu: [
                { label: 'Start Local API Server', click: () => mainWindow.webContents.send('start-server') },
                { label: 'Stop Local API Server',  click: () => mainWindow.webContents.send('stop-server') }
            ]
        },
        {
            label: 'Help',
            submenu: [
                { label: 'Documentation', click: () => shell.openExternal('https://github.com/mittie101/Endcoder-pro') },
                { type: 'separator' },
                {
                    label: 'About',
                    click: () => dialog.showMessageBox(mainWindow, {
                        type: 'info',
                        title: 'About Endcoder Pro',
                        message: 'Endcoder Pro v3.1.0',
                        detail: 'Professional encoding/decoding tool with Monaco Editor, JWT verification, image optimization, and developer API.'
                    })
                }
            ]
        }
    ];
    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

module.exports = { createWindow, getWindow };
