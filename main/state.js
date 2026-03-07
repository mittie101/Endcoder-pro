// Shared main-process state — imported by any module that needs the allowedPaths gate.
const allowedPaths = new Set();

module.exports = { allowedPaths };
