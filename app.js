// app.js - Main application coordinator
class App {
  constructor() {
    this.converter = new Converter();
    this.ui = new UIHandler();
    this.history = new HistoryManager();
    this.jwtHandler = new JWTHandler(this.ui);
    this.diffTool = new DiffTool(this.ui);
    this.advanced = new AdvancedFeatures(this.ui); // Initialize Advanced Features
    this.serverRunning = false;
  }

  initTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      document.body.setAttribute('data-theme', 'light');
    }
  }

  async init() {
    console.log('Initializing Endcoder Pro v3.1...');
    
    // Initialize theme
    this.initTheme();
    
    // Wait for Monaco to load
    await this.waitForMonaco();
    
    // Initialize Monaco editors
    this.initMonacoEditors();
    
    // Initialize UI
    this.ui.init();
    
    // Initialize modules
    this.jwtHandler.init();
    this.diffTool.init();
    this.advanced.init(); // Init advanced features
    this.history.updateHistoryUI();
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Setup menu handlers
    this.setupMenuHandlers();
    
    // Setup auto-detect on paste
    this.setupPasteDetection();

    // Setup drag and drop
    this.setupDragAndDrop();
    
    // Setup tooltips
    this.setupTooltips();
    
    // Initialize status bar
    this.initStatusBar();
    
    // Check server status
    await this.checkServerStatus();
    
    // Check password hash dependencies
    await this.checkPasswordHashDependencies();
    
    console.log('Application initialized successfully');
    this.ui.showSuccess('Endcoder Pro ready');
  }

  async checkPasswordHashDependencies() {
    if (!window.electronAPI) return;
    try {
      // Basic dependency checks - optional implementation
    } catch (error) {
      console.error('Error checking dependencies:', error);
    }
  }

  waitForMonaco() {
    return new Promise((resolve) => {
      if (typeof monaco !== 'undefined') {
        resolve();
        return;
      }
      let elapsed = 0;
      const checkMonaco = setInterval(() => {
        elapsed += 100;
        if (typeof monaco !== 'undefined') {
          clearInterval(checkMonaco);
          resolve();
        } else if (elapsed >= 30000) {
          clearInterval(checkMonaco);
          console.error('Monaco editor timed out after 30s');
          resolve(); // unblock init rather than hanging forever
        }
      }, 100);
    });
  }

  initMonacoEditors() {
    // Main encoder input
    const inputEditor = monaco.editor.create(document.getElementById('monacoInput'), {
      value: '',
      language: 'plaintext',
      theme: 'vs-dark',
      automaticLayout: true,
      minimap: { enabled: true },
      wordWrap: 'on',
      fontSize: 14,
      lineNumbers: 'on',
      folding: true,
      renderWhitespace: 'selection'
    });
    this.ui.setMonacoEditor('input', inputEditor);

    // Main encoder output
    const outputEditor = monaco.editor.create(document.getElementById('monacoOutput'), {
      value: '',
      language: 'plaintext',
      theme: 'vs-dark',
      automaticLayout: true,
      minimap: { enabled: true },
      wordWrap: 'on',
      fontSize: 14,
      lineNumbers: 'on',
      readOnly: true,
      folding: true
    });
    this.ui.setMonacoEditor('output', outputEditor);

    // JWT payload editor
    const jwtPayloadEditor = monaco.editor.create(document.getElementById('monacoJWTPayload'), {
      value: '{\n  "sub": "1234567890",\n  "name": "John Doe",\n  "iat": 1516239022\n}',
      language: 'json',
      theme: 'vs-dark',
      automaticLayout: true,
      minimap: { enabled: false },
      wordWrap: 'on',
      fontSize: 14
    });
    this.ui.setMonacoEditor('jwtPayload', jwtPayloadEditor);

    // Diff left editor
    const diffLeftEditor = monaco.editor.create(document.getElementById('monacoDiffLeft'), {
      value: '',
      language: 'plaintext',
      theme: 'vs-dark',
      automaticLayout: true,
      minimap: { enabled: false },
      wordWrap: 'on',
      fontSize: 14
    });
    this.ui.setMonacoEditor('diffLeft', diffLeftEditor);

    // Diff right editor
    const diffRightEditor = monaco.editor.create(document.getElementById('monacoDiffRight'), {
      value: '',
      language: 'plaintext',
      theme: 'vs-dark',
      automaticLayout: true,
      minimap: { enabled: false },
      wordWrap: 'on',
      fontSize: 14
    });
    this.ui.setMonacoEditor('diffRight', diffRightEditor);
  }

  setupEventListeners() {
    // Encode button
    document.getElementById('encodeBtn')?.addEventListener('click', () => this.encode());
    
    // Decode button
    document.getElementById('decodeBtn')?.addEventListener('click', () => this.decode());
    
    // Clear buttons
    document.getElementById('clearInput')?.addEventListener('click', () => this.clearInput());
    document.getElementById('clearOutput')?.addEventListener('click', () => this.clearOutput());
    
    // Copy buttons
    document.getElementById('copyInput')?.addEventListener('click', () => this.copyInput());
    document.getElementById('copyOutput')?.addEventListener('click', () => this.copyOutput());
    
    // File operations
    document.getElementById('loadFile')?.addEventListener('click', () => this.loadFile());
    document.getElementById('saveOutput')?.addEventListener('click', () => this.saveOutput());
    
    // Swap button
    document.getElementById('swapBtn')?.addEventListener('click', () => this.swapInputOutput());

    // Pipeline controls
    document.getElementById('togglePipeline')?.addEventListener('click', () => this.togglePipeline());
    document.getElementById('addPipelineStep')?.addEventListener('click', () => this.addPipelineStep());
    document.getElementById('runPipeline')?.addEventListener('click', () => this.runPipeline());
    document.getElementById('clearPipeline')?.addEventListener('click', () => this.clearPipeline());

    // Image optimization
    document.getElementById('optimizeImageBtn')?.addEventListener('click', () => this.optimizeImage());
    
    // Export options
    document.getElementById('exportCSharp')?.addEventListener('click', () => this.exportAsCSharp());
    document.getElementById('exportJava')?.addEventListener('click', () => this.exportAsJava());
    document.getElementById('exportPython')?.addEventListener('click', () => this.exportAsPython());
    
    // Server controls
    document.getElementById('startServer')?.addEventListener('click', () => this.startServer());
    document.getElementById('stopServer')?.addEventListener('click', () => this.stopServer());
    document.getElementById('rotateKeyBtn')?.addEventListener('click', () => this.rotateKey());
    
    // History controls
    document.getElementById('clearHistory')?.addEventListener('click', () => this.clearHistory());
    document.getElementById('exportHistory')?.addEventListener('click', () => this.exportHistory());
    
    // Theme toggle
    document.getElementById('themeToggle')?.addEventListener('click', () => this.toggleTheme());
    
    // Dropdown toggle functionality
    this.setupDropdownHandlers();

    // Keyboard shortcuts
    this.setupKeyboardShortcuts();
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl+E - Encode
      if (e.ctrlKey && !e.shiftKey && e.key === 'e') {
        e.preventDefault();
        this.encode();
      }
      // Ctrl+D - Decode
      if (e.ctrlKey && !e.shiftKey && e.key === 'd') {
        e.preventDefault();
        this.decode();
      }
      // Ctrl+Shift+C - Copy output
      if (e.ctrlKey && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        this.copyOutput();
      }
      // Ctrl+O - Open/load file
      if (e.ctrlKey && !e.shiftKey && e.key === 'o') {
        e.preventDefault();
        this.loadFile();
      }
      // Ctrl+S - Save output
      if (e.ctrlKey && !e.shiftKey && e.key === 's') {
        e.preventDefault();
        this.saveOutput();
      }
      // Ctrl+Shift+X - Swap input/output
      if (e.ctrlKey && e.shiftKey && e.key === 'X') {
        e.preventDefault();
        this.swapInputOutput();
      }
    });
  }

  swapInputOutput() {
    const inputEditor = this.ui.getMonacoEditor('input');
    const outputEditor = this.ui.getMonacoEditor('output');
    if (inputEditor && outputEditor) {
      const inputVal = inputEditor.getValue();
      const outputVal = outputEditor.getValue();
      inputEditor.setValue(outputVal);
      outputEditor.setValue(inputVal);
      this.ui.showNotification('Input and output swapped', 'success');
    }
  }

  togglePipeline() {
    const container = document.getElementById('pipelineContainer');
    if (container) {
      container.style.display = container.style.display === 'none' ? 'flex' : 'none';
    }
  }

  addPipelineStep() {
    const encoding = document.getElementById('pipelineEncoding');
    const action = document.getElementById('pipelineAction');
    if (!encoding || !action) return;

    if (!this.pipelineSteps) this.pipelineSteps = [];
    this.pipelineSteps.push({ encoding: encoding.value, action: action.value });
    this.renderPipelineSteps();
  }

  renderPipelineSteps() {
    const container = document.getElementById('pipelineSteps');
    if (!container) return;
    container.innerHTML = '';
    (this.pipelineSteps || []).forEach((step, i) => {
      const tag = document.createElement('span');
      tag.style.cssText = 'background:#2a3f5f;color:#00d9ff;padding:4px 8px;border-radius:4px;font-size:12px;display:inline-flex;align-items:center;gap:4px;';
      tag.textContent = (i + 1) + '. ' + step.action + '(' + step.encoding + ')';
      const removeBtn = document.createElement('button');
      removeBtn.textContent = 'x';
      removeBtn.style.cssText = 'background:none;border:none;color:#e74c3c;cursor:pointer;font-size:12px;padding:0 2px;';
      removeBtn.addEventListener('click', () => {
        this.pipelineSteps.splice(i, 1);
        this.renderPipelineSteps();
      });
      tag.appendChild(removeBtn);
      container.appendChild(tag);
    });
  }

  runPipeline() {
    if (!this.pipelineSteps || this.pipelineSteps.length === 0) {
      this.ui.showNotification('Add at least one pipeline step first', 'error');
      return;
    }
    const inputEditor = this.ui.getMonacoEditor('input');
    const outputEditor = this.ui.getMonacoEditor('output');
    if (!inputEditor || !outputEditor) return;

    let value = inputEditor.getValue();
    try {
      for (const step of this.pipelineSteps) {
        if (step.action === 'encode') {
          value = this.converter.encode(value, step.encoding);
        } else {
          value = this.converter.decode(value, step.encoding);
        }
      }
      outputEditor.setValue(value);
      this.ui.showNotification('Pipeline executed: ' + this.pipelineSteps.length + ' steps', 'success');
    } catch (error) {
      this.ui.showNotification('Pipeline error: ' + error.message, 'error');
    }
  }

  clearPipeline() {
    this.pipelineSteps = [];
    this.renderPipelineSteps();
  }

  setupPasteDetection() {
    const inputEditor = this.ui.getMonacoEditor('input');
    if (inputEditor) {
      // Listen for content changes that might be paste events
      let lastLength = 0;
      inputEditor.onDidChangeModelContent((_e) => {
        const currentValue = inputEditor.getValue();
        const lengthDiff = currentValue.length - lastLength;
        lastLength = currentValue.length;

        // Detect paste: large content change (more than 5 chars added at once)
        if (lengthDiff > 5 && currentValue.length > 0) {
          const detected = this.converter.detectEncoding(currentValue);
          if (detected !== 'unknown') {
            this.ui.showNotification(
              'Detected encoding: ' + detected.toUpperCase() + ' — Press Ctrl+D to decode',
              'success'
            );
            // Auto-select the detected encoding in the dropdown
            const encodingSelect = document.getElementById('encodingSelect');
            if (encodingSelect) {
              const option = Array.from(encodingSelect.options).find(
                (opt) => opt.value.toLowerCase() === detected.toLowerCase()
              );
              if (option) {
                encodingSelect.value = option.value;
              }
            }
          }
        }
      });
    }
  }

  setupDropdownHandlers() {
    // Handle dropdown button clicks
    document.querySelectorAll('.dropdown > .btn-small').forEach(button => {
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        const dropdown = button.parentElement;
        
        // Close all other dropdowns
        document.querySelectorAll('.dropdown.active').forEach(other => {
          if (other !== dropdown) {
            other.classList.remove('active');
          }
        });
        
        // Toggle current dropdown
        dropdown.classList.toggle('active');
      });
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.dropdown')) {
        document.querySelectorAll('.dropdown.active').forEach(dropdown => {
          dropdown.classList.remove('active');
        });
      }
    });
    
    // Close dropdown after selecting an option
    document.querySelectorAll('.dropdown-content a').forEach(link => {
      link.addEventListener('click', () => {
        const dropdown = link.closest('.dropdown');
        if (dropdown) {
          dropdown.classList.remove('active');
        }
      });
    });
  }

  setupMenuHandlers() {
    if (window.electronAPI) {
      window.electronAPI.onMenuOpenFile(() => this.loadFile());
      window.electronAPI.onMenuSaveOutput(() => this.saveOutput());
      window.electronAPI.onStartServer(() => this.startServer());
      window.electronAPI.onStopServer(() => this.stopServer());
    }
  }

  setupDragAndDrop() {
    const dropZones = [
      { id: 'monacoInput', editor: 'input' },
      { id: 'monacoDiffLeft', editor: 'diffLeft' },
      { id: 'monacoDiffRight', editor: 'diffRight' }
    ];

    dropZones.forEach(({ id, editor }) => {
      const element = document.getElementById(id);
      if (!element) return;

      element.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        element.style.opacity = '0.5';
        element.style.border = '2px dashed #00d9ff';
      });

      element.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        element.style.opacity = '1';
        element.style.border = '';
      });

      element.addEventListener('drop', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        element.style.opacity = '1';
        element.style.border = '';

        const files = Array.from(e.dataTransfer.files);
        if (files.length === 0) return;

        const file = files[0];
        const FILE_SIZE_MAX = 50 * 1024 * 1024;

        if (file.size > FILE_SIZE_MAX) {
          this.ui.showError(`File too large (${this.ui.formatBytes(file.size)}). Maximum size is 50MB.`);
          return;
        }

        try {
          this.ui.showLoading(true);
          const text = await file.text();
          const monacoEditor = this.ui.getMonacoEditor(editor);
          if (monacoEditor) {
            monacoEditor.setValue(text);
            this.ui.showSuccess(`Loaded: ${file.name} (${this.ui.formatBytes(file.size)})`);
          }
        } catch (error) {
          this.ui.showError('Error reading file: ' + error.message);
        } finally {
          this.ui.showLoading(false);
        }
      });
    });
  }

  setupTooltips() {
    const tooltips = {
      'encodeBtn': 'Encode the input text using selected encoding (Ctrl+E)',
      'decodeBtn': 'Decode the input text using selected encoding (Ctrl+D)',
      'loadFile': 'Load a file into the input editor (Ctrl+O)',
      'saveOutput': 'Save the output to a file (Ctrl+S)',
      'copyInput': 'Copy input to clipboard',
      'copyOutput': 'Copy output to clipboard',
      'clearInput': 'Clear the input editor',
      'clearOutput': 'Clear the output editor',
      'themeToggle': 'Toggle between light and dark theme',
      'startServer': 'Start the local HTTP API server',
      'stopServer': 'Stop the local HTTP API server',
      'sanitizeBtn': 'Clean up whitespace and fix common formatting issues'
    };

    Object.entries(tooltips).forEach(([id, text]) => {
      const element = document.getElementById(id);
      if (element && !element.title) {
        element.title = text;
      }
    });
  }

  initStatusBar() {
    let statusBar = document.getElementById('statusBar');
    if (!statusBar) {
      statusBar = document.createElement('div');
      statusBar.id = 'statusBar';
      statusBar.className = 'status-bar';
      document.body.appendChild(statusBar);
    }
    this.updateStatusBar('Ready');
  }

  updateStatusBar(message) {
    const statusBar = document.getElementById('statusBar');
    if (statusBar) {
      statusBar.textContent = message;
    }
  }

  async encode() {
    const editor = this.ui.getMonacoEditor('input');
    const outputEditor = this.ui.getMonacoEditor('output');
    const encodingSelect = document.getElementById('encodingSelect');
    
    if (!editor || !outputEditor) return;

    const input = editor.getValue();
    const encoding = encodingSelect?.value || 'base64';

    if (!input) {
      this.ui.showError('Please enter text to encode');
      return;
    }

    try {
      this.ui.showLoading(true);
      this.updateStatusBar('Encoding...');
      
      const output = this.converter.encode(input, encoding);
      outputEditor.setValue(output);
      
      this.history.addEntry('encode', input, output, encoding, {
        inputSize: input.length,
        outputSize: output.length
      });
      
      this.ui.showSuccess('Encoded successfully');
      this.updateStatusBar(`Encoded ${input.length} bytes to ${output.length} characters`);
      this.ui.updateStats();
    } catch (error) {
      this.ui.showError(error.message);
      this.updateStatusBar('Error: ' + error.message);
      outputEditor.setValue('');
    } finally {
      this.ui.showLoading(false);
    }
  }

  async decode() {
    const editor = this.ui.getMonacoEditor('input');
    const outputEditor = this.ui.getMonacoEditor('output');
    const encodingSelect = document.getElementById('encodingSelect');
    
    if (!editor || !outputEditor) return;

    const input = editor.getValue();
    const encoding = encodingSelect?.value || 'base64';

    if (!input) {
      this.ui.showError('Please enter text to decode');
      return;
    }

    try {
      this.ui.showLoading(true);
      
      const output = this.converter.decode(input, encoding);
      outputEditor.setValue(output);

      // Auto-format JSON before saving to history so the record matches what the user sees
      let finalOutput = output;
      try {
        const json = JSON.parse(output);
        finalOutput = JSON.stringify(json, null, 2);
        outputEditor.setValue(finalOutput);
        monaco.editor.setModelLanguage(outputEditor.getModel(), 'json');
      } catch {
        monaco.editor.setModelLanguage(outputEditor.getModel(), 'plaintext');
      }

      this.history.addEntry('decode', input, finalOutput, encoding, {
        inputSize: input.length,
        outputSize: finalOutput.length
      });
      
      this.ui.showSuccess('Decoded successfully');
      this.updateStatusBar(`Decoded ${input.length} characters to ${finalOutput.length} characters`);
      this.ui.updateStats();
    } catch (error) {
      this.ui.showError(error.message);
      this.updateStatusBar('Error: ' + error.message);
      outputEditor.setValue('');
    } finally {
      this.ui.showLoading(false);
    }
  }

  clearInput() {
    const editor = this.ui.getMonacoEditor('input');
    if (editor) {
      editor.setValue('');
      this.ui.showSuccess('Input cleared');
    }
  }

  clearOutput() {
    const editor = this.ui.getMonacoEditor('output');
    if (editor) {
      editor.setValue('');
      this.ui.showSuccess('Output cleared');
    }
  }

  async copyInput() {
    const editor = this.ui.getMonacoEditor('input');
    if (editor) {
      const text = editor.getValue();
      await navigator.clipboard.writeText(text);
      this.ui.showSuccess('Input copied to clipboard');
    }
  }

  async copyOutput() {
    const editor = this.ui.getMonacoEditor('output');
    if (editor) {
      const text = editor.getValue();
      await navigator.clipboard.writeText(text);
      this.ui.showSuccess('Output copied to clipboard');
    }
  }

  async loadFile() {
    try {
      const filePath = await window.electronAPI.selectFile();
      if (!filePath) return;

      this.ui.showLoading(true);
      const result = await window.electronAPI.readFile(filePath);

      if (result.success) {
        const FILE_SIZE_WARNING = 10 * 1024 * 1024; // 10MB
        if (result.size > FILE_SIZE_WARNING) {
          const proceed = confirm(`Large file (${this.ui.formatBytes(result.size)}). Proceed?`);
          if (!proceed) {
            this.ui.showLoading(false);
            return;
          }
        }
        
        const editor = this.ui.getMonacoEditor('input');
        // Decode base64 properly to handle multi-byte UTF-8 characters
        const binaryString = atob(result.buffer);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const decoded = new TextDecoder('utf-8').decode(bytes);
        editor.setValue(decoded);
        this.ui.showSuccess(`Loaded: ${result.name}`);
      } else {
        this.ui.showError('Failed to load file: ' + result.error);
      }
    } catch (error) {
      this.ui.showError('Error loading file: ' + error.message);
    } finally {
      this.ui.showLoading(false);
    }
  }

  async saveOutput() {
    const editor = this.ui.getMonacoEditor('output');
    if (!editor) return;
    const content = editor.getValue();
    if (!content) {
      this.ui.showError('No output to save');
      return;
    }
    try {
      const result = await window.electronAPI.saveFile(content, 'output.txt');
      if (result.success) this.ui.showSuccess('File saved successfully');
      else this.ui.showError('Failed to save file');
    } catch (error) {
      this.ui.showError('Error saving file: ' + error.message);
    }
  }

  async optimizeImage() {
    try {
      const filePath = await window.electronAPI.selectFile();
      if (!filePath) return;
      
      const width = parseInt(document.getElementById('imgWidth')?.value || 0);
      const height = parseInt(document.getElementById('imgHeight')?.value || 0);
      const format = document.getElementById('imgFormat')?.value || 'webp';
      const quality = parseInt(document.getElementById('imgQuality')?.value || 80);

      this.ui.showLoading(true);
      const result = await window.electronAPI.optimizeImage(filePath, { width, height, format, quality });

      if (result.success) {
        const defaultName = `optimized.${result.format}`;
        const saved = await window.electronAPI.saveImage(result.buffer, defaultName, result.format);
        if (saved.success) {
          this.ui.showSuccess(`Saved: ${saved.path} (${this.ui.formatBytes(result.size)}, ${result.width}×${result.height})`);
        } else if (saved.error !== 'Save cancelled') {
          this.ui.showError('Optimized but failed to save: ' + saved.error);
        }
        // else: user cancelled the save dialog — silent
      } else {
        this.ui.showError('Optimization failed: ' + result.error);
      }
    } catch (error) {
      this.ui.showError('Error: ' + error.message);
    } finally {
      this.ui.showLoading(false);
    }
  }

  async startServer() {
    const port = parseInt(document.getElementById('serverPort')?.value || 3000);
    try {
      this.ui.showLoading(true);
      const result = await window.electronAPI.startAPIServer(port);
      if (result.success) {
        this.serverRunning = true;
        this.updateServerUI(true, result.port, result.apiKey);
        this.ui.showSuccess(result.message);
      } else {
        this.ui.showError(result.error);
      }
    } catch (error) {
      this.ui.showError('Error starting server: ' + error.message);
    } finally {
      this.ui.showLoading(false);
    }
  }

  async stopServer() {
    try {
      this.ui.showLoading(true);
      const result = await window.electronAPI.stopAPIServer();
      if (result.success) {
        this.serverRunning = false;
        this.updateServerUI(false);
        this.ui.showSuccess(result.message);
      } else {
        this.ui.showError(result.error);
      }
    } catch (error) {
      this.ui.showError('Error stopping server: ' + error.message);
    } finally {
      this.ui.showLoading(false);
    }
  }

  async checkServerStatus() {
    try {
      const status = await window.electronAPI.getServerStatus();
      this.serverRunning = status.running;
      this.updateServerUI(status.running, status.port);
    } catch (error) {
      console.error('Failed to check server status:', error);
    }
  }

  updateServerUI(running, port = 3000, apiKey = null) {
    const statusEl = document.getElementById('serverStatus');
    const startBtn = document.getElementById('startServer');
    const stopBtn = document.getElementById('stopServer');

    if (statusEl) {
      if (running && apiKey) {
        statusEl.innerHTML = `
          <div class="status-badge running">Running on port ${port}</div>
          <div class="api-key-box">
            <strong class="api-key-label">API Key:</strong>
            <div class="api-key-row">
              <code id="apiKeyDisplay" class="api-key-code"></code>
              <button id="copyApiKeyBtn" class="btn-small">Copy</button>
            </div>
            <small class="api-key-hint">Include this in the "X-API-Key" header</small>
          </div>
        `;
        // Set text content safely to avoid XSS
        document.getElementById('apiKeyDisplay').textContent = apiKey;
        document.getElementById('copyApiKeyBtn').addEventListener('click', () => {
          navigator.clipboard.writeText(apiKey);
          this.ui.showSuccess('API key copied');
        });
      } else {
        statusEl.textContent = running ? `Running on port ${port}` : 'Not running';
        statusEl.className = `server-status ${running ? 'running' : 'stopped'}`;
      }
    }
    if (startBtn) startBtn.disabled = running;
    if (stopBtn) stopBtn.disabled = !running;
    const rotateBtn = document.getElementById('rotateKeyBtn');
    if (rotateBtn) rotateBtn.disabled = !running;
  }

  async rotateKey() {
    if (!window.electronAPI?.rotateAPIKey) return;
    try {
      const result = await window.electronAPI.rotateAPIKey();
      if (result.success) {
        // Update the displayed key in-place
        const display = document.getElementById('apiKeyDisplay');
        if (display) display.textContent = result.apiKey;
        this.ui.showSuccess('API key rotated');
      } else {
        this.ui.showError(result.error || 'Failed to rotate key');
      }
    } catch (error) {
      this.ui.showError(error.message);
    }
  }

  exportAsCSharp() {
    this.exportBytes(b => `0x${b.toString(16).padStart(2, '0')}`, "byte[] data = new byte[] { ", " };", "C#");
  }

  exportAsJava() {
    this.exportBytes(b => `(byte)0x${b.toString(16).padStart(2, '0')}`, "byte[] data = new byte[] { ", " };", "Java");
  }

  exportAsPython() {
    const editor = this.ui.getMonacoEditor('output');
    if (!editor) return;
    const output = editor.getValue();
    // Escape backslashes first, then single quotes, then other control characters
    const escaped = output
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/\r/g, '\\r')
      .replace(/\n/g, '\\n')
      .replace(/\t/g, '\\t');
    const code = `data = b'${escaped}'`;
    navigator.clipboard.writeText(code);
    this.ui.showSuccess('Exported as Python bytes');
  }

  exportBytes(mapFn, prefix, suffix, lang) {
    const editor = this.ui.getMonacoEditor('output');
    if (!editor) return;
    const output = editor.getValue();
    if (!output) {
      this.ui.showError('No output to export');
      return;
    }
    const bytes = Array.from(new TextEncoder().encode(output)).map(mapFn).join(', ');
    const code = `${prefix}${bytes}${suffix}`;
    navigator.clipboard.writeText(code);
    this.ui.showSuccess(`Exported as ${lang} byte array`);
  }

  clearHistory() {
    if (this.ui.confirmAction('Clear all conversion history?')) {
      this.history.clearHistory();
      this.ui.showSuccess('History cleared');
    }
  }

  exportHistory() {
    this.history.exportHistory();
    this.ui.showSuccess('History exported');
  }

  toggleTheme() {
    const body = document.body;
    const currentTheme = body.getAttribute('data-theme');
    
    if (currentTheme === 'light') {
      body.removeAttribute('data-theme');
      localStorage.setItem('theme', 'dark');
      this.updateMonacoTheme('vs-dark');
    } else {
      body.setAttribute('data-theme', 'light');
      localStorage.setItem('theme', 'light');
      this.updateMonacoTheme('vs');
    }
  }

  updateMonacoTheme(theme) {
    // setTheme is global — call once, not once per editor
    monaco.editor.setTheme(theme);
  }

  restoreFromHistory(entry) {
    const inputEditor = this.ui.getMonacoEditor('input');
    const outputEditor = this.ui.getMonacoEditor('output');
    
    if (inputEditor && outputEditor) {
      inputEditor.setValue(entry.input);
      outputEditor.setValue(entry.output);
      const encodingSelect = document.getElementById('encodingSelect');
      if (encodingSelect) encodingSelect.value = entry.encoding;
      this.ui.showSuccess('Restored from history');
      this.ui.switchTab('encoder');
    }
  }
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Initialize app when DOM is ready
let app;
window.addEventListener('DOMContentLoaded', async () => {
  app = new App();
  window.app = app;
  window.ui = app.ui;
  await app.init();
  
  // Password Hash Tab Handlers
  initPasswordHashHandlers();
});

// Password Hash Tab Handlers
function initPasswordHashHandlers() {
  const passwordAlgorithm = document.getElementById('passwordAlgorithm');
  const bcryptRoundsGroup = document.getElementById('bcryptRoundsGroup');
  const argon2OptionsGroup = document.getElementById('argon2OptionsGroup');
  const argon2TimeGroup = document.getElementById('argon2TimeGroup');
  const pbkdf2Group = document.getElementById('pbkdf2IterationsGroup');
  
  if (passwordAlgorithm) {
    passwordAlgorithm.addEventListener('change', () => {
      const algorithm = passwordAlgorithm.value;
      
      bcryptRoundsGroup.style.display = algorithm === 'bcrypt' ? 'block' : 'none';
      argon2OptionsGroup.style.display = algorithm === 'argon2' ? 'block' : 'none';
      argon2TimeGroup.style.display = algorithm === 'argon2' ? 'block' : 'none';
      pbkdf2Group.style.display = algorithm === 'pbkdf2' ? 'block' : 'none';
    });
    passwordAlgorithm.dispatchEvent(new Event('change'));
  }
  
  const hashPasswordBtn = document.getElementById('hashPasswordBtn');
  if (hashPasswordBtn) {
    hashPasswordBtn.addEventListener('click', async () => {
      const password = document.getElementById('passwordInput').value;
      const algorithm = document.getElementById('passwordAlgorithm').value;
      const resultDiv = document.getElementById('passwordHashResult');
      
      if (!password) {
        resultDiv.innerHTML = '<div class="error">Please enter a password</div>';
        return;
      }
      
      hashPasswordBtn.disabled = true;
      try {
        let result;
        if (algorithm === 'bcrypt') {
          const rounds = parseInt(document.getElementById('bcryptRounds').value) || 10;
          result = await window.electronAPI.hashPasswordBcrypt(password, rounds);
        } else if (algorithm === 'argon2') {
          const memoryCost = parseInt(document.getElementById('argon2Memory').value) || 65536;
          const timeCost = parseInt(document.getElementById('argon2Time').value) || 3;
          result = await window.electronAPI.hashPasswordArgon2(password, { memoryCost, timeCost });
        } else if (algorithm === 'pbkdf2') {
          const iterations = parseInt(document.getElementById('pbkdf2Iterations').value) || 100000;
          result = await window.electronAPI.hashPasswordPBKDF2(password, iterations);
        }
        
        if (result.success) {
          resultDiv.innerHTML = `
            <div class="success">
              <h3>Password Hashed</h3>
              <p><strong>Algorithm:</strong> ${escapeHtml(result.algorithm)}</p>
              <textarea id="hashResultText" readonly rows="3" class="hash-result-textarea"></textarea>
              <button id="copyHashBtn" class="btn-small">Copy</button>
            </div>`;
          // Set hash value safely to avoid XSS with special characters
          document.getElementById('hashResultText').value = result.hash;
          document.getElementById('copyHashBtn').addEventListener('click', () => {
            navigator.clipboard.writeText(result.hash);
            window.ui.showSuccess('Copied');
          });
        } else {
          resultDiv.innerHTML = `<div class="error">Error: ${escapeHtml(result.error)}</div>`;
        }
      } catch (error) {
        resultDiv.innerHTML = `<div class="error">Error: ${escapeHtml(error.message)}</div>`;
      } finally {
        hashPasswordBtn.disabled = false;
      }
    });
  }

  const verifyPasswordBtn = document.getElementById('verifyPasswordBtn');
  if (verifyPasswordBtn) {
    verifyPasswordBtn.addEventListener('click', async () => {
      const password = document.getElementById('verifyPasswordInput').value;
      const hash = document.getElementById('verifyHashInput').value.trim();
      const resultDiv = document.getElementById('passwordVerifyResult');
      
      if (!password || !hash) {
        resultDiv.innerHTML = '<div class="error">Enter both password and hash</div>';
        return;
      }
      
      verifyPasswordBtn.disabled = true;
      try {
        let result;
        if (hash.startsWith('$2')) result = await window.electronAPI.verifyPasswordBcrypt(password, hash);
        else if (hash.startsWith('$argon2')) result = await window.electronAPI.verifyPasswordArgon2(password, hash);
        else if (hash.startsWith('$pbkdf2')) result = await window.electronAPI.verifyPasswordPBKDF2(password, hash);
        else throw new Error('Unknown hash format');
        
        if (result.success && result.match) {
          resultDiv.innerHTML = '<div class="success"><h3>✓ Verified</h3><p>Password matches!</p></div>';
        } else {
          resultDiv.innerHTML = '<div class="error"><h3>✗ Failed</h3><p>Password incorrect</p></div>';
        }
      } catch (error) {
        resultDiv.innerHTML = `<div class="error">Error: ${escapeHtml(error.message)}</div>`;
      } finally {
        verifyPasswordBtn.disabled = false;
      }
    });
  }
}
