const { ipcMain, dialog } = require('electron');
const fs = require('fs').promises;
const path = require('path');
const { getWindow } = require('../main/window');
const { allowedPaths } = require('../main/state');
const { withRetry } = require('../main/retry');

function register() {
    ipcMain.handle('select-file', async () => {
        const result = await dialog.showOpenDialog(getWindow(), {
            properties: ['openFile'],
            filters: [
                { name: 'All Files',   extensions: ['*'] },
                { name: 'Images',      extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'] },
                { name: 'Text Files',  extensions: ['txt', 'json', 'xml', 'html', 'css', 'js'] }
            ]
        });
        if (!result.canceled && result.filePaths.length > 0) {
            const filePath = result.filePaths[0];
            allowedPaths.add(filePath);
            return filePath;
        }
        return null;
    });

    ipcMain.handle('read-file', async (event, filePath) => {
        if (!filePath || !allowedPaths.has(filePath)) {
            return { success: false, error: 'File access not permitted' };
        }
        try {
            return await withRetry(async () => {
                const stats = await fs.stat(filePath);
                const buffer = await fs.readFile(filePath);
                return {
                    success: true,
                    buffer: buffer.toString('base64'),
                    size: stats.size,
                    name: path.basename(filePath),
                    path: filePath
                };
            });
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('save-image', async (event, base64Data, defaultName, format) => {
        const ext = (format || 'jpg').replace(/^\./, '');
        const result = await dialog.showSaveDialog(getWindow(), {
            defaultPath: defaultName || `optimized.${ext}`,
            filters: [
                { name: 'Image Files', extensions: ['jpg', 'jpeg', 'png', 'webp', 'avif'] },
                { name: 'All Files',   extensions: ['*'] }
            ]
        });
        if (!result.canceled && result.filePath) {
            try {
                await fs.writeFile(result.filePath, Buffer.from(base64Data, 'base64'));
                return { success: true, path: result.filePath };
            } catch (error) {
                return { success: false, error: error.message };
            }
        }
        return { success: false, error: 'Save cancelled' };
    });

    ipcMain.handle('save-file', async (event, data, defaultName = 'output.txt') => {
        const result = await dialog.showSaveDialog(getWindow(), {
            defaultPath: defaultName,
            filters: [
                { name: 'All Files',    extensions: ['*'] },
                { name: 'Text Files',   extensions: ['txt'] },
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
}

module.exports = { register };
