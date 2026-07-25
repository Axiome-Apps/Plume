# ADR-0007 — Least-privilege Tauri security surface (CSP, asset scope, capability, FS allow-list)

Status: accepted · 2026-07-24

## Context

The initial configuration widened the attack surface with no functional benefit:

- `app.security.csp` was `null` — Tauri injected **no** Content-Security-Policy, so any injected
  content (a crafted file name, a compromised frontend dependency) could load remote scripts and
  exfiltrate freely.
- `app.security.assetProtocol.scope` was `["**"]` — the webview could read **any** file on disk
  through `asset://`. Combined with the missing CSP, this is the most sensitive point: no policy
  bounding a total filesystem read exposed to the webview.
- The capability listed redundant and over-broad permissions (`dialog:default` grants save/ask/
  confirm/message; the app only opens files).
- The filesystem allow-list lived inline inside `validate_safe_path`, conceptually duplicated by the
  asset scope with no link between the two.

For a local desktop webview, the least-privilege posture is a code-conform convention, not an
optional hardening.

## Options considered

- **Keep the defaults / disable the CSP for convenience** — rejected: violates least privilege and
  defeats Tauri's security model.
- **Runtime-driven single scope** (Rust configures the asset scope at startup from one constant, the
  JSON scope stays empty) — rejected: it removes a rarely-changing duplicate at the cost of
  **auditability** — the exposed surface would no longer be visible in the config, only reconstructed
  from setup code.
- **Static least-privilege config + a single Rust SSOT for the allow-list, mirrored in the asset
  scope** — **selected**. The security surface stays readable in the config; the allow-list logic has
  one owner.

## Decision

- **CSP active and minimal** (local webview): `default-src 'self'`; `img-src` adds `asset:
  http://asset.localhost data:` for previews; `style-src 'self' 'unsafe-inline'` for Tailwind /
  inline React styles; `connect-src` adds `ipc: http://ipc.localhost`. No remote hosts. Tauri appends
  script nonces/hashes at build time, so `script-src` needs nothing beyond `'self'`.
- **Asset protocol scope bounded** to the user directories the app legitimately touches
  (`$HOME`, `$TEMP`, `/Volumes`, `/media`, `/mnt`), mirroring the Rust FS allow-list.
- **FS allow-list is a single source of truth**: `PathUtils::allowed_roots()` in
  `domain/file/path.rs`; `validate_safe_path` consumes it; the asset scope in `tauri.conf.json`
  mirrors it. The coupling is documented on the Rust side (strict JSON carries no comment).
- **Capability reduced to the strict minimum**: `core:default`, `dialog:allow-open`,
  `opener:allow-reveal-item-in-dir`. The last one also fixes reveal-in-folder, which had no
  permission and was refused at runtime.

## Consequences

- Injected content can no longer exfiltrate freely (CSP) nor read arbitrary files (bounded asset
  scope).
- Allow-list edits happen in **one** Rust place; the asset scope must be kept in sync by hand
  (documented). Accepted because the list is quasi-stable — the cost/benefit of eliminating the
  duplicate at runtime did not justify the loss of auditability.
- Caveat: `$HOME` is broad (covers the whole home directory). Pragmatic, since users pick images
  anywhere under home; tightening it would also require narrowing the Rust roots.
- Discipline to uphold: any new allowed directory must be added to **both** `allowed_roots()` and the
  asset scope; a review must reject a CSP relaxation without a concrete need.

## Details

Source: `src-tauri/tauri.conf.json`, `src-tauri/capabilities/default.json`,
`src-tauri/src/domain/file/path.rs`.
