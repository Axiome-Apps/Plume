# Plume - Product Roadmap

**Smart Image Compression Desktop App**

---

## Current State — v0.5.0

### What's done

- Multi-format compression: PNG, JPEG, WebP input/output + HEIC/HEIF import
- MozJPEG encoder with ICC profile preservation across all formats
- Drag & drop + file picker with batch processing
- OKLCH design system with Nunito font, FR/EN i18n
- SQLite-backed compression estimation (size + duration, pixel-count aware)
- Adaptive progress bar synchronized with real compression completion
- Smart output naming by compression level (`photo_balanced.webp`)
- "Already optimized" detection — keeps original when compressed file would be larger
- Reveal in Finder button on completed images
- Lightweight CI (lint + clippy + tests), full build on release tags
- Homebrew cask distribution (`brew install --cask axiome-apps/tap/plume`)

---

## v0.5.1 — Bug Fixes

- [ ] Fix "Reveal in Finder" not working on macOS (tauri-plugin-opener / outputPath issue)
- [ ] Fix non-functional "open" buttons (folder icon) — wire up or remove
- [ ] Lock quality slider when output format is PNG (oxipng is always lossless)

## v0.6.0 — Compression Profiles

- [ ] Named presets replacing light/balanced/aggressive (e.g., Web, Archive, Print)
- [ ] Profile-aware output naming (`photo_web.webp`, `photo_archive.png`)
- [ ] Persistent settings (last used profile saved across sessions)

## v0.7.0 — Output & Workflow

- [ ] Add entire folder as input (recursive scan, filtered by supported image extensions)
- [ ] Output folder selection (choose where compressed files go)
- [ ] Collision-safe output naming (never overwrite existing files → `photo (1).webp`) — scaffolding existed (`generate_output_path`/`make_unique_filename`) but was unused and removed; revisit alongside output folder selection
- [ ] Parallel compression (multi-image batch with concurrency limit)
- [ ] Batch progress indicator (global "X of Y done")

## v1.0 — Format Expansion

- [ ] AVIF format support (next-gen web format)
- [ ] JPEG XL evaluation

---

## Technical Debt

- [ ] Remove dead EventBus infrastructure (~400 lines in shared/events.rs)
- [ ] Fix `compressImage(imageId)` — currently compresses all pending images instead of targeted one
- [ ] Validate ADR-0001..0005 "options envisagées" — reconstructed from code, confirm/complete the rationale and rejected alternatives (`docs-internal/adr/`)

---

**Last Updated**: March 2026
**Current Version**: v0.5.0
