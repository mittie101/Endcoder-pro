// jwt-handler.js - JWT verification and manipulation
/* exported JWTHandler */
class JWTHandler {
  constructor(uiHandler) {
    this.ui = uiHandler;
  }

  init() {
    this.setupEventListeners();
  }

  setupEventListeners() {
    const verifyBtn = document.getElementById('verifyJWT');
    const signBtn = document.getElementById('signJWT');
    const decodeBtn = document.getElementById('decodeJWT');

    if (verifyBtn) {
      verifyBtn.addEventListener('click', () => this.verifyToken());
    }

    if (signBtn) {
      signBtn.addEventListener('click', () => this.signToken());
    }

    if (decodeBtn) {
      decodeBtn.addEventListener('click', () => this.decodeToken());
    }
  }

  escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  parseJWT(token) {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid JWT format');
      }

      const header = JSON.parse(atob(parts[0].replace(/-/g, '+').replace(/_/g, '/')));
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));

      return {
        header: header,
        payload: payload,
        signature: parts[2]
      };
    } catch (error) {
      throw new Error('Failed to parse JWT: ' + error.message);
    }
  }

  async verifyToken() {
    const tokenInput = document.getElementById('jwtTokenInput');
    const secretInput = document.getElementById('jwtSecretInput');
    const algorithmSelect = document.getElementById('jwtAlgorithm');
    const resultDiv = document.getElementById('jwtVerifyResult');

    if (!tokenInput || !secretInput || !resultDiv) return;

    const token = tokenInput.value.trim();
    const secret = secretInput.value.trim();
    const algorithm = algorithmSelect ? algorithmSelect.value : 'HS256';

    if (!token) {
      this.ui.showError('Please enter a JWT token');
      return;
    }

    if (!secret) {
      this.ui.showError('Please enter a secret key');
      return;
    }

    try {
      this.ui.showLoading(true);
      
      // First parse the token
      const parsed = this.parseJWT(token);
      
      // Then verify with backend
      const result = await window.electronAPI.verifyJWT(token, secret, algorithm);

      if (result.success) {
        resultDiv.innerHTML = `
          <div class="jwt-result ${result.valid ? 'valid' : 'invalid'}">
            <h3>${result.valid ? '✓ Token Valid' : '✗ Token Invalid'}</h3>
            <p>${this.escapeHtml(result.message)}</p>
            ${result.error ? `<p class="error-detail">${this.escapeHtml(result.error)}</p>` : ''}

            <div class="jwt-section">
              <h4>Header</h4>
              <pre>${this.escapeHtml(JSON.stringify(parsed.header, null, 2))}</pre>
            </div>

            <div class="jwt-section">
              <h4>Payload</h4>
              <pre>${this.escapeHtml(JSON.stringify(parsed.payload, null, 2))}</pre>
            </div>

            <div class="jwt-section">
              <h4>Signature</h4>
              <pre>${this.escapeHtml(parsed.signature)}</pre>
            </div>

            ${this.formatTokenInfo(parsed)}
          </div>
        `;

        this.ui.showSuccess(result.valid ? 'Token verified successfully' : 'Token signature verification failed');
      } else {
        resultDiv.innerHTML = `
          <div class="jwt-result invalid">
            <h3>✗ Verification Failed</h3>
            <p>${this.escapeHtml(result.error)}</p>
          </div>
        `;
        this.ui.showError('Token verification failed');
      }
    } catch (error) {
      resultDiv.innerHTML = `
        <div class="jwt-result invalid">
          <h3>✗ Error</h3>
          <p>${this.escapeHtml(error.message)}</p>
        </div>
      `;
      this.ui.showError(error.message);
    } finally {
      this.ui.showLoading(false);
    }
  }

  async signToken() {
    const payloadEditor = this.ui.getMonacoEditor('jwtPayload');
    const secretInput = document.getElementById('jwtSignSecret');
    const algorithmSelect = document.getElementById('jwtSignAlgorithm');
    const expiresInput = document.getElementById('jwtExpires');
    const outputDiv = document.getElementById('jwtSignOutput');

    if (!payloadEditor || !secretInput || !outputDiv) return;

    const payloadText = payloadEditor.getValue().trim();
    const secret = secretInput.value.trim();
    const algorithm = algorithmSelect ? algorithmSelect.value : 'HS256';
    const expiresIn = expiresInput ? expiresInput.value.trim() : null;

    if (!payloadText) {
      this.ui.showError('Please enter a payload');
      return;
    }

    if (!secret) {
      this.ui.showError('Please enter a secret key');
      return;
    }

    try {
      this.ui.showLoading(true);
      
      const payload = JSON.parse(payloadText);
      
      const result = await window.electronAPI.signJWT(payload, secret, algorithm, expiresIn || null);

      if (result.success) {
        outputDiv.innerHTML = `
          <div class="jwt-result valid">
            <h3>✓ Token Generated</h3>

            <div class="jwt-section">
              <h4>JWT Token</h4>
              <textarea readonly class="jwt-token-output" id="jwtSignedToken"></textarea>
              <button class="copy-btn" id="copySignedTokenBtn">Copy Token</button>
            </div>

            <div class="jwt-section">
              <h4>Header</h4>
              <pre>${this.escapeHtml(JSON.stringify(result.decoded.header, null, 2))}</pre>
            </div>

            <div class="jwt-section">
              <h4>Payload</h4>
              <pre>${this.escapeHtml(JSON.stringify(result.decoded.payload, null, 2))}</pre>
            </div>
          </div>
        `;

        // Set token value and attach listener safely (avoids inline onclick injection)
        document.getElementById('jwtSignedToken').value = result.token;
        document.getElementById('copySignedTokenBtn').addEventListener('click', () => {
          navigator.clipboard.writeText(result.token)
            .then(() => this.ui.showSuccess('Token copied to clipboard'));
        });

        this.ui.showSuccess('Token generated successfully');
      } else {
        outputDiv.innerHTML = `
          <div class="jwt-result invalid">
            <h3>✗ Generation Failed</h3>
            <p>${this.escapeHtml(result.error)}</p>
          </div>
        `;
        this.ui.showError('Token generation failed');
      }
    } catch (error) {
      outputDiv.innerHTML = `
        <div class="jwt-result invalid">
          <h3>✗ Error</h3>
          <p>${this.escapeHtml(error.message)}</p>
        </div>
      `;
      this.ui.showError(error.message);
    } finally {
      this.ui.showLoading(false);
    }
  }

  decodeToken() {
    const tokenInput = document.getElementById('jwtDecodeInput');
    const resultDiv = document.getElementById('jwtDecodeResult');

    if (!tokenInput || !resultDiv) return;

    const token = tokenInput.value.trim();

    if (!token) {
      this.ui.showError('Please enter a JWT token');
      return;
    }

    try {
      const parsed = this.parseJWT(token);

      resultDiv.innerHTML = `
        <div class="jwt-result">
          <h3>Token Decoded (No Verification)</h3>

          <div class="jwt-section">
            <h4>Header</h4>
            <pre>${this.escapeHtml(JSON.stringify(parsed.header, null, 2))}</pre>
          </div>

          <div class="jwt-section">
            <h4>Payload</h4>
            <pre>${this.escapeHtml(JSON.stringify(parsed.payload, null, 2))}</pre>
          </div>

          <div class="jwt-section">
            <h4>Signature</h4>
            <pre>${this.escapeHtml(parsed.signature)}</pre>
          </div>

          ${this.formatTokenInfo(parsed)}
        </div>
      `;

      this.ui.showSuccess('Token decoded successfully');
    } catch (error) {
      resultDiv.innerHTML = `
        <div class="jwt-result invalid">
          <h3>✗ Decode Failed</h3>
          <p>${this.escapeHtml(error.message)}</p>
        </div>
      `;
      this.ui.showError(error.message);
    }
  }

  formatTokenInfo(parsed) {
    let info = '<div class="jwt-info">';

    if (parsed.payload.iat) {
      const iat = new Date(parsed.payload.iat * 1000);
      info += `<p><strong>Issued At:</strong> ${iat.toLocaleString()}</p>`;
    }

    if (parsed.payload.exp) {
      const exp = new Date(parsed.payload.exp * 1000);
      const now = new Date();
      const isExpired = exp < now;
      info += `<p><strong>Expires:</strong> ${exp.toLocaleString()} ${isExpired ? '<span class="expired">(EXPIRED)</span>' : '<span class="valid">(Valid)</span>'}</p>`;
    }

    if (parsed.payload.nbf) {
      const nbf = new Date(parsed.payload.nbf * 1000);
      info += `<p><strong>Not Before:</strong> ${nbf.toLocaleString()}</p>`;
    }

    if (parsed.payload.iss) {
      info += `<p><strong>Issuer:</strong> ${this.escapeHtml(parsed.payload.iss)}</p>`;
    }

    if (parsed.payload.sub) {
      info += `<p><strong>Subject:</strong> ${this.escapeHtml(parsed.payload.sub)}</p>`;
    }

    if (parsed.payload.aud) {
      const aud = Array.isArray(parsed.payload.aud)
        ? parsed.payload.aud.map(a => this.escapeHtml(a)).join(', ')
        : this.escapeHtml(parsed.payload.aud);
      info += `<p><strong>Audience:</strong> ${aud}</p>`;
    }

    info += '</div>';
    return info;
  }
}
