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
        default:
          throw new Error('Unknown encoding: ' + encoding);
      }
    } catch (error) {
      throw new Error(`Decoding failed (${encoding}): ${error.message}`);
    }
  }

  detectEncoding(input) {
    const patterns = {
      base64: /^[A-Za-z0-9+/]+=*$/,
      base64url: /^[A-Za-z0-9_-]+$/,
      base32: /^[A-Z2-7]+=*$/,
      hex: /^[0-9a-fA-F]+$/,
      binary: /^[01]+$/,
      percent: /%[0-9A-Fa-f]{2}/
    };

    for (const [encoding, pattern] of Object.entries(patterns)) {
      if (pattern.test(input.trim())) {
        return encoding;
      }
    }

    return 'unknown';
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
