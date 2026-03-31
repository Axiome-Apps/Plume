# Plume - Smart Image Compression

[![Tauri](https://img.shields.io/badge/Tauri-2.0-blue.svg)](https://tauri.app/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)](https://www.typescriptlang.org/)
[![Rust](https://img.shields.io/badge/Rust-1.70+-orange.svg)](https://www.rust-lang.org/)

A modern, fast, and intelligent image compression desktop application built with Tauri, React, and Rust. Compress your images without compromising quality using cutting-edge algorithms.

## ✨ Features

- **🚀 Blazing Fast**: Native Rust performance with MozJPEG, oxipng, and libwebp
- **🎯 Smart Compression**: Three compression levels (light, balanced, aggressive) with automatic format handling
- **📱 Multiple Formats**: PNG, JPEG, WebP input/output + HEIC/HEIF import (iPhone photos)
- **🖱️ Drag & Drop**: Seamless file handling from Finder/Explorer
- **💾 Batch Processing**: Compress multiple images at once with automatic save
- **📈 Intelligent Estimation**: SQLite-backed size and duration predictions that improve with usage
- **🎨 Modern UI**: OKLCH design system with Nunito font, built with Tailwind CSS
- **🔒 Privacy First**: All processing happens locally, no cloud uploads

## 🎬 Demo

![Plume Demo](.github/assets/demo.gif)

## 📥 Installation

### macOS

#### Homebrew (recommended)

```bash
brew install --cask axiome-apps/tap/plume
```

#### Direct Download

| Architecture             | Download                                                                              |
| ------------------------ | ------------------------------------------------------------------------------------- |
| Apple Silicon (M1/M2/M3) | https://github.com/Axiome-Apps/Plume/releases/download/v0.4.0/Plume_0.4.0_aarch64.dmg |
| Intel                    | https://github.com/Axiome-Apps/Plume/releases/download/v0.4.0/Plume_0.4.0_x64.dmg     |

⚠️ Direct download only: macOS blocks unsigned apps. Run this command to unblock:

```bash
xattr -dr com.apple.quarantine /Applications/Plume.app
```

### Windows

| Format | Download                                                                                |
| ------ | --------------------------------------------------------------------------------------- |
| MSI    | https://github.com/Axiome-Apps/Plume/releases/download/v0.4.0/Plume_0.4.0_x64_en-US.msi |
| EXE    | https://github.com/Axiome-Apps/Plume/releases/download/v0.4.0/Plume_0.4.0_x64-setup.exe |

⚠️ If SmartScreen blocks the app, click "More info" → "Run anyway".

### Linux

| Format   | Download                                                                                 |
| -------- | ---------------------------------------------------------------------------------------- |
| AppImage | https://github.com/Axiome-Apps/Plume/releases/download/v0.4.0/Plume_0.4.0_amd64.AppImage |
| Deb      | https://github.com/Axiome-Apps/Plume/releases/download/v0.4.0/Plume_0.4.0_amd64.deb      |
| RPM      | https://github.com/Axiome-Apps/Plume/releases/download/v0.4.0/Plume-0.4.0-1.x86_64.rpm   |

For AppImage, make it executable:

```bash
chmod +x ./Plume*.AppImage
```

### For Developers

#### Prerequisites

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **Rust** 1.70+ ([Install](https://rustup.rs/))
- **pnpm** ([Install](https://pnpm.io/installation))
- **nasm** (required for MozJPEG: `brew install nasm` / `sudo apt install nasm` / `choco install nasm`)

#### Development Setup

```bash
# Clone the repository
git clone https://github.com/Axiome-Apps/Plume.git
cd plume

# Install dependencies
pnpm install

# Run in development mode
pnpm tauri dev

# Build for production
pnpm tauri build
```

## 🏗️ Architecture

Plume follows clean architecture principles with clear separation of concerns:

### Frontend (TypeScript/React)

```
src/
├── components/          # Atomic Design (atoms → molecules → organisms → templates)
├── domain/
│   ├── compression/     # Compression settings and format schemas (Zod)
│   ├── image/           # Image entity and schema
│   ├── i18n/            # Translation schema and validation
│   ├── progress/        # Adaptive progress manager
│   └── size-prediction/ # Compression estimation service (DB-backed)
├── store/               # Zustand state management
├── hooks/               # Custom React hooks
├── lib/                 # Tauri command wrappers
└── locales/             # FR/EN translations
```

### Backend (Rust)

```
src-tauri/src/
├── commands/            # Tauri command handlers (compression, file, database, stats)
├── domain/
│   ├── compression/     # Engine (MozJPEG, oxipng, libwebp, libheif), formats, settings, stats
│   ├── file/            # File I/O, metadata, path utilities
│   ├── image/           # Image analysis and metadata extraction
│   └── shared/          # Config, errors, events, utilities
└── database/            # SQLite connection, migrations, models
```

### Key Design Patterns

- **Functional Architecture**: Pure functions + data structures (Rust)
- **Atomic Design**: Component hierarchy from atoms to templates (React)
- **Domain-Driven Design**: Feature-based domain modules with Zod schemas (TypeScript)
- **Adaptive Learning**: Compression estimates improve with real usage data (SQLite)

## 🧪 Testing

```bash
# Rust tests
cargo test --manifest-path src-tauri/Cargo.toml

# Frontend tests
pnpm test

# Type check
pnpm type-check

# Lint
pnpm lint
```

## 🚀 Performance

- **PNG Optimization**: Up to 70% size reduction with oxipng lossless optimization
- **JPEG Compression**: MozJPEG encoder for 10-20% better compression than standard libjpeg
- **WebP Conversion**: 25-35% smaller than JPEG at equivalent quality
- **HEIC/HEIF Support**: Import iPhone photos directly, convert to WebP/JPEG/PNG
- **ICC Profiles**: Color accuracy preserved across all format conversions
- **Native Speed**: Rust backend with zero JavaScript bottlenecks

## 📋 Roadmap

See [TODO.md](./TODO.md) for detailed development plans.

### Upcoming Features

- [x] HEIC/HEIF support for iPhone photos
- [x] MozJPEG encoder for better JPEG compression
- [x] Smart format selection UI (WebP/Original/HEIC flows)
- [x] OKLCH design system with Nunito font
- [x] DB-backed compression estimation (size + duration)
- [ ] AVIF format support
- [ ] Output folder selection
- [ ] Parallel compression (multi-image batch)
- [ ] Compression profiles (Web, Archive, etc.)

## 🤝 Contributing

We welcome contributions! Please read our [Contributing Guide](./CONTRIBUTING.md) to get started.

### Quick Start for Contributors

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes following our code style
4. Add tests for new functionality
5. Submit a pull request

### Development Standards

- **Code Style**: Prettier + ESLint for TypeScript, rustfmt for Rust
- **Testing**: Vitest for frontend, built-in test framework for Rust
- **Commits**: Conventional commits with meaningful messages
- **Documentation**: Update relevant docs with any changes

## 🛠️ Built With

- [Tauri](https://tauri.app/) - Secure, fast, cross-platform app framework
- [React](https://react.dev/) - UI library for building user interfaces
- [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Zod](https://zod.dev/) - TypeScript schema validation
- [Rust](https://www.rust-lang.org/) - Systems programming language
- [oxipng](https://github.com/shssoichiro/oxipng) - PNG optimization
- [mozjpeg-sys](https://crates.io/crates/mozjpeg-sys) - Optimized JPEG compression
- [webp](https://crates.io/crates/webp) - WebP encoding
- [libheif-rs](https://crates.io/crates/libheif-rs) - HEIC/HEIF decoding
- [rusqlite](https://crates.io/crates/rusqlite) - SQLite database

## 🙏 Acknowledgments

- The Tauri team for the amazing framework
- Contributors to oxipng, webp-sys, and other compression libraries
- The open source community for inspiration and tools

## License

Plume is licensed under **CeCILL v2.1**. For more details, see the [LICENSE](./LICENSE.md) file.

## 📞 Support

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/Axiome-Apps/Plume/issues)
- 💡 **Feature Requests**: [GitHub Discussions](https://github.com/Axiome-Apps/Plume/discussions)

---

<div align="center">
  <strong>Made with ❤️ and ⚡ by the Axiome Apps community</strong>
</div>
