# Changelog

All notable changes to Endcoder Pro will be documented in this file.

## [3.1.0] - 2026-03-07

### Added
- ROT13, Caesar cipher, Atbash, HTML Entities, and Morse Code encodings wired into encoder/decoder
- New encoding options visible in the main encoding dropdown

### Fixed
- Paste auto-detect no longer targets wrong dropdown element (`encodingType` → `encodingSelect`)
- `optimize-image` IPC handler now enforces `allowedPaths` check (security parity with `read-file`)
- `read-file` test now correctly populates `allowedPaths` before calling the handler

### Changed
- `electron-updater` publish target configured for GitHub Releases
- Version bumped to 3.1.0

## [3.0.0] - 2024-11-01

### Added
- Monaco Editor integration for professional code editing
- JWT signing and verification tools
- Password hashing with PBKDF2, bcrypt, and Argon2
- Diff comparator for text comparison
- Image optimization (resize and compress)
- QR code generation from output
- Code snippet generation (HTML, CSS, Data URI, JSON)
- Local API server for automation
- History manager to track operations
- Dark/Light theme toggle
- Multiple encoding formats:
  - Base64 and Base64URL
  - Base32 and Base32Hex
  - Hexadecimal
  - Binary
  - ASCII85
  - Base58
  - UUEncode
  - Quoted-Printable
  - Percent Encoding
- File drag & drop support
- Export to C#, Java, and Python byte arrays
- Statistics bar with character, byte, and line counts
- Input sanitization for fixing formatting issues

### Changed
- Migrated to Electron 28
- Improved UI with modern design
- Enhanced error handling
- Better keyboard shortcuts

### Security
- Added bcrypt and Argon2 for secure password hashing
- JWT validation with proper secret verification
- Local processing - no external data transmission

## [2.0.0] - Previous Version
- Basic encoding/decoding functionality
- Simple text-based interface

## [1.0.0] - Initial Release
- Base64 encoding and decoding
