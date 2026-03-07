// Centralised constants for the main process.
// Import this module instead of scattering magic numbers across IPC handlers.
module.exports = {
    DEFAULT_SERVER_PORT:      3000,
    BODY_LIMIT:               '50mb',
    BCRYPT_DEFAULT_ROUNDS:    10,
    PBKDF2_DEFAULT_ITERATIONS: 100000,
    ARGON2_DEFAULT_MEMORY_KB: 65536,
    ARGON2_DEFAULT_TIME_COST: 3,
    ARGON2_DEFAULT_PARALLELISM: 4,
};
