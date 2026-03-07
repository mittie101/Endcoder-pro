const { BrowserWindow, dialog, shell, Menu, app } = require('electron');
const path = require('path');

let mainWindow = null;

function getWindow() {
    return mainWindow;
}

function createWindow(onClosed) {
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
            webSecurity: true
        },
        backgroundColor: '#1a1a2e',
        show: false
    });

    mainWindow.loadFile(path.join(__dirname, '..', 'index.html'));

    // Content Security Policy.
    // 'unsafe-eval' is required by Monaco Editor's AMD loader.
    // 'unsafe-inline' for styles is needed until inline style= attributes are migrated to CSS classes.
    mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
        callback({
            responseHeaders: {
                ...details.responseHeaders,
                'Content-Security-Policy': [
                    "default-src 'self'; " +
                    "script-src 'self' 'unsafe-eval' https://cdn.jsdelivr.net; " +
                    "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; " +
                    "img-src 'self' data: blob:; " +
                    "connect-src 'self' https://cdn.jsdelivr.net; " +
                    "worker-src blob:; " +
                    "font-src 'self' https://cdn.jsdelivr.net data:"
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
