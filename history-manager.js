// history-manager.js - Conversion history management
class HistoryManager {
  constructor() {
    this.history = [];
    this.maxHistory = 50;
    this.loadHistory();
  }

  loadHistory() {
    try {
      const stored = localStorage.getItem('conversionHistory');
      if (stored) {
        this.history = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load history:', error);
      this.history = [];
    }
  }

  saveHistory() {
    try {
      localStorage.setItem('conversionHistory', JSON.stringify(this.history));
    } catch (error) {
      console.error('Failed to save history:', error);
    }
  }

  addEntry(type, input, output, encoding, metadata = {}) {
    const entry = {
      id: `${Date.now()}-${Math.floor(Math.random() * 1e9)}`,
      timestamp: new Date().toISOString(),
      type: type, // 'encode' or 'decode'
      input: input.substring(0, 1000), // Store first 1000 chars
      output: output.substring(0, 1000),
      encoding: encoding,
      inputSize: input.length,
      outputSize: output.length,
      metadata: metadata
    };

    this.history.unshift(entry);

    // Limit history size
    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(0, this.maxHistory);
    }

    this.saveHistory();
    this.updateHistoryUI();
  }

  getHistory() {
    return this.history;
  }

  clearHistory() {
    this.history = [];
    this.saveHistory();
    this.updateHistoryUI();
  }

  deleteEntry(id) {
    this.history = this.history.filter(entry => entry.id !== id);
    this.saveHistory();
    this.updateHistoryUI();
  }

  restoreEntry(id) {
    const entry = this.history.find(e => e.id === id);
    if (entry) {
      return entry;
    }
    return null;
  }

  updateHistoryUI() {
    const container = document.getElementById('historyList');
    if (!container) return;

    if (this.history.length === 0) {
      container.innerHTML = '<div class="history-empty">No conversion history yet</div>';
      return;
    }

    container.innerHTML = this.history.map(entry => `
      <div class="history-item" data-id="${entry.id}">
        <div class="history-header">
          <span class="history-type ${entry.type}">${entry.type.toUpperCase()}</span>
          <span class="history-encoding">${entry.encoding}</span>
          <span class="history-time">${this.formatTimestamp(entry.timestamp)}</span>
        </div>
        <div class="history-preview">
          <div class="preview-input">${this.escapeHtml(entry.input.substring(0, 50))}${entry.input.length > 50 ? '...' : ''}</div>
          <div class="preview-arrow">→</div>
          <div class="preview-output">${this.escapeHtml(entry.output.substring(0, 50))}${entry.output.length > 50 ? '...' : ''}</div>
        </div>
        <div class="history-actions">
          <button class="history-restore" data-id="${entry.id}">Restore</button>
          <button class="history-delete" data-id="${entry.id}">Delete</button>
        </div>
      </div>
    `).join('');

    // Attach event listeners
    container.querySelectorAll('.history-restore').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.dataset.id;
        const entry = this.restoreEntry(id);
        if (entry && window.app) {
          window.app.restoreFromHistory(entry);
        }
      });
    });

    container.querySelectorAll('.history-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.dataset.id;
        if (confirm('Delete this history entry?')) {
          this.deleteEntry(id);
        }
      });
    });
  }

  formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;

    return date.toLocaleDateString();
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  exportHistory() {
    const dataStr = JSON.stringify(this.history, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `endcoder-pro-history-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Defer revocation so the browser has time to start the download
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }

  importHistory(jsonData) {
    try {
      const imported = JSON.parse(jsonData);
      if (Array.isArray(imported)) {
        this.history = [...imported, ...this.history].slice(0, this.maxHistory);
        this.saveHistory();
        this.updateHistoryUI();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to import history:', error);
      return false;
    }
  }
}
