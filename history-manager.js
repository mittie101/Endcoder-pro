// history-manager.js - Conversion history management
/* exported HistoryManager */
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
        const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
        const cutoff = Date.now() - TTL_MS;
        this.history = JSON.parse(stored).filter(
          e => new Date(e.timestamp).getTime() > cutoff
        );
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
    const truncated = input.length > 1000 || output.length > 1000;
    const entry = {
      id: `${Date.now()}-${Math.floor(Math.random() * 1e9)}`,
      timestamp: new Date().toISOString(),
      type: type, // 'encode' or 'decode'
      input: input.substring(0, 1000), // Store first 1000 chars
      output: output.substring(0, 1000),
      encoding: encoding,
      inputSize: input.length,
      outputSize: output.length,
      truncated,
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

    // Render lightweight placeholders first — IntersectionObserver hydrates each item
    // only when it scrolls into view, keeping initial render fast for large histories.
    container.innerHTML = this.history.map(entry =>
      `<div class="history-item history-item--pending" data-id="${entry.id}"></div>`
    ).join('');

    // Use event delegation — single listener handles all restore/delete clicks
    container.onclick = (e) => {
      const restoreBtn = e.target.closest('.history-restore');
      const deleteBtn = e.target.closest('.history-delete');
      if (restoreBtn) {
        const id = restoreBtn.dataset.id;
        const restored = this.restoreEntry(id);
        if (restored && window.app) window.app.restoreFromHistory(restored);
      } else if (deleteBtn) {
        const id = deleteBtn.dataset.id;
        if (confirm('Delete this history entry?')) this.deleteEntry(id);
      }
    };

    if (typeof IntersectionObserver === 'undefined') {
      // Fallback: batch-render using requestAnimationFrame to avoid blocking the main thread
      const pending = Array.from(container.querySelectorAll('.history-item--pending'));
      const hydrateBatch = (items, i = 0) => {
        if (i >= items.length) return;
        const entry = this.history.find(e => e.id === items[i].dataset.id);
        if (entry) this._hydrateItem(items[i], entry);
        requestAnimationFrame(() => hydrateBatch(items, i + 1));
      };
      hydrateBatch(pending);
      return;
    }

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(({ target, isIntersecting }) => {
        if (!isIntersecting) return;
        const entry = this.history.find(e => e.id === target.dataset.id);
        if (entry) this._hydrateItem(target, entry);
        obs.unobserve(target);
      });
    }, { rootMargin: '200px' }); // pre-load 200 px before entering viewport

    container.querySelectorAll('.history-item--pending').forEach(el => observer.observe(el));
  }

  _hydrateItem(el, entry) {
    el.classList.remove('history-item--pending');
    const safeType = escapeHtml(entry.type || '');
    const safeEncoding = escapeHtml(entry.encoding || '');
    // Strip everything except word chars and hyphens for use in class attributes
    const typeClass = (entry.type || '').replace(/[^\w-]/g, '');
    el.innerHTML = `
      <div class="history-header">
        <span class="history-type ${typeClass}">${safeType.toUpperCase()}</span>
        <span class="history-encoding">${safeEncoding}</span>
        <span class="history-time">${this.formatTimestamp(entry.timestamp)}</span>
      </div>
      <div class="history-preview">
        <div class="preview-input">${escapeHtml(entry.input.substring(0, 50))}${entry.input.length > 50 ? '...' : ''}</div>
        <div class="preview-arrow">→</div>
        <div class="preview-output">${escapeHtml(entry.output.substring(0, 50))}${entry.output.length > 50 ? '...' : ''}</div>
      </div>
      <div class="history-actions">
        <button class="history-restore" data-id="${entry.id}">Restore</button>
        <button class="history-delete" data-id="${entry.id}">Delete</button>
      </div>
    `;
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
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
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
