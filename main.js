const { app, BrowserWindow } = require('electron');
const { createWindow, getWindow } = require('./main/window');
const updater     = require('./main/updater');
const filesIpc    = require('./ipc/files');
const imageIpc    = require('./ipc/image');
const jwtIpc      = require('./ipc/jwt');
const passwordsIpc = require('./ipc/passwords');
const serverIpc   = require('./ipc/server');

// Register all IPC handlers at startup
filesIpc.register();
imageIpc.register();
jwtIpc.register();
passwordsIpc.register();
serverIpc.register();

app.whenReady().then(() => {
    createWindow(() => serverIpc.shutdown());
    updater.setup(getWindow);
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow(() => serverIpc.shutdown());
    }
});
