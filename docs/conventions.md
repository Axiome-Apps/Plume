# Project conventions

Contextual decisions specific to Plume — the thresholds and local choices the generic architecture
(code-conform SSOT) deliberately leaves to each project. The SSOT defines *how to build*; this file
records *what this project decided* where several conforming options existed.

## Error strategy

Decision + rationale → [ADR-0008](./adr/ADR-0008-error-model.md). Operating rules:

- **Two families, always distinguished** (philosophy §5, `typescript.md` §6, `rust.md` §7): an
  **expected business failure** is a typed value on the signature; an **exceptional** fault (bug,
  dead dependency) throws / rejects and is caught at a boundary.
- **Frontier contract** — every Tauri command returns `Result<T, CommandError>`. `CommandError`
  (`src-tauri/src/commands/error.rs`) serializes to JS as `{ kind, message }`:
  - `kind` ∈ `validation | not_found | io | security | unsupported | internal` — a **stable** code,
    the only thing the frontend maps to a user-facing message. It must never change meaning.
  - `message` is a **controlled diagnostic** string (logs / dev), **never shown to the user** and
    never a raw internal error chain.
- **Domain errors** use `thiserror` (`CompressionError`, `FileError`, `StatsError`) and convert to
  `CommandError` via `From` at the command boundary — the command never re-formats a `String`.
  Infrastructure failures (DB) map to `kind = internal`.
- **Frontend** parses the rejection into a typed `CommandError` at the single IPC boundary
  (`src/lib/tauri.ts` → `CommandError.from`), then maps `kind` → i18n key (`src/domain/errors`,
  `commandErrorKey`). No string/substring matching.
- **`compress_image`** follows the same contract: success → `CompressionSummary`, failure →
  `Err(CommandError)`. There is **no** `success:false` payload channel.
- **UI**: expected errors are shown inline / as a toast for a transverse async op (a failed
  compression). Exceptional errors are caught by the root `ErrorBoundary`
  (`src/components/organisms/ErrorBoundary.tsx`).

## Rust lint posture

`src-tauri/Cargo.toml` carries a hard `[lints.clippy]` block (SSOT `rust.md` §2). Two levels:

- **Deny** — `unwrap_used`, `expect_used`, `panic`, `todo`, `dbg_macro`. A panic that skips the typed
  error boundary ([ADR-0008](./adr/ADR-0008-error-model.md)) is a defect, not a shortcut. The one
  legitimate bootstrap failure (`lib.rs`) is handled with `log::error!` + `std::process::exit`, not
  `expect`. `clippy.toml` re-allows `unwrap`/`expect`/`panic`/`dbg` **in tests only** — a panic is the
  intended failure signal there (`rust.md` §7 "unwrap()/expect() hors tests").
- **`pedantic = warn`** — enabled, with two **scoped, documented** deviations:
  - **Cast lints** (`cast_precision_loss`, `cast_possible_truncation`, `cast_sign_loss`) are allowed
    at **module level** in the numeric/FFI core (`engine.rs`, `stats.rs`, `connection.rs`,
    `commands/stats.rs`, `pipeline.rs`). Byte counts and image dimensions are cast between integer
    widths and f64 for ratio math and FFI buffer lengths; every flagged path is bounded by the
    image's in-memory size, so `try_from` would only add branches for impossible states. Scoped to
    those modules on purpose — new non-numeric code stays checked.
  - **Library-ergonomics lints** (`missing_errors_doc`, `must_use_candidate`, `doc_markdown`) are
    allowed **crate-wide** in `lib.rs`. They target the public API of a *published library*; Plume is
    an application with no downstream consumer, so the doc/annotation churn buys nothing
    (`philosophy §9` — contextual thresholds).
  - Remaining one-offs (`too_many_lines` on the inline seed-stats table, `match_same_arms` on the
    format-decision matrices, `trivially_copy_pass_by_ref` on `build_riff_chunk`'s `b"…"` literals,
    `float_cmp` on exact-literal test assertions) carry a **local `#[allow]` with an inline
    rationale** at the site.

`optimal_format_for_input` currently resolves every arm to WebP (a `match_same_arms` allow keeps the
per-input matrix explicit) — flagged as a `philosophy §4` anticipation smell to revisit if output
formats ever diverge, not resolved here.

## Concurrency & async

- **Single managed database connection** — one `DatabaseManager` is created in `setup` and shared as
  Tauri managed state (`State<'_, DatabaseManager>`), not opened per command. Its internal `Mutex`
  serializes SQLite access **from this instance**, so in-process commands cannot collide and the file
  is opened once. (It does not guard against a second app instance or an external process touching the
  file — it bounds *in-process* concurrency only.) The lock is never held across an `.await`:
  `with_connection` runs its closure synchronously, and `compress_image` saves the stat *after* the
  `spawn_blocking` await, not during. This is a deliberate revision of the earlier "no application
  state" stance: a shared DB handle is **infrastructure**, not domain state, and the per-command
  `Connection::open` alternative left the manager's `Mutex` vestigial.
- **`compress_image` runs on the blocking pool** — the command is `async` only to run off the main/UI
  thread; the work is CPU-bound with nothing to await, so `run_compression` is wrapped in
  `tauri::async_runtime::spawn_blocking` to keep it off the async-runtime workers (`rust.md` §8.1). Do
  **not** "simplify" it to a sync `fn` — that runs on the main thread and freezes the window.
- **Parallelism is bounded later, not now** — compression is currently serial (the store awaits each
  run). When it goes parallel (roadmap), a `tokio::sync::Semaphore` (~`num_cpus` permits) must cap how
  many compressions run at once; `spawn_blocking` alone does not bound concurrency. Adding the
  semaphore today would be dead code (`philosophy §4`). The **design is an open ADR decision**, not a
  settled one: the lighter option (the frontend keeps firing per-file `compress_image`, the backend
  acquires a semaphore permit per invoke — progress stays frontend-only, ADR-0002 preserved) is the
  default to weigh against a heavier backend queue + worker pool + progress events (which would revoke
  ADR-0002 and reintroduce an event bus, justified only if priority/retries/cross-job cancellation are
  needed). Whatever lands, it stays in `domain/compression/` (vertical slicing) — **not** a horizontal
  `services/` layer — and the orchestrator, if stateful, is an actor struct; the pure work stays the
  `run_compression` free function (no stateless "service" struct, `rust.md` §5).
- **No silent catch** — best-effort fallbacks (file info, estimation, progress duration, stat save,
  output cleanup) log the swallowed error rather than discarding it (`typescript.md` §6). Fire-and-
  forget promises carry a traced `.catch` (`typescript.md` §7); async store writes merge by id into
  the current state rather than overwriting a pre-await snapshot.

## Versioning & reproducibility

SSOT `philosophy §11` (INVARIANT): committed lockfile + strict CI install. Both lockfiles are
committed — `pnpm-lock.yaml` and `src-tauri/Cargo.lock` (a Tauri backend is a **binary**, so its lock
is versioned, not a library that lets the consumer impose one). The CI consumes them without
regenerating: `pnpm install --frozen-lockfile`, `cargo {clippy,test} --locked`.

- **The release build's `--locked` lives in the gate, not the build matrix.** `tauri-action`
  (`release.yml` build job) drives `tauri build`, which has no `--locked` flag. It is not needed there:
  the `gate` job runs `cargo clippy --locked` + `cargo test --locked` on the **same commit** and must
  be green before the matrix runs, so a `Cargo.lock` out of sync with `Cargo.toml` fails upstream and
  never reaches a binary. The matrix then builds from the same committed lock.
- **Node version — two mechanisms, two roles** (not redundant). Node is a **build-time** tool here:
  Plume ships a native binary, end users never install Node, so both signals target *contributors
  building from source*.
  - `.nvmrc` (`24`) is the **pin** — the one version dev and CI build on. CI reads it via
    `node-version-file: .nvmrc`; `nvm use` reads it locally. Chosen over `node-version-file:
    package.json` because `setup-node` resolves an `engines` *range* to the highest satisfying version
    available on the runner, which floats upward (a `>=22` range could pull a non-LTS Node 25) — a
    `.nvmrc` closes that.
  - `engines.node` (`>=22`) is the advisory **compat floor** ("does not run below 22"). It is not a
    guessed compatibility claim: it is inherited from the build toolchain — Vite 7 requires Node
    `>=22.12`. A range wide enough to include the current dev machine (Node 24) means no spurious
    engine warning locally.
  - Moving to a newer LTS = bump `.nvmrc` (and the floor if it rises), one line, tracked in the diff —
    like any intentional dependency upgrade.

## Local conventions (acted deviations from SSOT defaults)

- **No barrels (`index.ts` re-export files)** — every import targets the concrete file through the
  `@/` alias (`@/components/atoms/Button`, `@/domain/image/entity`). The SSOT already says "pas de
  barrel par défaut" (`typescript.md` §L602), so removing the aggregate and 1-2 file barrels is pure
  alignment; we also drop the multi-file *level* barrels the SSOT tolerates as a "convention saine"
  (`atomic-design.md` §L127) — the marginal grouped-import ergonomics did not justify a second import
  style. One consequence: a grouped `import { Button, Tooltip } from '@/components/atoms'` becomes one
  line per component. `@/` stays the **single** path alias — no `@components`/`@domain` granular
  aliases (a second convention would reintroduce the noise this removed). — `domain/file/path.rs` exposes `validate_safe_path`,
  `get_file_stem`, `allowed_roots` as module-level free functions, not methods on a `PathUtils`
  struct. A struct with no state is a mislabelled module (`rust.md` §5). SSOT-aligned.
- **No `as` aliases on imports** — `AGENTS.md` forbids `use … as …`; `rusqlite::Result` is referred
  to fully qualified instead of aliased to `SqlResult`.
- **Domain file naming** — concept folders use role-named lowercase files (`schema.ts`, `entity.ts`,
  `service.ts`) rather than the SSOT's `Concept.schema.ts` PascalCase. The folder already names the
  concept, so the prefix would stutter. Acted, coherent across the codebase.
- **Linter/formatter** — ESLint + Prettier rather than the SSOT default Biome. Pre-existing project
  choice; kept.
- **`no-redeclare` disabled** (`eslint.config.js`) — the `type X` + `const X` declaration-merging
  idiom (pure data + helpers) is valid TypeScript that the rule cannot model; the compiler already
  rejects genuine redeclarations.
