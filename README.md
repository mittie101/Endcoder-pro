# Endcoder Pro

Professional encoding/decoding toolkit with advanced cryptographic features, built with Electron and Monaco Editor.

![Endcoder Pro Logo](logo.png)

## Features

### Core Encoding/Decoding
- **Multiple Formats**: Base64, Base64URL, Base32, Base32Hex, Hex, Binary, ASCII85, Base58, UUEncode, Quoted-Printable, Percent Encoding
- **File Support**: Drag & drop or load files directly
- **Monaco Editor**: Professional code editor with syntax highlighting
- **Statistics**: Real-time character, byte, and line counts
- **Export Options**: C#, Java, and Python byte arrays

### Advanced Features
- **JWT Tools**: Sign and verify JSON Web Tokens (HS256, HS512)
- **Password Hashing**: PBKDF2, bcrypt, and Argon2 support
- **Diff Comparator**: Side-by-side text comparison with highlighting
- **Image Optimizer**: Resize and compress images (JPEG/PNG)
- **QR Code Generator**: Create QR codes from encoded output
- **Code Snippets**: Generate HTML, CSS, Data URI, and JSON snippets
- **Local API Server**: Built-in REST API for automation
- **History Manager**: Track and restore previous operations
- **Dark/Light Theme**: Customizable interface

## Installation

### Prerequisites
- Node.js 16 or higher
- Windows: Visual Studio 2022 Build Tools (for native modules)

### Setup

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/endcoder-pro.git
cd endcoder-pro

# Install dependencies
npm install

# Start the application
npm start
```

## Building

### Windows
```bash
npm run build:win
```

### macOS
```bash
npm run build:mac
```

### Linux
```bash
npm run build:linux
```

## Usage

### Basic Encoding/Decoding
1. Select your desired encoding format from the dropdown
2. Enter or paste text in the input panel
3. Click "Encode" or "Decode"
4. Copy or save the output

### JWT Operations
Navigate to the JWT Tools tab to:
- Verify existing JWT tokens with secret keys
- Sign new JWT payloads
- View decoded header and payload

### Password Hashing
1. Switch to the Password Hash tab
2. Choose algorithm (PBKDF2, bcrypt, or Argon2)
3. Enter password and configure options
4. Generate hash or verify existing hashes

### API Server
Start the local API server for programmatic access:
```bash
# API will run on http://localhost:3000
POST /encode - Encode data
POST /decode - Decode data
```

## Project Structure

```
endcoder-pro/
├── main.js              # Electron main process
├── index.html           # Main application UI
├── app.js              # Application logic
├── styles.css          # Styling
├── encodings.js        # Encoding implementations
├── converter.js        # Core conversion logic
├── jwt-handler.js      # JWT operations
├── diff-tool.js        # Text comparison
├── advanced-features.js # QR codes & snippets
├── ui-handler.js       # UI state management
├── history-manager.js  # Operation history
├── preload.js          # Electron preload script
└── package.json        # Project configuration
```

## Native Modules

Endcoder Pro uses native modules for advanced password hashing:

- **bcrypt**: Secure password hashing
- **argon2**: Memory-hard password hashing (recommended)

These are optional - PBKDF2 fallback is always available.

## Security

- API keys and secrets are never logged
- Password hashes use industry-standard algorithms
- Local processing - no data sent to external servers
- JWT operations performed client-side

## Technologies

- **Electron**: Cross-platform desktop framework
- **Monaco Editor**: VS Code's editor component
- **Express**: REST API server
- **JIMP**: Image processing
- **QRious**: QR code generation
- **bcrypt/argon2**: Password hashing

## License

MIT License - see LICENSE file for details

## Author

Antony Morrison

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues and feature requests, please use the GitHub Issues page.
