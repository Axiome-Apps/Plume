# Plume - Smart Image Compression

[![Tauri](https://img.shields.io/badge/Tauri-2.0-blue.svg)](https://tauri.app/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)](https://www.typescriptlang.org/)
[![Rust](https://img.shields.io/badge/Rust-1.70+-orange.svg)](https://www.rust-lang.org/)

A modern, fast, and intelligent image compression desktop application built with Tauri, React, and Rust. Compress your images without compromising quality using cutting-edge algorithms.

## ✨ Features

- **🚀 Blazing Fast**: Native Rust performance with multi-threaded compression
- **🎯 Smart Compression**: Automatic format detection and optimization
- **📱 Multiple Formats**: Support for PNG, JPEG, WebP with HEIF coming soon
- **🖱️ Drag & Drop**: Seamless file handling from Finder/Explorer
- **📊 Real-time Preview**: See compression results instantly
- **💾 Batch Processing**: Handle multiple images at once
- **📈 Detailed Analytics**: Compression ratios, file size savings, and more
- **🎨 Modern UI**: Clean, intuitive interface built with Tailwind CSS
- **🔒 Privacy First**: All processing happens locally, no cloud uploads

## 🎬 Demo

*Screenshots and demo GIFs will be added here*

## 📥 Installation

### For Users

#### macOS
```bash
# Using Homebrew (coming soon)
brew install plume

# Or download from releases
# https://github.com/username/plume/releases
```

#### Windows
```bash
# Using Chocolatey (coming soon)
choco install plume

# Or download from releases
# https://github.com/username/plume/releases
```

#### Linux
```bash
# Using Snap (coming soon)
sudo snap install plume

# Or download AppImage from releases
# https://github.com/username/plume/releases
```

### For Developers

#### Prerequisites
- **Node.js** 18+ ([Download](https://nodejs.org/))
- **Rust** 1.70+ ([Install](https://rustup.rs/))
- **pnpm** ([Install](https://pnpm.io/installation))

#### Development Setup
```bash
# Clone the repository
git clone https://github.com/username/plume.git
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
├── components/          # Atomic Design Components
│   ├── atoms/           # Basic UI elements (Button, Icon)
│   ├── molecules/       # Component combinations (ImageCard, FileUpload)  
│   ├── organisms/       # Complex components (ImageList, DropZone)
│   └── templates/       # Page layouts
├── domain/              # Business Logic
│   ├── entities/        # Core business objects (Image, CompressionSettings)
│   ├── schemas/         # Zod validation schemas
│   └── services/        # Business use cases
├── infrastructure/      # External adapters (Tauri commands)
└── presentation/        # React hooks and UI logic
```

### Backend (Rust)
```
src-tauri/src/
├── commands/            # Tauri command handlers
├── domain/              # Business entities and services
│   ├── entities/        # Core domain objects  
│   └── services/        # Business logic services
└── infrastructure/      # Technical implementations
    └── compression/     # Format-specific compressors
```

### Key Design Patterns
- **Clean Architecture**: Dependencies point inward to the domain
- **Strategy Pattern**: Pluggable compression algorithms
- **Domain-Driven Design**: Rich domain models with business logic
- **CQRS**: Separate read/write operations for better performance

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run frontend tests
pnpm test:frontend

# Run Rust tests  
cargo test

# Run E2E tests
pnpm test:e2e

# Coverage report
pnpm test:coverage
```

## 🚀 Performance

- **PNG Optimization**: Up to 70% size reduction with oxipng
- **WebP Conversion**: 25-35% smaller than JPEG with same quality  
- **Multi-threading**: Utilizes all CPU cores for batch processing
- **Memory Efficient**: Streaming compression for large files
- **Native Speed**: Rust backend eliminates JavaScript bottlenecks

## 📋 Roadmap

See [TODO.md](./TODO.md) for detailed development plans.

### Upcoming Features
- [ ] HEIF/HEIC support for iPhone users
- [ ] AVIF format support  
- [ ] Video compression
- [ ] Advanced batch processing with progress
- [ ] Plugin architecture for custom compressors
- [ ] CLI version
- [ ] Web version

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
- **Testing**: Jest for frontend, built-in test framework for Rust
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
- [webp](https://developers.google.com/speed/webp/) - Modern image format

## 📄 License


## 🙏 Acknowledgments

- The Tauri team for the amazing framework
- Contributors to oxipng, webp-sys, and other compression libraries
- The open source community for inspiration and tools

## License

Plume is licensed under **CeCILL v2.1**. For more details, see the [LICENSE](./LICENSE.md) file.
## 📞 Support

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/username/plume/issues)
- 💡 **Feature Requests**: [GitHub Discussions](https://github.com/username/plume/discussions)  
- 📖 **Documentation**: [Official Docs](https://plume-docs.com)
- 💬 **Community**: [Discord](https://discord.gg/plume)

---

<div align="center">
  <strong>Made with ❤️ and ⚡ by the Plume community</strong>
</div>