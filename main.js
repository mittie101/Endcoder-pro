const { app, BrowserWindow } = require('electron');

// Disable GPU hardware acceleration — this app has no 3D/GPU needs, and the
// Chromium GPU sandbox conflicts with Windows ACLs on non-standard install paths
// (e.g. C:\projects\) causing the GPU process to crash and taking the network
// service down with it, which prevents index.html from loading (ERR_ACCESS_DENIED).
if (typeof app.disableHardwareAcceleration === 'function') {
    app.disableHardwareAcceleration();
    app.commandLine.appendSwitch('disable-gpu');
    app.commandLine.appendSwitch('disable-software-rasterizer');
}

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
