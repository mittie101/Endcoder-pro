// ============================================================================
// Additional Encoding/Decoding Utilities
// Base32, Base58, Ascii85, ROT13, Caesar Cipher, HTML Entities
// ============================================================================

// ============================================================================
// Base64 Encoding/Decoding (Standard)
// ============================================================================

function encodeBase64(input) {
    if (typeof input !== 'string') throw new Error('Input must be a string');
    return btoa(unescape(encodeURIComponent(input)));
}

function decodeBase64(input) {
    try {
        // Remove whitespace and newlines
        input = input.replace(/\s/g, '');
        
        // Check if valid Base64
        if (!/^[A-Za-z0-9+/]*={0,2}$/.test(input)) {
            throw new Error('Invalid Base64 characters');
        }
        
        return decodeURIComponent(escape(atob(input)));
    } catch (e) {
        // Try alternative decode method
        try {
            const decoded = atob(input);
            // Try to decode as UTF-8
            const bytes = new Uint8Array(decoded.length);
            for (let i = 0; i < decoded.length; i++) {
                bytes[i] = decoded.charCodeAt(i);
            }
            return new TextDecoder('utf-8').decode(bytes);
        } catch (e2) {
            throw new Error('Invalid Base64 string: ' + e2.message);
        }
    }
}

// ============================================================================
// Base64 URL-Safe Encoding/Decoding
// ============================================================================

function encodeBase64URL(input) {
    return encodeBase64(input)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

function decodeBase64URL(input) {
    // Remove whitespace
    input = input.replace(/\s/g, '');
    
    // Convert back to standard Base64
    let base64 = input
        .replace(/-/g, '+')
        .replace(/_/g, '/');
    
    // Add padding
    while (base64.length % 4) {
        base64 += '=';
    }
    
    return decodeBase64(base64);
}

// ============================================================================
// Hexadecimal Encoding/Decoding
// ============================================================================

function encodeHex(input) {
    if (typeof input !== 'string') throw new Error('Input must be a string');
    const bytes = new TextEncoder().encode(input);
    return Array.from(bytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

function decodeHex(input) {
    // Remove whitespace and make lowercase
    input = input.replace(/\s/g, '').toLowerCase();
    
    if (input.length % 2 !== 0) {
        throw new Error('Invalid hex string length (must be even)');
    }
    
    // Check if valid hex
    if (!/^[0-9a-f]*$/.test(input)) {
        throw new Error('Invalid hex characters (only 0-9 and a-f allowed)');
    }
    
    const bytes = [];
    for (let i = 0; i < input.length; i += 2) {
        bytes.push(parseInt(input.substr(i, 2), 16));
    }
    
    try {
        return new TextDecoder('utf-8').decode(new Uint8Array(bytes));
    } catch (e) {
        throw new Error('Failed to decode hex to text: ' + e.message);
    }
}

// ============================================================================
// Base32 Encoding/Decoding
// ============================================================================

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function encodeBase32(input) {
    if (typeof input !== 'string') throw new Error('Input must be a string');
    const bytes = new TextEncoder().encode(input);
    let bits = 0;
    let value = 0;
    let output = '';

    for (let i = 0; i < bytes.length; i++) {
        value = (value << 8) | bytes[i];
        bits += 8;

        while (bits >= 5) {
            output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
            bits -= 5;
        }
    }

    if (bits > 0) {
        output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
    }

    // Add padding
    while (output.length % 8 !== 0) {
        output += '=';
    }

    return output;
}

function decodeBase32(input) {
    input = input.toUpperCase().replace(/=+$/, '');
    let bits = 0;
    let value = 0;
    let output = [];

    for (let i = 0; i < input.length; i++) {
        const index = BASE32_ALPHABET.indexOf(input[i]);
        if (index === -1) {
            throw new Error('Invalid Base32 character: ' + input[i]);
        }

        value = (value << 5) | index;
        bits += 5;

        if (bits >= 8) {
            output.push((value >>> (bits - 8)) & 255);
            bits -= 8;
        }
    }

    return new TextDecoder().decode(new Uint8Array(output));
}

// ============================================================================
// Base32 Hex Encoding/Decoding
// ============================================================================

const BASE32_HEX_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUV';

function encodeBase32Hex(input) {
    const bytes = new TextEncoder().encode(input);
    let bits = 0;
    let value = 0;
    let output = '';

    for (let i = 0; i < bytes.length; i++) {
        value = (value << 8) | bytes[i];
        bits += 8;

        while (bits >= 5) {
            output += BASE32_HEX_ALPHABET[(value >>> (bits - 5)) & 31];
            bits -= 5;
        }
    }

    if (bits > 0) {
        output += BASE32_HEX_ALPHABET[(value << (5 - bits)) & 31];
    }

    while (output.length % 8 !== 0) {
        output += '=';
    }

    return output;
}

function decodeBase32Hex(input) {
    input = input.toUpperCase().replace(/=+$/, '');
    let bits = 0;
    let value = 0;
    let output = [];

    for (let i = 0; i < input.length; i++) {
        const index = BASE32_HEX_ALPHABET.indexOf(input[i]);
        if (index === -1) {
            throw new Error('Invalid Base32 Hex character: ' + input[i]);
        }

        value = (value << 5) | index;
        bits += 5;

        if (bits >= 8) {
            output.push((value >>> (bits - 8)) & 255);
            bits -= 8;
        }
    }

    return new TextDecoder().decode(new Uint8Array(output));
}

// ============================================================================
// UUEncode/UUDecode
// ============================================================================

function encodeUUEncode(input) {
    if (typeof input !== 'string') throw new Error('Input must be a string');
    const bytes = new TextEncoder().encode(input);
    let output = 'begin 644 data\n';
    
    for (let i = 0; i < bytes.length; i += 45) {
        const chunk = bytes.slice(i, i + 45);
        const len = chunk.length;
        
        output += String.fromCharCode(32 + len);
        
        for (let j = 0; j < len; j += 3) {
            const b1 = chunk[j];
            const b2 = j + 1 < len ? chunk[j + 1] : 0;
            const b3 = j + 2 < len ? chunk[j + 2] : 0;
            
            output += String.fromCharCode(32 + ((b1 >> 2) & 63));
            output += String.fromCharCode(32 + (((b1 << 4) | (b2 >> 4)) & 63));
            output += String.fromCharCode(32 + (((b2 << 2) | (b3 >> 6)) & 63));
            output += String.fromCharCode(32 + (b3 & 63));
        }
        
        output += '\n';
    }
    
    output += '`\nend\n';
    return output;
}

function decodeUUEncode(input) {
    const lines = input.split('\n').filter(line => 
        line && !line.startsWith('begin') && !line.startsWith('end') && line !== '`'
    );
    
    let output = [];
    
    for (const line of lines) {
        if (!line) continue;
        
        const len = line.charCodeAt(0) - 32;
        if (len <= 0) continue;
        
        let lineBytes = [];
        for (let i = 1; i < line.length; i += 4) {
            const c1 = (line.charCodeAt(i) - 32) & 63;
            const c2 = i + 1 < line.length ? (line.charCodeAt(i + 1) - 32) & 63 : 0;
            const c3 = i + 2 < line.length ? (line.charCodeAt(i + 2) - 32) & 63 : 0;
            const c4 = i + 3 < line.length ? (line.charCodeAt(i + 3) - 32) & 63 : 0;
            
            lineBytes.push((c1 << 2) | (c2 >> 4));
            lineBytes.push(((c2 << 4) | (c3 >> 2)) & 255);
            lineBytes.push(((c3 << 6) | c4) & 255);
        }
        
        // Only take the number of bytes specified by the line length prefix
        output.push(...lineBytes.slice(0, len));
    }
    
    return new TextDecoder().decode(new Uint8Array(output));
}

// ============================================================================
// Quoted-Printable Encoding/Decoding
// ============================================================================

function encodeQuotedPrintable(input) {
    if (typeof input !== 'string') throw new Error('Input must be a string');
    const bytes = new TextEncoder().encode(input);
    let output = '';
    let lineLength = 0;
    
    for (let i = 0; i < bytes.length; i++) {
        const byte = bytes[i];
        
        if ((byte >= 33 && byte <= 60) || (byte >= 62 && byte <= 126)) {
            output += String.fromCharCode(byte);
            lineLength++;
        } else {
            const hex = '=' + byte.toString(16).toUpperCase().padStart(2, '0');
            output += hex;
            lineLength += 3;
        }
        
        if (lineLength >= 73) {
            output += '=\n';
            lineLength = 0;
        }
    }
    
    return output;
}

function decodeQuotedPrintable(input) {
    if (typeof input !== 'string') throw new Error('Input must be a string');
    let output = '';
    let i = 0;
    
    while (i < input.length) {
        if (input[i] === '=' && input[i + 1] === '\n') {
            i += 2;
            continue;
        }
        
        if (input[i] === '=' && i + 2 < input.length) {
            const hex = input.substr(i + 1, 2);
            if (!/^[0-9A-Fa-f]{2}$/.test(hex)) {
                throw new Error('Invalid quoted-printable sequence: =' + hex);
            }
            output += String.fromCharCode(parseInt(hex, 16));
            i += 3;
        } else {
            output += input[i];
            i++;
        }
    }
    
    return output;
}

// ============================================================================
// Percent Encoding (URL Encoding)
// ============================================================================

function encodePercent(input) {
    return encodeURIComponent(input);
}

function decodePercent(input) {
    try {
        return decodeURIComponent(input);
    } catch (e) {
        throw new Error('Invalid percent-encoded string');
    }
}

// ============================================================================
// Base58 Encoding/Decoding (Bitcoin alphabet)
// ============================================================================

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function encodeBase58(input) {
    if (typeof input !== 'string') throw new Error('Input must be a string');
    const bytes = new TextEncoder().encode(input);
    const digits = [0];

    for (let i = 0; i < bytes.length; i++) {
        let carry = bytes[i];
        for (let j = 0; j < digits.length; j++) {
            carry += digits[j] << 8;
            digits[j] = carry % 58;
            carry = (carry / 58) | 0;
        }

        while (carry > 0) {
            digits.push(carry % 58);
            carry = (carry / 58) | 0;
        }
    }

    // Add leading zeros
    for (let i = 0; i < bytes.length && bytes[i] === 0; i++) {
        digits.push(0);
    }

    return digits.reverse().map(d => BASE58_ALPHABET[d]).join('');
}

function decodeBase58(input) {
    const bytes = [0];

    for (let i = 0; i < input.length; i++) {
        const value = BASE58_ALPHABET.indexOf(input[i]);
        if (value === -1) {
            throw new Error('Invalid Base58 character: ' + input[i]);
        }

        let carry = value;
        for (let j = 0; j < bytes.length; j++) {
            carry += bytes[j] * 58;
            bytes[j] = carry & 255;
            carry >>= 8;
        }

        while (carry > 0) {
            bytes.push(carry & 255);
            carry >>= 8;
        }
    }

    // Remove leading zeros
    for (let i = 0; i < input.length && input[i] === '1'; i++) {
        bytes.push(0);
    }

    return new TextDecoder().decode(new Uint8Array(bytes.reverse()));
}

// ============================================================================
// Ascii85 Encoding/Decoding (Adobe PDF format)
// ============================================================================

function encodeAscii85(input) {
    const bytes = new TextEncoder().encode(input);
    let output = '<~';

    for (let i = 0; i < bytes.length; i += 4) {
        const remaining = Math.min(4, bytes.length - i);

        // Build a 32-bit unsigned value from up to 4 bytes
        let tuple = 0;
        for (let j = 0; j < 4; j++) {
            tuple = tuple * 256 + (j < remaining ? bytes[i + j] : 0);
        }

        if (remaining === 4 && tuple === 0) {
            output += 'z';
        } else {
            // Encode into 5 base-85 digits
            const encoded = [];
            for (let j = 0; j < 5; j++) {
                encoded.unshift(String.fromCharCode(33 + (tuple % 85)));
                tuple = Math.floor(tuple / 85);
            }
            // For partial groups, output only (remaining + 1) characters
            output += encoded.slice(0, remaining + 1).join('');
        }
    }

    output += '~>';
    return output;
}

function decodeAscii85(input) {
    input = input.replace(/^<~/, '').replace(/~>$/, '').replace(/\s/g, '');
    const output = [];
    let tuple = 0;
    let count = 0;

    for (let i = 0; i < input.length; i++) {
        const char = input[i];

        if (char === 'z') {
            if (count !== 0) {
                throw new Error('Invalid Ascii85: z in middle of tuple');
            }
            output.push(0, 0, 0, 0);
            continue;
        }

        const value = char.charCodeAt(0) - 33;
        if (value < 0 || value > 84) {
            throw new Error('Invalid Ascii85 character: ' + char);
        }

        tuple = tuple * 85 + value;
        count++;

        if (count === 5) {
            for (let j = 3; j >= 0; j--) {
                output.push((tuple >>> (j * 8)) & 255);
            }
            tuple = 0;
            count = 0;
        }
    }

    if (count > 0) {
        // Pad with 'u' characters
        for (let i = count; i < 5; i++) {
            tuple = tuple * 85 + 84;
        }

        for (let j = 3; j >= 5 - count; j--) {
            output.push((tuple >>> (j * 8)) & 255);
        }
    }

    return new TextDecoder().decode(new Uint8Array(output));
}

// ============================================================================
// ROT13 Cipher
// ============================================================================

function encodeROT13(input) {
    return input.replace(/[a-zA-Z]/g, (char) => {
        const code = char.charCodeAt(0);
        const base = code >= 97 ? 97 : 65; // lowercase or uppercase
        return String.fromCharCode(((code - base + 13) % 26) + base);
    });
}

function decodeROT13(input) {
    return encodeROT13(input); // ROT13 is its own inverse
}

// ============================================================================
// Caesar Cipher (with configurable shift)
// ============================================================================

function encodeCaesar(input, shift = 3) {
    shift = ((shift % 26) + 26) % 26; // Normalize shift to 0-25

    return input.replace(/[a-zA-Z]/g, (char) => {
        const code = char.charCodeAt(0);
        const base = code >= 97 ? 97 : 65;
        return String.fromCharCode(((code - base + shift) % 26) + base);
    });
}

function decodeCaesar(input, shift = 3) {
    return encodeCaesar(input, -shift);
}

// ============================================================================
// HTML Entity Encoding/Decoding
// ============================================================================

const HTML_ENTITIES = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '©': '&copy;',
    '®': '&reg;',
    '™': '&trade;',
    '€': '&euro;',
    '£': '&pound;',
    '¥': '&yen;',
    '¢': '&cent;',
    '§': '&sect;',
    '¶': '&para;',
    '†': '&dagger;',
    '‡': '&Dagger;',
    '•': '&bull;',
    '…': '&hellip;',
    '′': '&prime;',
    '″': '&Prime;',
    '‹': '&lsaquo;',
    '›': '&rsaquo;',
    '‾': '&oline;',
    '⁄': '&frasl;',
    '←': '&larr;',
    '↑': '&uarr;',
    '→': '&rarr;',
    '↓': '&darr;',
    '↔': '&harr;',
    '♠': '&spades;',
    '♣': '&clubs;',
    '♥': '&hearts;',
    '♦': '&diams;',
    'α': '&alpha;',
    'β': '&beta;',
    'γ': '&gamma;',
    'δ': '&delta;',
    'ε': '&epsilon;',
    'π': '&pi;',
    'σ': '&sigma;',
    'Σ': '&Sigma;',
    'Ω': '&Omega;',
    ' ': '&nbsp;'
};

function encodeHTMLEntities(input, namedOnly = false) {
    if (namedOnly) {
        // Use named entities only
        return input.replace(/[&<>"'©®™€£¥¢§¶†‡•…′″‹›‾⁄←↑→↓↔♠♣♥♦αβγδεπσΣΩ ]/g, 
            char => HTML_ENTITIES[char] || char);
    } else {
        // Use numeric entities for all non-ASCII
        return input.replace(/[\u0080-\uFFFF]|[&<>"']/g, (char) => {
            if (HTML_ENTITIES[char]) {
                return HTML_ENTITIES[char];
            }
            return '&#' + char.charCodeAt(0) + ';';
        });
    }
}

// Pre-built reverse mapping (computed once at module load, not on every call)
const REVERSE_HTML_ENTITIES = Object.fromEntries(
    Object.entries(HTML_ENTITIES).map(([char, entity]) => [entity, char])
);

function decodeHTMLEntities(input) {
    return input
        // Decode named entities
        .replace(/&[a-zA-Z]+;/g, entity => REVERSE_HTML_ENTITIES[entity] || entity)
        // Decode numeric entities
        .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(parseInt(dec, 10)))
        // Decode hex entities
        .replace(/&#x([0-9A-Fa-f]+);/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)));
}

// ============================================================================
// Atbash Cipher (reverses alphabet)
// ============================================================================

function encodeAtbash(input) {
    return input.replace(/[a-zA-Z]/g, (char) => {
        const code = char.charCodeAt(0);
        if (code >= 97) {
            // lowercase
            return String.fromCharCode(122 - (code - 97));
        } else {
            // uppercase
            return String.fromCharCode(90 - (code - 65));
        }
    });
}

function decodeAtbash(input) {
    return encodeAtbash(input); // Atbash is its own inverse
}

// ============================================================================
// Binary Encoding/Decoding
// ============================================================================

function encodeBinary(input) {
    if (typeof input !== 'string') throw new Error('Input must be a string');
    return Array.from(new TextEncoder().encode(input))
        .map(byte => byte.toString(2).padStart(8, '0'))
        .join(' ');
}

function decodeBinary(input) {
    if (typeof input !== 'string') throw new Error('Input must be a string');
    const cleaned = input.replace(/\s/g, '');
    if (cleaned && !/^[01]+$/.test(cleaned)) {
        throw new Error('Invalid binary string: only 0 and 1 allowed');
    }
    if (cleaned.length % 8 !== 0) {
        throw new Error('Invalid binary string: length must be a multiple of 8 bits');
    }
    const bytes = cleaned.match(/.{8}/g) || [];
    return new TextDecoder().decode(
        new Uint8Array(bytes.map(b => parseInt(b, 2)))
    );
}

// ============================================================================
// Morse Code
// ============================================================================

const MORSE_CODE = {
    'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.',
    'G': '--.', 'H': '....', 'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..',
    'M': '--', 'N': '-.', 'O': '---', 'P': '.--.', 'Q': '--.-', 'R': '.-.',
    'S': '...', 'T': '-', 'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-',
    'Y': '-.--', 'Z': '--..', '0': '-----', '1': '.----', '2': '..---',
    '3': '...--', '4': '....-', '5': '.....', '6': '-....', '7': '--...',
    '8': '---..', '9': '----.', '.': '.-.-.-', ',': '--..--', '?': '..--..',
    '!': '-.-.--', '/': '-..-.', ' ': '/'
};

function encodeMorse(input) {
    if (typeof input !== 'string') throw new Error('Input must be a string');
    return input.toUpperCase()
        .split('')
        .filter(char => MORSE_CODE[char] !== undefined)
        .map(char => MORSE_CODE[char])
        .join(' ');
}

function decodeMorse(input) {
    const reverseMorse = {};
    for (const [char, code] of Object.entries(MORSE_CODE)) {
        reverseMorse[code] = char;
    }

    return input.split(' ')
        .map(code => reverseMorse[code] || '')
        .join('');
}

// ============================================================================
// Export all functions
// ============================================================================

if (typeof module !== 'undefined' && module.exports) {
    // Node.js environment
    module.exports = {
        // Base64
        encodeBase64,
        decodeBase64,
        encodeBase64URL,
        decodeBase64URL,
        // Hex
        encodeHex,
        decodeHex,
        // Base32
        encodeBase32,
        decodeBase32,
        encodeBase32Hex,
        decodeBase32Hex,
        // Base58
        encodeBase58,
        decodeBase58,
        // Ascii85
        encodeAscii85,
        decodeAscii85,
        // UUEncode
        encodeUUEncode,
        decodeUUEncode,
        // Quoted-Printable
        encodeQuotedPrintable,
        decodeQuotedPrintable,
        // Percent
        encodePercent,
        decodePercent,
        // ROT13
        encodeROT13,
        decodeROT13,
        // Caesar
        encodeCaesar,
        decodeCaesar,
        // HTML Entities
        encodeHTMLEntities,
        decodeHTMLEntities,
        // Atbash
        encodeAtbash,
        decodeAtbash,
        // Binary
        encodeBinary,
        decodeBinary,
        // Morse
        encodeMorse,
        decodeMorse
    };
} else {
    // Browser environment - attach to window
    window.Encodings = {
        // Base64
        encodeBase64,
        decodeBase64,
        encodeBase64URL,
        decodeBase64URL,
        // Hex
        encodeHex,
        decodeHex,
        // Base32
        encodeBase32,
        decodeBase32,
        encodeBase32Hex,
        decodeBase32Hex,
        // Base58
        encodeBase58,
        decodeBase58,
        // Ascii85
        encodeAscii85,
        decodeAscii85,
        // UUEncode
        encodeUUEncode,
        decodeUUEncode,
        // Quoted-Printable
        encodeQuotedPrintable,
        decodeQuotedPrintable,
        // Percent
        encodePercent,
        decodePercent,
        // ROT13
        encodeROT13,
        decodeROT13,
        // Caesar
        encodeCaesar,
        decodeCaesar,
        // HTML Entities
        encodeHTMLEntities,
        decodeHTMLEntities,
        // Atbash
        encodeAtbash,
        decodeAtbash,
        // Binary
        encodeBinary,
        decodeBinary,
        // Morse
        encodeMorse,
        decodeMorse
    };
}
