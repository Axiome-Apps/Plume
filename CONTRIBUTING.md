# 🤝 Contributing to Plume

Thank you for your interest in contributing to Plume! This document provides guidelines for contributing to the project.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Submitting Changes](#submitting-changes)
- [Code Style](#code-style)
- [Testing](#testing)
- [Documentation](#documentation)

## 📜 Code of Conduct

This project and everyone participating in it is governed by our commitment to creating a welcoming and inclusive environment. Please be respectful and constructive in all interactions.

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **Rust** 1.70+ ([Install](https://rustup.rs/))
- **pnpm** ([Install](https://pnpm.io/installation))

### Development Setup

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:

   ```bash
   git clone https://github.com/YOUR_USERNAME/plume.git
   cd plume
   ```

3. **Install dependencies**:

   ```bash
   pnpm install
   ```

4. **Run the development server**:
   ```bash
   pnpm tauri dev
   ```

## 🔄 Making Changes

### Branch Naming Convention

Use descriptive branch names:

- `feat/add-avif-support` - New features
- `fix/compression-memory-leak` - Bug fixes
- `docs/update-readme` - Documentation
- `refactor/optimize-png-algorithm` - Code improvements
- `test/add-integration-tests` - Testing improvements

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add HEIF image format support

- Implement HeifCompressor with libheif integration
- Add HEIF format detection and validation
- Update UI to show HEIF option in format dropdown
- Add tests for HEIF compression workflow

Closes #123
```

**Types:**

- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

## 📤 Submitting Changes

### Pull Request Process

1. **Create a feature branch** from `main`
2. **Make your changes** following our code style
3. **Add/update tests** for your changes
4. **Update documentation** if needed
5. **Run the test suite**:

   ```bash
   # Frontend
   pnpm test
   pnpm lint
   pnpm type-check

   # Backend
   cd src-tauri
   cargo test
   cargo fmt
   cargo clippy
   ```

6. **Create a Pull Request** with:
   - Clear title and description
   - Reference to related issues
   - Screenshots for UI changes
   - Testing instructions

### Pull Request Requirements

- [ ] All tests pass
- [ ] Code follows style guidelines
- [ ] Documentation updated if needed
- [ ] No merge conflicts with main branch
- [ ] PR template completed

## 🎨 Code Style

### TypeScript/React

- Use **TypeScript** for all new code
- Follow **ESLint** and **Prettier** configurations
- Use **functional components** with hooks
- Prefer **named exports** over default exports

### Rust

- Run `cargo fmt` before committing
- Address all `cargo clippy` warnings
- Use meaningful variable and function names
- Add documentation for public APIs

### File Naming

- Components: `PascalCase.tsx`
- Utilities: `camelCase.ts`
- Constants: `SCREAMING_SNAKE_CASE`

## 🧪 Testing

### Frontend Testing

Vitest runs the suites under `src/**/__tests__/`. Cover logic rather than
markup: domain helpers, entity state transitions and services. The design layer
(classes, layout) is deliberately not tested.

Coverage thresholds act as a ratchet — they sit just under what the suite
currently reaches, so removing a test fails the build. Raise them as coverage
grows rather than treating them as a target.

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm test:coverage
```

### Backend Testing

- **Unit tests**: Test individual functions
- **Integration tests**: Test API endpoints
- **Property-based tests**: For compression algorithms

```bash
cd src-tauri

# Run all tests
cargo test

# Run specific tests
cargo test compression

# Run with output
cargo test -- --nocapture
```

### Test Guidelines

- Write tests for new logic, and update them for bug fixes
- Use descriptive test names
- Test edge cases and error conditions
- Cover what carries behaviour, not markup

## 📚 Documentation

### Code Documentation

- **JSDoc** for TypeScript functions
- **rustdoc** for Rust public APIs
- Clear variable and function names
- Comments for complex logic

### User Documentation

- Update README.md for new features
- Add examples for new APIs
- Update screenshots for UI changes

## 🔧 Project Structure

```
plume/
├── src/                         # Frontend source
│   ├── components/              # React components (atomic design)
│   │   ├── atoms/               # Basic UI elements
│   │   ├── molecules/           # Component combinations
│   │   ├── organisms/           # Complex components
│   │   ├── templates/           # Page layouts
│   │   ├── brand/               # Logo & brand assets
│   │   └── icons/               # SVG icon set
│   ├── domain/                  # Business logic, sliced by concept
│   │   ├── compression/         # Output formats & levels
│   │   ├── image/               # Queued image entity & schema
│   │   ├── drag-drop/           # Drop events & extension filtering
│   │   ├── progress/            # AdaptiveProgressManager
│   │   ├── size-prediction/     # Estimation + static fallback
│   │   └── i18n/                # FR/EN configuration
│   ├── hooks/                   # Custom React hooks
│   ├── lib/                     # tauri.ts (single IPC entry point), format.ts
│   ├── store/                   # Zustand state
│   └── locales/                 # Translation files
├── src-tauri/                   # Backend source
│   ├── src/
│   │   ├── commands/            # Tauri command handlers
│   │   ├── database/            # SQLite connection & migrations
│   │   └── domain/              # compression / file
│   └── Cargo.toml
└── docs/               # ADRs, internal reference, release runbook
```

Architecture details: [`docs/reference/architecture.md`](./docs/reference/architecture.md).
Structural decisions and their rationale: [`docs/adr/`](./docs/adr/README.md).

## 🎯 Contribution Areas

### High Priority

- 🖼️ **New image formats** (HEIF, AVIF, JPEG XL)
- ⚡ **Performance optimizations**
- 🐛 **Bug fixes and stability**
- 🧪 **Test coverage improvements**

### Medium Priority

- 🎨 **UI/UX enhancements**
- 📱 **Platform-specific features**
- 🌐 **Internationalization**
- 📊 **Analytics and metrics**

### Low Priority

- 📚 **Documentation improvements**
- 🔧 **Developer tooling**
- 🎪 **Demo and examples**

## 🐛 Reporting Bugs

1. **Search existing issues** first
2. **Use the bug report template**
3. **Provide reproduction steps**
4. **Include system information**
5. **Add screenshots if applicable**

## ✨ Requesting Features

1. **Check the roadmap** first
2. **Use the feature request template**
3. **Explain the use case**
4. **Provide mockups if possible**
5. **Consider implementation complexity**

## 🙋 Getting Help

- **GitHub Discussions** for questions
- **GitHub Issues** for bugs
- **Discord** for real-time chat (coming soon)

## 📄 License

By contributing to Plume, you agree that your contributions will be licensed under the
[GNU General Public License v3.0 or later](./LICENSE).

---

**Thank you for contributing to Plume!** 🪶
