const { ipcMain } = require('electron');

let jwt;
try {
    jwt = require('jsonwebtoken');
} catch {
    console.warn('jsonwebtoken not available - JWT features disabled');
}

function register() {
    ipcMain.handle('verify-jwt', async (event, token, secret, algorithm = 'HS256') => {
        if (!jwt) return { success: false, error: 'JWT library not available. Install with: npm install jsonwebtoken' };
        try {
            const decoded = jwt.verify(token, secret, { algorithms: [algorithm] });
            return { success: true, valid: true, decoded, message: 'Token is valid and signature verified' };
        } catch (error) {
            try {
                const decoded = jwt.decode(token, { complete: true });
                return { success: true, valid: false, decoded, error: error.message, message: 'Token signature verification failed' };
            } catch (decodeError) {
                return { success: false, error: decodeError.message };
            }
        }
    });

    ipcMain.handle('sign-jwt', async (event, payload, secret, algorithm = 'HS256', expiresIn = null) => {
        if (!jwt) return { success: false, error: 'JWT library not available. Install with: npm install jsonwebtoken' };
        try {
            const options = { algorithm };
            if (expiresIn) options.expiresIn = expiresIn;
            const token = jwt.sign(payload, secret, options);
            return { success: true, token, decoded: jwt.decode(token, { complete: true }) };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });
}

module.exports = { register };
