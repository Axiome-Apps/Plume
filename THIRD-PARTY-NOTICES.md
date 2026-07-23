# Third-Party Notices

Plume is licensed under the GNU General Public License v3.0 or later (see [LICENSE](./LICENSE)).
It bundles and links against the third-party components listed below. Each remains under its own
license, reproduced or referenced here as required.

---

## Statically linked into the distributed binary

These libraries are vendored under `src-tauri/patches/libheif-sys/vendor/` and compiled into the
Plume binary through the `libheif-sys` crate with the `embedded-libheif` feature. They provide
HEIC/HEIF import.

### libheif

- **License**: GNU Lesser General Public License v3.0
- **Copyright**: Dirk Farin and contributors
- **Upstream**: https://github.com/strukturag/libheif
- **License text**: `src-tauri/patches/libheif-sys/vendor/libheif/COPYING`

### libde265

- **License**: GNU Lesser General Public License v3.0
- **Copyright**: struktur AG and contributors
- **Upstream**: https://github.com/strukturag/libde265
- **License text**: `src-tauri/patches/libheif-sys/vendor/libde265/COPYING`

> **LGPL compliance note** — Plume is distributed under the GPL-3.0-or-later, which the LGPL-3.0
> explicitly permits as a downstream license (LGPL-3.0 § 2b and § 4). Because the whole of Plume is
> conveyed under the GPL-3.0, recipients already receive the complete corresponding source — for
> Plume itself and for the vendored libraries — which satisfies the LGPL relinking requirement.
> Should Plume ever move to a permissive license, this arrangement must be revisited: static linking
> of LGPL code under a permissive license requires separately offering object files or switching to
> dynamic linking.

---

## Compression engines

### oxipng

- **License**: MIT
- **Role**: lossless PNG optimization
- **Upstream**: https://github.com/shssoichiro/oxipng

### mozjpeg (via `mozjpeg-sys`)

- **License**: BSD-3-Clause / IJG (libjpeg-turbo licensing)
- **Role**: JPEG encoding with ICC profile support
- **Upstream**: https://github.com/mozilla/mozjpeg

### libwebp (via the `webp` crate)

- **License**: BSD-3-Clause
- **Copyright**: Google Inc.
- **Role**: WebP encoding and decoding
- **Upstream**: https://chromium.googlesource.com/webm/libwebp

---

## Application framework and runtime

| Component     | License          | Role                                  |
| ------------- | ---------------- | ------------------------------------- |
| Tauri         | MIT / Apache-2.0 | Desktop application framework         |
| `image`       | MIT / Apache-2.0 | Image decoding and pixel manipulation |
| `rusqlite`    | MIT              | SQLite bindings (bundled SQLite)      |
| SQLite        | Public domain    | Compression statistics storage        |
| `serde`       | MIT / Apache-2.0 | Serialization                         |
| `thiserror`   | MIT / Apache-2.0 | Error types                           |
| `chrono`      | MIT / Apache-2.0 | Date and time handling                |
| `log`         | MIT / Apache-2.0 | Logging facade                        |
| `env_logger`  | MIT / Apache-2.0 | Logging implementation                |
| `dirs`        | MIT / Apache-2.0 | Platform directory resolution         |
| `base64`      | MIT / Apache-2.0 | Base64 encoding                       |
| `tempfile`    | MIT / Apache-2.0 | Temporary file handling               |
| `libheif-sys` | MIT              | Rust bindings to libheif              |
| React         | MIT              | User interface                        |
| Zustand       | MIT              | Frontend state management             |
| Zod           | MIT              | Schema validation                     |
| Tailwind CSS  | MIT              | Styling                               |
| Vite          | MIT              | Build tooling                         |

---

## Fonts

Font files are vendored under `src/assets/fonts/` and shipped inside the application bundle.

A font qualifies for Plume when its license grants redistribution and embedding under the
GPL-3.0 — in practice the SIL Open Font License, which permits bundling with software (OFL § 2).
Ship the license text and copyright notice alongside the font files, as OFL § 2 requires.

### Nunito — `--font-sans`

- **License**: SIL Open Font License 1.1
- **Copyright**: The Nunito Project Authors
- **Upstream**: https://github.com/googlefonts/nunito
- OFL § 2 explicitly permits bundling and redistribution with software. No conflict with the
  GPL-3.0, **provided** the copyright notice and the OFL text travel with the font — see
  `src/assets/fonts/Nunito/OFL.txt`.

### JetBrains Mono — `--font-mono`

- **License**: SIL Open Font License 1.1
- **Copyright**: Copyright 2020 The JetBrains Mono Project Authors
- **Version**: 2.242 (weights 400 and 500, converted to woff2)
- **Upstream**: https://github.com/JetBrains/JetBrainsMono
- **License text**: `src/assets/fonts/JetBrainsMono/OFL.txt`
- Used for metadata, dimensions, durations and oklch values — never for body copy.

---

Generate an exhaustive dependency-license report with `cargo license` (Rust) and
`pnpm licenses list` (JavaScript). This file records the components that carry redistribution
obligations; it is not a substitute for the full transitive dependency tree.
