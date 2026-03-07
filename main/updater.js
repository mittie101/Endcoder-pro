const { withRetry } = require('./retry');

function setup(getWindow) {
    let autoUpdater;
    try {
        autoUpdater = require('electron-updater').autoUpdater;
        autoUpdater.autoDownload = false;
        autoUpdater.autoInstallOnAppQuit = true;
    } catch {
        console.warn('electron-updater not available - auto-update disabled');
        return;
    }

    const { dialog } = require('electron');

    autoUpdater.on('update-available', async (info) => {
        const win = getWindow();
        if (!win) return;
        const result = await dialog.showMessageBox(win, {
            type: 'info',
            title: 'Update Available',
            message: `Version ${info.version} is available. Would you like to download it?`,
            buttons: ['Download', 'Later']
        });
        if (result.response === 0) autoUpdater.downloadUpdate();
    });

    autoUpdater.on('update-downloaded', async () => {
        const win = getWindow();
        if (!win) return;
        const result = await dialog.showMessageBox(win, {
            type: 'info',
            title: 'Update Ready',
            message: 'Update downloaded. It will be installed when you restart the app.',
            buttons: ['Restart Now', 'Later']
        });
        if (result.response === 0) autoUpdater.quitAndInstall();
    });

    // Retry the update check up to 3 times with exponential back-off (network may be unavailable at startup)
    withRetry(() => autoUpdater.checkForUpdates(), 3, 5000).catch(() => {});
}

module.exports = { setup };
