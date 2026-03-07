// Monaco ESM bundle entry point.
// window.MonacoEnvironment (including nonce and getWorkerUrl) is set by preload.js
// via contextBridge before this script executes, so Monaco's dynamic <style> tags
// will carry the CSP nonce — no 'unsafe-inline' required in style-src.
import * as monaco from 'monaco-editor/esm/vs/editor/editor.main.js';
globalThis.monaco = monaco;
