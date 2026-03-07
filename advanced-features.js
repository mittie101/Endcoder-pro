// advanced-features.js - Sanitize, Snippets, and QR Codes
/* exported AdvancedFeatures */
class AdvancedFeatures {
    constructor(uiHandler) {
      this.ui = uiHandler;
      this.qr = null; // Store QR instance
    }
  
    init() {
      this.setupEventListeners();
      this._listenForUpdates();
    }

    _listenForUpdates() {
      if (!window.electronAPI?.onUpdateReady) return;
      window.electronAPI.onUpdateReady(() => {
        this.ui.showNotification('Update downloaded — restart the app to apply it.', 'info');
      });
    }
  
    setupEventListeners() {
      // Sanitize Button
      const sanitizeBtn = document.getElementById('sanitizeBtn');
      if (sanitizeBtn) {
        sanitizeBtn.addEventListener('click', () => this.sanitizeInput());
      }
  
      // QR Code Button
      const qrCodeBtn = document.getElementById('qrCodeBtn');
      if (qrCodeBtn) {
        qrCodeBtn.addEventListener('click', () => this.generateQRCode());
      }
  
      // Close QR Button
      document.getElementById('closeQrBtn')?.addEventListener('click', () => {
        document.getElementById('qrCodeContainer').style.display = 'none';
      });
  
      // Download QR Button
      document.getElementById('downloadQrBtn')?.addEventListener('click', () => {
        this.downloadQRCode();
      });
  
      // Snippet Menu Buttons
      document.getElementById('snippetMenu')?.addEventListener('click', (e) => {
        if (e.target.tagName === 'A') {
          const type = e.target.dataset.type;
          this.generateSnippet(type);
        }
      });
    }
  
    sanitizeInput() {
      const editor = this.ui.getMonacoEditor('input');
      if (!editor) return;
  
      const input = editor.getValue();
      if (!input) {
        this.ui.showError('Nothing to sanitize');
        return;
      }
  
      let sanitized = input.replace(/\s/g, ''); // Remove whitespace
      sanitized = sanitized.replace(/^(begin-base64|-----BEGIN.*-----)/gm, '');
      sanitized = sanitized.replace(/(end-base64|-----END.*-----)/gm, '');
      sanitized = sanitized.replace(/^\d+\s*/gm, '');
      
      if ((sanitized.includes('-') || sanitized.includes('_')) && !sanitized.includes('+') && !sanitized.includes('/')) {
        sanitized = sanitized.replace(/-/g, '+').replace(/_/g, '/');
      }
      
      while (sanitized.length % 4 !== 0) sanitized += '=';
  
      editor.setValue(sanitized);
      this.ui.showSuccess('Input sanitized');
    }
  
    generateQRCode() {
      const editor = this.ui.getMonacoEditor('output');
      if (!editor) return;
  
      const value = editor.getValue();
      if (!value) {
        this.ui.showError('No output text to generate QR code from');
        return;
      }
  
      if (value.length > 2953) {
        this.ui.showError('Text too long for standard QR code (max ~2900 chars)');
        return;
      }
  
      const container = document.getElementById('qrCodeContainer');
      const canvas = document.getElementById('qrCanvas');
      
      // Initialize QRious library
      if (typeof QRious === 'undefined') {
        this.ui.showError('QR Library failed to load. Please restart the application.');
        return;
      }
  
      this.qr = new QRious({
        element: canvas,
        value: value,
        size: 250,
        level: 'H' // High error correction
      });
  
      container.style.display = 'flex';
    }
  
    downloadQRCode() {
      const canvas = document.getElementById('qrCanvas');
      if (canvas) {
        const link = document.createElement('a');
        link.download = 'qrcode.png';
        link.href = canvas.toDataURL();
        link.click();
        this.ui.showSuccess('QR Code downloaded');
      }
    }
  
    generateSnippet(type) {
      const editor = this.ui.getMonacoEditor('output');
      if (!editor) return;
  
      const output = editor.getValue();
      if (!output) {
        this.ui.showError('No output to generate snippet from');
        return;
      }
  
      let mimeType = 'text/plain';
      if (output.startsWith('/9j/')) mimeType = 'image/jpeg';
      else if (output.startsWith('iVBORw0KGgo')) mimeType = 'image/png';
      else if (output.startsWith('R0lGOD')) mimeType = 'image/gif';
      else if (output.startsWith('UklGR')) mimeType = 'image/webp';
      else if (output.startsWith('PHN2')) mimeType = 'image/svg+xml';
  
      let snippet = '';
      switch (type) {
        case 'img': snippet = `<img src="data:${mimeType};base64,${output}" alt="Encoded Image" />`; break;
        case 'css': snippet = `.element {\n  background-image: url('data:${mimeType};base64,${output}');\n}`; break;
        case 'datauri': snippet = `data:${mimeType};base64,${output}`; break;
        case 'json': snippet = JSON.stringify({ data: output, mime: mimeType }, null, 2); break;
      }
  
      navigator.clipboard.writeText(snippet).then(() => {
        this.ui.showSuccess(`${type.toUpperCase()} snippet copied`);
      });
    }
  }