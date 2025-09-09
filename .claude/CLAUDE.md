# Plume - Development Conventions & Best Practices

Immutable conventions and best practices guide for Plume development.

## Language Strategy

### Source Code & Development

- **ALWAYS** code in English (variables, functions, classes, comments)
- **ALWAYS** technical/dev documentation in English
- **NEVER** French in source code (international open source)

### Documentation & Communication

- **User documentation**: French priority (French target users)
- **TODO.md and personal files**: French (personal developer usage)
- **README.md and public docs**: English (open source)

### User Interface

- **UI texts**: French by default (French national market)
- **Future translation** planned for international expansion
- **Error messages**: French for end users

## Code Conventions

### Code Quality Rules (strict)

- **NEVER use `any`** - Always type explicitly
- **NEVER use `as` assertion** for renaming imports - If renaming needed, it's a naming problem
- **NEVER use `../../` imports** - Use `@` alias for imports from src/

#### Rust - Additional Strict Rules

- **NEVER use `as` for imports** - If conflict = architecture/naming problem to resolve
- **ALWAYS** use explicit names that naturally avoid conflicts
- **NEVER** work around conflicts - Solve them with better design
- **ALWAYS** use `crate::` imports for future flexibility
- **NEVER** use `super::` except in very specific cases
- **ALWAYS** separate business logic/infrastructure/commands with distinct names

### Validation & Types

#### TypeScript

- **Zod schemas** in each domain: `src/domain/{feature}/schema.ts`
- **Type inference** with convention: `export type ImageType = z.infer<typeof ImageSchema>`
- **Type suffix** for ALL inferred types (ex: `ImageSchema` → `ImageDataType`)
- **Entities**: `Entity` suffix if conflict with type (ex: `CompressionSettingsEntity`)
- **Never duplicate** type/schema

#### Rust

- **Architecture**: Pure functions + data (no objects/services)
- **Structures**: Simple names (`CompressionSettings`, `OutputFormat`)
- **Enums**: Descriptive names (`ImageStatus`, `CompressionStage`)
- **Functions**: Public in modules (`fn compress()`, `fn estimate()`)
- **Modules**: By responsibility (`engine.rs`, `store.rs`, `error.rs`)
- **Errors**: Grouped by domain (`error.rs` singular)
- **Idioms**: snake_case for fields/functions, PascalCase for types
- **Zero-cost abstractions**: Prefer composition over inheritance

### Domain Architecture

#### TypeScript (Object-oriented DDD)

- **Structure by feature**: `/domain/{feature}/{type}`
  - `{feature}/schema.ts` - Zod validation + types
  - `{feature}/entity.ts` - Business classes
  - `{feature}/service.ts` - Business logic
  - `{feature}/index.ts` - Public exports
- **toJSON() method** on all entities for serialization to POJO (UI)

#### Rust (modules + pure functions)

- **Structure by domain**: `/domain/{feature}/`
  - `{feature}/mod.rs` - Public re-exports (`pub use {...}`)
  - `{feature}/settings.rs` - Data structures
  - `{feature}/engine.rs` - Processing functions
  - `{feature}/store.rs` - Traits + persistence impls
  - `{feature}/error.rs` - Domain error enums
- **Data/behavior separation**: struct + free fn
- **Composition**: traits for extensibility

### React State & Logic

- **useCallback** for functions in dependencies
- **Atomic Design** for components (atoms → molecules → organisms → templates)
- **Clear separation** UI/logic/data
- **Custom hooks** to encapsulate complex logic
- **No inline objects/arrays** in props
- **Unique and stable keys** for lists

## Architectural Patterns

### Domain-Driven Design (TypeScript)

- **Structure by feature**: `/domain/{feature}/`
- **Entities** with encapsulated logic + `toJSON()` method
- **Services** for use cases
- **Zod schemas** for validation + type inference
- **Value Objects** for immutable data

### Functional Architecture (Rust)

- **Pure functions** + data structures (no objects)
- **Modules by responsibility** (engine.rs, store.rs, error.rs)
- **Composition via traits** for extensibility
- **Zero-cost abstractions**

## Release Management

### GitHub Releases Best Practices

- **ALWAYS** use draft releases for testing builds before publication
- **Test Linux dependencies** with draft releases to avoid public failures
- **Release workflow**: Draft → CI builds → Verify all platforms → Publish
- **Version tags**: Only create final tags after successful draft validation

```bash
# Correct workflow
gh release create v0.5.0 --draft --title "..." --notes "..."
# Wait for all CI builds to complete and verify
gh release edit v0.5.0 --draft=false  # Publish when ready
```

- **Linux dependencies**: Always verify new Tauri/system dependencies in CI
- **Multi-platform validation**: Ensure all target platforms build successfully
- **Release notes**: Include clear download instructions per platform
