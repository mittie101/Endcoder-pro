const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

const vendorDir = path.join(__dirname, 'vendor');
if (!fs.existsSync(vendorDir)) fs.mkdirSync(vendorDir);

const sharedOpts = {
    bundle: true,
    platform: 'browser',
    target: ['es2020'],
    define: { 'process.env.NODE_ENV': '"production"' },
    loader: { '.ttf': 'dataurl', '.woff': 'dataurl', '.woff2': 'dataurl' },
    minify: true,
    logLevel: 'info',
};

Promise.all([
    // Main Monaco bundle (editor + all languages); CSS extracted to vendor/monaco.bundle.css
    esbuild.build({
        ...sharedOpts,
        entryPoints: [path.join(__dirname, 'vendor-src/monaco-entry.js')],
        outfile: path.join(__dirname, 'vendor/monaco.bundle.js'),
        format: 'iife',
    }),

    // Editor web worker bundle
    esbuild.build({
        ...sharedOpts,
        entryPoints: [path.join(__dirname, 'vendor-src/editor-worker-entry.js')],
        outfile: path.join(__dirname, 'vendor/editor.worker.bundle.js'),
        format: 'iife',
    }),
]).catch(() => process.exit(1));
