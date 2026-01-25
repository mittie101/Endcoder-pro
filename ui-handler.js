// ui-handler.js - UI management and interactions
class UIHandler {
  constructor() {
    this.currentTab = 'encoder';
    this.monacoEditors = {
      input: null,
      output: null,
      jwtPayload: null,
      diffLeft: null,
      diffRight: null
    };
    this.isDarkMode = true;
  }

  init() {
    this.setupTabSwitching();
    this.setupThemeToggle();
    this.setupResizablePanes();
    this.updateStats();
  }

  setupTabSwitching() {
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        this.switchTab(e.target.dataset.tab);
      });
    });
  }

  switchTab(tabName) {
    this.currentTab = tabName;
    
    // Update tab buttons
    document.querySelectorAll('.tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    // Update content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.toggle('active', content.id === `${tabName}-tab`);
    });

    // Refresh Monaco editors when switching tabs
    setTimeout(() => {
      Object.values(this.monacoEditors).forEach(editor => {
        if (editor) editor.layout();
      });
    }, 100);
  }

  setupThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        this.isDarkMode = !this.isDarkMode;
        document.body.classList.toggle('light-theme', !this.isDarkMode);
        this.updateMonacoTheme();
      });
    }
  }

  updateMonacoTheme() {
    const theme = this.isDarkMode ? 'vs-dark' : 'vs-light';
    monaco.editor.setTheme(theme);
  }

  setupResizablePanes() {
    const resizer = document.querySelector('.resizer');
    if (!resizer) return;

    let isResizing = false;
    let startX = 0;
    let startWidth = 0;

    resizer.addEventListener('mousedown', (e) => {
      isResizing = true;
      startX = e.clientX;
      const leftPane = resizer.previousElementSibling;
      startWidth = leftPane.offsetWidth;
      document.body.style.cursor = 'col-resize';
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isResizing) return;

      const leftPane = resizer.previousElementSibling;
      const container = leftPane.parentElement;
      const containerWidth = container.offsetWidth;
      const deltaX = e.clientX - startX;
      const newWidth = startWidth + deltaX;
      const percentage = (newWidth / containerWidth) * 100;

      if (percentage > 20 && percentage < 80) {
        leftPane.style.flex = `0 0 ${percentage}%`;
      }
    });

    document.addEventListener('mouseup', () => {
      if (isResizing) {
        isResizing = false;
        document.body.style.cursor = 'default';
        
        // Refresh Monaco editors after resize
        setTimeout(() => {
          Object.values(this.monacoEditors).forEach(editor => {
            if (editor) editor.layout();
          });
        }, 100);
      }
    });
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    const container = document.getElementById('notificationContainer') || document.body;
    container.appendChild(notification);

    setTimeout(() => {
      notification.classList.add('show');
    }, 10);

    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  updateStats() {
    const updateInputStats = () => {
      const editor = this.monacoEditors.input;
      if (!editor) return;

      const content = editor.getValue();
      const stats = {
        chars: content.length,
        lines: editor.getModel().getLineCount(),
        words: content.trim() ? content.trim().split(/\s+/).length : 0,
        bytes: new TextEncoder().encode(content).length
      };

      // Toggle empty state
      const emptyState = document.getElementById('inputEmptyState');
      if (emptyState) {
        emptyState.classList.toggle('hidden', content.length > 0);
      }

      const statsEl = document.getElementById('inputStats');
      if (statsEl) {
        statsEl.innerHTML = `
          <span>Characters: ${stats.chars.toLocaleString()}</span>
          <span>Lines: ${stats.lines.toLocaleString()}</span>
          <span>Words: ${stats.words.toLocaleString()}</span>
          <span>Bytes: ${stats.bytes.toLocaleString()}</span>
        `;
      }
    };

    const updateOutputStats = () => {
      const editor = this.monacoEditors.output;
      if (!editor) return;

      const content = editor.getValue();
      const stats = {
        chars: content.length,
        bytes: new TextEncoder().encode(content).length
      };

      // Toggle empty state
      const emptyState = document.getElementById('outputEmptyState');
      if (emptyState) {
        emptyState.classList.toggle('hidden', content.length > 0);
      }

      const statsEl = document.getElementById('outputStats');
      if (statsEl) {
        statsEl.innerHTML = `
          <span>Characters: ${stats.chars.toLocaleString()}</span>
          <span>Bytes: ${stats.bytes.toLocaleString()}</span>
        `;
      }
    };

    // Setup listeners
    if (this.monacoEditors.input) {
      this.monacoEditors.input.onDidChangeModelContent(updateInputStats);
      updateInputStats();
    }

    if (this.monacoEditors.output) {
      this.monacoEditors.output.onDidChangeModelContent(updateOutputStats);
      updateOutputStats();
    }
  }

  showLoading(show = true) {
    const loader = document.getElementById('loader');
    if (loader) {
      loader.style.display = show ? 'flex' : 'none';
    }
  }

  showError(message) {
    this.showNotification(message, 'error');
  }

  showSuccess(message) {
    this.showNotification(message, 'success');
  }

  confirmAction(message) {
    return confirm(message);
  }

  async promptInput(message, defaultValue = '') {
    return prompt(message, defaultValue);
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatNumber(num) {
    return num.toLocaleString();
  }

  setMonacoEditor(name, editor) {
    this.monacoEditors[name] = editor;
  }

  getMonacoEditor(name) {
    return this.monacoEditors[name];
  }
}
