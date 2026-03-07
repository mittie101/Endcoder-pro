/**
 * Calls `fn` up to `maxAttempts` times, with exponential back-off between failures.
 * Suitable for transient errors on file I/O, network calls, and process spawning.
 *
 * @param {() => Promise<any>} fn
 * @param {number} maxAttempts  Default 3
 * @param {number} baseDelayMs  Base delay in ms; doubles each attempt. Default 300
 * @returns {Promise<any>}
 */
async function withRetry(fn, maxAttempts = 3, baseDelayMs = 300) {
    let lastError;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            if (attempt < maxAttempts) {
                await new Promise(r => setTimeout(r, baseDelayMs * 2 ** (attempt - 1)));
            }
        }
    }
    throw lastError;
}

module.exports = { withRetry };
