# Plume — Roadmap

Themed backlog. **No version numbers and no ordering**: what ships in a given release is decided at
release time, not pre-committed here. Items are meant to be small enough to pick up individually.

The current version lives in `package.json` — the single source of truth, propagated by `pnpm bump`
(see [ADR-0006](./docs/adr/ADR-0006-versioning-release.md)). It is deliberately not repeated here.

---

## Bugs

- [ ] Confirm "Reveal in Finder" works at runtime on macOS — the wiring is in place
      (`revealInFolder` → `revealItemInDir`, `opener:allow-reveal-item-in-dir` capability), so this is
      a manual verification, not a code fix. Close it once confirmed on a real macOS build

## Compression profiles

- [ ] Named presets replacing light / balanced / aggressive (e.g. Web, Archive, Print)
- [ ] Profile-aware output naming (`photo_web.webp`, `photo_archive.png`)
- [ ] Persist the last used profile across sessions

## Input & output

- [ ] Accept an entire folder as input (recursive scan, filtered by supported extensions)
- [ ] Output folder selection — choose where compressed files are written
- [ ] Collision-safe output naming (never overwrite an existing file → `photo (1).webp`). Scaffolding
      once existed (`generate_output_path` / `make_unique_filename`) but was never wired up and has
      been removed; revisit together with output folder selection. `resolve_output_path` in
      `domain/compression/naming.rs` is the single place that decides where a file lands
- [ ] Batch progress indicator — global "X of Y done"

## Performance

- [ ] Parallel compression for multi-image batches, with a concurrency limit

## Formats

- [ ] AVIF support
- [ ] Evaluate JPEG XL

---

## Technical debt

### Correctness

- [ ] Recalibrate progress timing edge cases — JPEG compression and very small PNGs are
      mis-estimated; revise the static fallback timings against real measurements
- [ ] Feed `pixel_count` into duration lookups. `compress_image` records it, but
      `get_progress_estimation` passes `None` (`commands/stats.rs`), so the DB still matches on
      size range alone — the accuracy ADR-0005 justifies is not yet effective
- [ ] Reconcile the two fallback estimates: `size-prediction/service.ts` keys off format pairs,
      `commands/stats.rs` off file size. Two answers to the same question

### Testing

- [ ] Cover the `startCompression` **batch loop** over several images — the single-image run is now
      tested through `runImageCompression` (via the `compressImage` tests, fake timers + a resolved
      IPC mock), but the loop that iterates every pending image and flips the batch to `completed` is
      still not exercised with more than one image
- [ ] Cover `size-prediction/service.ts` — its fallback table is the second answer to the question
      `commands/stats.rs` also answers, so a test would pin down what it is supposed to return

### Documentation

- [ ] Confirm the "options considered" in ADR-0001, 0003 and 0004 — these were reconstructed from
      the code, so the rationale and the rejected alternatives still need the original author's
      confirmation. ADR-0002 and ADR-0005 are already confirmed.

### Dependencies (major bumps — each its own tested commit, not folded into other work)

Rust crates a major behind. `philosophy §11` makes "latest stable" the default (a security posture,
not comfort), but a major carries breaking changes, so each is a deliberate, tested upgrade — never a
blind bump.

- [ ] `thiserror 1.0 → 2.x` — **low cost**. Plume uses only basic `#[error("…")]`; 2.0's breaking
      changes are mostly MSRV + attribute edge cases. The safest of the three to take first.
- [ ] `dirs 5.0 → 6.x` — **investigate before touching**. `dirs` resolves the app-data directory
      where the SQLite stats DB lives; 6.0 changed some per-platform path behaviour. A changed path
      would **orphan existing users' stats** — verify the resolved DB location is unchanged (or add a
      migration) before bumping.
- [ ] `rusqlite 0.30 → 0.32+` — **medium cost**. Bundled SQLite version bump plus a few signature
      changes; gains upstream SQLite patches.
