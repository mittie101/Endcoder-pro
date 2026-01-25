# Contributing to Endcoder Pro

Thank you for your interest in contributing to Endcoder Pro! This document provides guidelines for contributing to the project.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/endcoder-pro.git`
3. Create a new branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Test thoroughly
6. Commit your changes: `git commit -m "Add your feature"`
7. Push to your fork: `git push origin feature/your-feature-name`
8. Create a Pull Request

## Development Setup

```bash
# Install dependencies
npm install

# Start development
npm start

# Run tests (if available)
npm test
```

## Code Style

- Use consistent indentation (2 spaces)
- Follow existing code patterns
- Comment complex logic
- Use meaningful variable names
- Keep functions focused and concise

## Commit Messages

- Use clear, descriptive commit messages
- Start with a verb (Add, Fix, Update, Remove, etc.)
- Reference issue numbers when applicable

Examples:
- `Add QR code generation feature`
- `Fix bcrypt loading issue on Windows`
- `Update dependencies to latest versions`

## Pull Request Guidelines

- Keep PRs focused on a single feature or fix
- Update documentation if needed
- Test on multiple platforms when possible
- Describe what your PR does and why

## Reporting Issues

When reporting issues, please include:
- Operating system and version
- Node.js and Electron versions
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable
- Error messages or logs

## Feature Requests

We welcome feature requests! Please:
- Check if the feature already exists
- Search existing issues to avoid duplicates
- Clearly describe the feature and its use case
- Explain why it would benefit users

## Testing

Before submitting:
- Test your changes thoroughly
- Verify encoding/decoding accuracy
- Check UI responsiveness
- Test on Windows (if possible)
- Ensure no console errors

## Questions?

Feel free to open an issue for questions or clarifications.

Thank you for contributing! 🎉
