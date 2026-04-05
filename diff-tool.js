// diff-tool.js - Comparison and diff functionality
/* exported DiffTool */
class DiffTool {
  constructor(uiHandler) {
    this.ui = uiHandler;
  }

  init() {
    this.setupEventListeners();
  }

  setupEventListeners() {
    const compareBtn = document.getElementById('compareDiff');
    if (compareBtn) {
      compareBtn.addEventListener('click', () => this.compare());
    }

    const swapBtn = document.getElementById('swapDiff');
    if (swapBtn) {
      swapBtn.addEventListener('click', () => this.swap());
    }
  }

  compare() {
    const leftEditor = this.ui.getMonacoEditor('diffLeft');
    const rightEditor = this.ui.getMonacoEditor('diffRight');
    const resultDiv = document.getElementById('diffResult');

    if (!leftEditor || !rightEditor || !resultDiv) return;

    const left = leftEditor.getValue();
    const right = rightEditor.getValue();

    if (!left || !right) {
      this.ui.showError('Please enter content in both fields');
      return;
    }

    try {
      // Character-level comparison
      const charDiff = this.computeCharDiff(left, right);
      
      // Line-level comparison
      const lineDiff = this.computeLineDiff(left, right);
      
      // Byte-level comparison
      const byteDiff = this.computeByteDiff(left, right);

      resultDiv.innerHTML = `
        <div class="diff-results">
          <div class="diff-summary">
            <h3>Comparison Summary</h3>
            <div class="diff-stats">
              <div class="stat-item">
                <span class="stat-label">Match Percentage:</span>
                <span class="stat-value">${charDiff.matchPercentage.toFixed(2)}%</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Character Differences:</span>
                <span class="stat-value">${charDiff.differences}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Byte Differences:</span>
                <span class="stat-value">${byteDiff.differences}</span>
              </div>
            </div>
          </div>

          <div class="diff-visualization">
            <h3>Character-Level Diff</h3>
            <div class="diff-display">
              <div class="diff-column">
                <h4>Left</h4>
                <pre>${this.highlightDiff(charDiff.leftHighlighted)}</pre>
              </div>
              <div class="diff-column">
                <h4>Right</h4>
                <pre>${this.highlightDiff(charDiff.rightHighlighted)}</pre>
              </div>
            </div>
          </div>

          <div class="diff-lines">
            <h3>Line-Level Diff</h3>
            <pre>${lineDiff.formatted}</pre>
          </div>

          ${byteDiff.hexDump ? `
            <div class="diff-bytes">
              <h3>Byte-Level Hex Dump</h3>
              <pre>${byteDiff.hexDump}</pre>
            </div>
          ` : ''}
        </div>
      `;

      resultDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
      this.ui.showSuccess('Comparison complete');
    } catch (error) {
      this.ui.showError('Comparison failed: ' + error.message);
    }
  }

  computeCharDiff(left, right) {
    let differences = 0;
    let matches = 0;
    const maxLen = Math.max(left.length, right.length);
    
    const leftHighlighted = [];
    const rightHighlighted = [];

    for (let i = 0; i < maxLen; i++) {
      const leftChar = i < left.length ? left[i] : '';
      const rightChar = i < right.length ? right[i] : '';

      if (leftChar === rightChar) {
        matches++;
        leftHighlighted.push({ char: leftChar, type: 'match' });
        rightHighlighted.push({ char: rightChar, type: 'match' });
      } else {
        differences++;
        leftHighlighted.push({ char: leftChar || '∅', type: 'diff' });
        rightHighlighted.push({ char: rightChar || '∅', type: 'diff' });
      }
    }

    const matchPercentage = maxLen > 0 ? (matches / maxLen) * 100 : 0;

    return {
      differences,
      matches,
      matchPercentage,
      leftHighlighted,
      rightHighlighted
    };
  }

  computeLineDiff(left, right) {
    const leftLines = left.split('\n');
    const rightLines = right.split('\n');
    
    let formatted = '';
    const maxLines = Math.max(leftLines.length, rightLines.length);

    for (let i = 0; i < maxLines; i++) {
      const leftLine = i < leftLines.length ? leftLines[i] : '';
      const rightLine = i < rightLines.length ? rightLines[i] : '';

      if (leftLine === rightLine) {
        formatted += `  ${i + 1}: ${this.escapeHtml(leftLine)}\n`;
      } else {
        if (leftLine) {
          formatted += `- ${i + 1}: ${this.escapeHtml(leftLine)}\n`;
        }
        if (rightLine) {
          formatted += `+ ${i + 1}: ${this.escapeHtml(rightLine)}\n`;
        }
      }
    }

    return { formatted };
  }

  computeByteDiff(left, right) {
    const leftBytes = new TextEncoder().encode(left);
    const rightBytes = new TextEncoder().encode(right);
    
    let differences = 0;
    const maxLen = Math.max(leftBytes.length, rightBytes.length);

    for (let i = 0; i < maxLen; i++) {
      const leftByte = i < leftBytes.length ? leftBytes[i] : 0;
      const rightByte = i < rightBytes.length ? rightBytes[i] : 0;
      
      if (leftByte !== rightByte) {
        differences++;
      }
    }

    // Generate hex dump for first 512 bytes if there are differences
    let hexDump = '';
    if (differences > 0 && maxLen > 0) {
      const dumpLen = Math.min(512, maxLen);
      hexDump = this.generateHexDump(leftBytes, rightBytes, dumpLen);
    }

    return {
      differences,
      hexDump
    };
  }

  generateHexDump(leftBytes, rightBytes, length) {
    let dump = 'Offset    Left              Right             Diff\n';
    dump += '-------   -------           -------           ----\n';

    for (let i = 0; i < length; i += 16) {
      const offset = i.toString(16).padStart(8, '0');
      
      let leftHex = '';
      let rightHex = '';
      let diff = '';

      for (let j = 0; j < 16 && (i + j) < length; j++) {
        const leftByte = i + j < leftBytes.length ? leftBytes[i + j] : 0;
        const rightByte = i + j < rightBytes.length ? rightBytes[i + j] : 0;
        
        leftHex += leftByte.toString(16).padStart(2, '0') + ' ';
        rightHex += rightByte.toString(16).padStart(2, '0') + ' ';
        diff += leftByte === rightByte ? '.. ' : '!! ';
      }

      dump += `${offset}  ${leftHex.padEnd(48)} ${rightHex.padEnd(48)} ${diff}\n`;
    }

    return dump;
  }

  highlightDiff(highlighted) {
    return highlighted.map(item => {
      const char = this.escapeHtml(item.char === '\n' ? '↵\n' : item.char);
      if (item.type === 'diff') {
        return `<span class="diff-highlight">${char}</span>`;
      }
      return char;
    }).join('');
  }

  swap() {
    const leftEditor = this.ui.getMonacoEditor('diffLeft');
    const rightEditor = this.ui.getMonacoEditor('diffRight');

    if (!leftEditor || !rightEditor) return;

    const leftValue = leftEditor.getValue();
    const rightValue = rightEditor.getValue();

    leftEditor.setValue(rightValue);
    rightEditor.setValue(leftValue);

    this.ui.showSuccess('Content swapped');
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
