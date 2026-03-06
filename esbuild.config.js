const esbuild = require('esbuild');

// Build configuration for bundling ES modules
// This enables incremental migration from CommonJS to ES modules
esbuild.build({
  entryPoints: ['encodings.js'],
  bundle: false,
  outdir: 'dist',
  format: 'esm',
  platform: 'browser',
  target: ['es2020'],
  sourcemap: true,
}).catch(() => process.exit(1));
