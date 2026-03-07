const { ipcMain } = require('electron');
const crypto = require('crypto');

let bcrypt;
try {
    bcrypt = require('bcrypt');
    console.log('✓ bcrypt loaded successfully for password hashing');
} catch (e) {
    console.error('✗ bcrypt not available:', e.message);
}

let argon2;
try {
    argon2 = require('argon2');
    console.log('✓ argon2 loaded successfully for password hashing');
} catch (e) {
    console.error('✗ argon2 not available:', e.message);
}

function register() {
    ipcMain.handle('hash-password-bcrypt', async (event, password, rounds = 10) => {
        if (!bcrypt) return { success: false, error: 'bcrypt not available. Run install-password-hash.bat or use PBKDF2 fallback.', fallback: true };
        try {
            const hash = await bcrypt.hash(password, rounds);
            return { success: true, hash, algorithm: 'bcrypt', rounds };
        } catch (error) { return { success: false, error: error.message }; }
    });

    ipcMain.handle('verify-password-bcrypt', async (event, password, hash) => {
        if (!bcrypt) return { success: false, error: 'bcrypt not available. Run install-password-hash.bat', fallback: true };
        try {
            return { success: true, match: await bcrypt.compare(password, hash) };
        } catch (error) { return { success: false, error: error.message }; }
    });

    ipcMain.handle('hash-password-argon2', async (event, password, options = {}) => {
        if (!argon2) return { success: false, error: 'argon2 not available. Run install-password-hash.bat or use PBKDF2 fallback.', fallback: true };
        try {
            const { memoryCost = 65536, timeCost = 3, parallelism = 4 } = options;
            const hash = await argon2.hash(password, { type: argon2.argon2id, memoryCost, timeCost, parallelism });
            return { success: true, hash, algorithm: 'argon2id', options: { memoryCost, timeCost, parallelism } };
        } catch (error) { return { success: false, error: error.message }; }
    });

    ipcMain.handle('verify-password-argon2', async (event, password, hash) => {
        if (!argon2) return { success: false, error: 'argon2 not available. Run install-password-hash.bat', fallback: true };
        try {
            return { success: true, match: await argon2.verify(hash, password) };
        } catch (error) { return { success: false, error: error.message }; }
    });

    ipcMain.handle('hash-password-pbkdf2', async (event, password, iterations = 100000) => {
        try {
            const salt = crypto.randomBytes(16);
            const hash = await new Promise((resolve, reject) => {
                crypto.pbkdf2(password, salt, iterations, 64, 'sha512', (err, key) => err ? reject(err) : resolve(key));
            });
            return {
                success: true,
                hash: `$pbkdf2$${iterations}$${salt.toString('base64')}$${hash.toString('base64')}`,
                algorithm: 'PBKDF2-SHA512',
                iterations
            };
        } catch (error) { return { success: false, error: error.message }; }
    });

    ipcMain.handle('verify-password-pbkdf2', async (event, password, hashString) => {
        try {
            const parts = hashString.split('$');
            if (parts.length !== 5 || parts[1] !== 'pbkdf2') throw new Error('Invalid PBKDF2 hash format');
            const iterations = parseInt(parts[2]);
            const salt = Buffer.from(parts[3], 'base64');
            const originalHash = Buffer.from(parts[4], 'base64');
            const hash = await new Promise((resolve, reject) => {
                crypto.pbkdf2(password, salt, iterations, 64, 'sha512', (err, key) => err ? reject(err) : resolve(key));
            });
            return { success: true, match: crypto.timingSafeEqual(originalHash, hash) };
        } catch (error) { return { success: false, error: error.message }; }
    });
}

module.exports = { register };
