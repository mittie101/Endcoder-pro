// converter.js - Core conversion logic
class Converter {
  constructor() {
    this.encodings = window.Encodings;
  }

  encode(input, encoding) {
    try {
      switch (encoding) {
        case 'base64':
          return this.encodings.encodeBase64(input);
        case 'base64url':
          return this.encodings.encodeBase64URL(input);
        case 'base32':
          return this.encodings.encodeBase32(input);
        case 'base32hex':
          return this.encodings.encodeBase32Hex(input);
        case 'hex':
          return this.encodings.encodeHex(input);
        case 'binary':
          return this.encodings.encodeBinary(input);
        case 'ascii85':
          return this.encodings.encodeAscii85(input);
        case 'base58':
          return this.encodings.encodeBase58(input);
        case 'uuencode':
          return this.encodings.encodeUUEncode(input);
        case 'quoted-printable':
          return this.encodings.encodeQuotedPrintable(input);
        case 'percent':
          return this.encodings.encodePercent(input);
        case 'rot13':
          return this.encodings.encodeROT13(input);
        case 'caesar':
          return this.encodings.encodeCaesar(input);
        case 'atbash':
          return this.encodings.encodeAtbash(input);
        case 'html-entities':
          return this.encodings.encodeHTMLEntities(input);
        case 'morse':
          return this.encodings.encodeMorse(input);
        default:
          throw new Error('Unknown encoding: ' + encoding);
      }
    } catch (error) {
      throw new Error(`Encoding failed: ${error.message}`);
    }
  }

  decode(input, encoding) {
    try {
      // Trim whitespace
      input = input.trim();
      
      if (!input) {
        throw new Error('Input cannot be empty');
      }
      
      switch (encoding) {
        case 'base64':
          return this.encodings.decodeBase64(input);
        case 'base64url':
          return this.encodings.decodeBase64URL(input);
        case 'base32':
          return this.encodings.decodeBase32(input);
        case 'base32hex':
          return this.encodings.decodeBase32Hex(input);
        case 'hex':
          return this.encodings.decodeHex(input);
        case 'binary':
          return this.encodings.decodeBinary(input);
        case 'ascii85':
          return this.encodings.decodeAscii85(input);
        case 'base58':
          return this.encodings.decodeBase58(input);
        case 'uuencode':
          return this.encodings.decodeUUEncode(input);
        case 'quoted-printable':
          return this.encodings.decodeQuotedPrintable(input);
        case 'percent':
          return this.encodings.decodePercent(input);
        case 'rot13':
          return this.encodings.decodeROT13(input);
        case 'caesar':
          return this.encodings.decodeCaesar(input);
        case 'atbash':
          return this.encodings.decodeAtbash(input);
        case 'html-entities':
          return this.encodings.decodeHTMLEntities(input);
        case 'morse':
          return this.encodings.decodeMorse(input);
        default:
          throw new Error('Unknown encoding: ' + encoding);
      }
    } catch (error) {
      throw new Error(`Decoding failed (${encoding}): ${error.message}`);
    }
  }

  detectEncoding(input) {
    input = input.trim();
    if (!input) return 'unknown';

    const scores = {};

    // Binary: only 0s and 1s, typically space-separated bytes
    if (/^[01\s]+$/.test(input)) {
      const cleaned = input.replace(/\s/g, '');
      if (cleaned.length % 8 === 0 && cleaned.length > 0) {
        scores.binary = 95;
      } else if (/^[01]+$/.test(cleaned)) {
        scores.binary = 70;
      }
    }

    // Hex: only hex chars, even length
    if (/^[0-9a-fA-F\s]+$/.test(input)) {
      const cleaned = input.replace(/\s/g, '');
      if (cleaned.length % 2 === 0 && cleaned.length > 0) {
        // Higher score if it contains a-f (not just digits)
        scores.hex = /[a-fA-F]/.test(cleaned) ? 85 : 60;
      }
    }

    // Base32: uppercase A-Z and 2-7, with optional = padding
    if (/^[A-Z2-7]+=*$/.test(input)) {
      scores.base32 = 70;
      if (input.endsWith('=')) scores.base32 += 15;
    }

    // Base64: standard charset with optional = padding
    if (/^[A-Za-z0-9+/]+=*$/.test(input)) {
      scores.base64 = 60;
      if (input.endsWith('=')) scores.base64 += 20;
      if (/[a-z]/.test(input) && /[A-Z]/.test(input)) scores.base64 += 10;
      if (/[+/]/.test(input)) scores.base64 += 10;
    }

    // Base64url: URL-safe variant with - and _
    if (/^[A-Za-z0-9_-]+$/.test(input)) {
      scores.base64url = 50;
      if (/[-_]/.test(input)) scores.base64url += 30;
    }

    // Percent encoding: has %XX sequences
    if (/%[0-9A-Fa-f]{2}/.test(input)) {
      const matches = input.match(/%[0-9A-Fa-f]{2}/g) || [];
      scores.percent = 60 + Math.min(matches.length * 5, 35);
    }

    // Ascii85: wrapped in <~ ~>
    if (input.startsWith('<~') && input.endsWith('~>')) {
      scores.ascii85 = 98;
    }

    // UUEncode: starts with "begin"
    if (input.startsWith('begin ')) {
      scores.uuencode = 98;
    }

    // Morse: dots, dashes, spaces, slashes
    if (/^[.\-/ ]+$/.test(input) && /[.\-]/.test(input)) {
      scores.morse = 90;
    }

    if (Object.keys(scores).length === 0) return 'unknown';

    // Return the encoding with highest score
    return Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
  }

  getEncodingInfo(encoding) {
    const info = {
      base64: { name: 'Base64', charset: 'A-Z, a-z, 0-9, +, /', padding: '=' },
      base64url: { name: 'Base64 URL', charset: 'A-Z, a-z, 0-9, -, _', padding: 'none' },
      base32: { name: 'Base32', charset: 'A-Z, 2-7', padding: '=' },
      base32hex: { name: 'Base32 Hex', charset: '0-9, A-V', padding: '=' },
      hex: { name: 'Hexadecimal', charset: '0-9, A-F', padding: 'none' },
      binary: { name: 'Binary', charset: '0, 1', padding: 'none' },
      ascii85: { name: 'ASCII85', charset: '! to u', padding: 'none' },
      base58: { name: 'Base58', charset: '1-9, A-Z, a-z (no 0, O, I, l)', padding: 'none' },
      uuencode: { name: 'UUEncode', charset: 'ASCII 32-95', padding: 'none' },
      'quoted-printable': { name: 'Quoted-Printable', charset: 'ASCII', padding: 'none' },
      percent: { name: 'Percent Encoding', charset: 'ASCII + %XX', padding: 'none' }
    };

    return info[encoding] || { name: 'Unknown', charset: '', padding: '' };
  }
}
