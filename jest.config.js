module.exports = {
    testEnvironment: 'node',
    // Coverage is collected only from the Node.js main-process files (ipc/ and main/).
    // Renderer files (app.js, converter.js, etc.) run in a browser context and are loaded
    // via new Function() in tests, which means Istanbul cannot instrument them for coverage.
    collectCoverageFrom: [
        'ipc/*.js',
        'main/*.js',
    ],
    coverageThreshold: {
        // Global floor guards against large regressions.
        // Thresholds reflect that image.js, passwords.js and updater.js require native binaries
        // (sharp / bcrypt / argon2 / electron-updater) whose code paths are only partially
        // exercised in the Jest environment. Well-tested files (server.js, jwt.js, config.js,
        // state.js) score 80-100% and pull the average up to the floor values below.
        global: {
            lines:      55,
            functions:  55,
            branches:   40,
            statements: 55,
        }
    }
};
