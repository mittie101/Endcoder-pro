const { ipcMain } = require('electron');
const fs = require('fs').promises;
const { allowedPaths } = require('../main/state');

let sharp;
try {
    sharp = require('sharp');
    console.log('sharp loaded successfully for image processing');
} catch {
    console.warn('sharp not available - image optimization disabled');
}

function register() {
    ipcMain.handle('optimize-image', async (event, filePath, options) => {
        if (!filePath || !allowedPaths.has(filePath)) {
            return { success: false, error: 'File access not permitted' };
        }
        if (!sharp) {
            return { success: false, error: 'sharp library not available. Install with: npm install sharp' };
        }
        try {
            const { width, height, format, quality } = options;
            const stats = await fs.stat(filePath);
            const originalSize = stats.size;
            let image = sharp(filePath);

            if (width || height) {
                image = image.resize(width || null, height || null, { fit: 'inside' });
            }

            let outputFormat = (format || 'jpeg').toLowerCase();
            const qualityVal = quality || 80;

            switch (outputFormat) {
                case 'png':  image = image.png({ quality: qualityVal }); break;
                case 'webp': image = image.webp({ quality: qualityVal }); break;
                case 'avif': image = image.avif({ quality: qualityVal }); break;
                default:
                    outputFormat = 'jpeg';
                    image = image.jpeg({ quality: qualityVal });
            }

            const buffer = await image.toBuffer();
            const metadata = await sharp(buffer).metadata();
            return {
                success: true,
                buffer: buffer.toString('base64'),
                format: outputFormat,
                width: metadata.width,
                height: metadata.height,
                size: buffer.length,
                originalSize
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });
}

module.exports = { register };
