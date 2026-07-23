# Plume — Roadmap

Themed backlog. **No version numbers and no ordering**: what ships in a given release is decided at
release time, not pre-committed here. Items are meant to be small enough to pick up individually.

The current version lives in `package.json` — the single source of truth, propagated by `pnpm bump`
(see [ADR-0006](./docs/adr/ADR-0006-versioning-release.md)). It is deliberately not repeated here.

---

## Bugs

- [ ] "Reveal in Finder" does nothing on macOS (`tauri-plugin-opener` / `outputPath` issue)
- [ ] "Open" buttons (folder icon) are not wired up — connect them or remove them
- [ ] Quality slider stays active when the output format is PNG, although oxipng is always lossless
- [ ] `compressImage(imageId)` compresses every pending image instead of the targeted one

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

- [ ] Cover the `startCompression` run itself — the guards and every other store action are tested,
      but the loop that drives a compression from start to finish is not. It interleaves the
      progress manager's timers with an awaited IPC call, so it needs fake timers plus a
      controllable `compressImage` promise
- [ ] Cover `size-prediction/service.ts` — its fallback table is the second answer to the question
      `commands/stats.rs` also answers, so a test would pin down what it is supposed to return

### Documentation

- [ ] Confirm the "options considered" in ADR-0001, 0003 and 0004 — these were reconstructed from
      the code, so the rationale and the rejected alternatives still need the original author's
      confirmation. ADR-0002 and ADR-0005 are already confirmed.
