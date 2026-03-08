// renderer-config.js — shared constants for the renderer process (browser context)
// Mirrors the role of main/config.js for the main process.
window.RendererConfig = {
  FILE_SIZE_MAX:     50 * 1024 * 1024,  // 50 MB — hard limit for drag-drop
  FILE_SIZE_WARNING: 10 * 1024 * 1024,  // 10 MB — warn before loading large files
};
