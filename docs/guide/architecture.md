# Architecture

RemObj demonstrates a modern monorepo architecture inspired by Vue.js patterns.

## Monorepo Structure

```
remobj/
├── packages/
│   ├── core/           # Main package (re-exports all)
│   ├── shared/         # Shared utilities
│   ├── add/            # Addition functionality
│   └── mul/            # Multiplication functionality
├── scripts/            # Build and development scripts
├── docs/               # VitePress documentation
└── tests/              # Global test configuration
```

## Build System

### Rolldown-Based Building

RemObj uses [Rolldown](https://rolldown.rs/) for building packages with support for:

- **Multiple Formats**: ESM, CJS, and UMD
- **Environment Variables**: `__DEV__`, `__TEST__`, `__VERSION__`, `__BROWSER__`
- **Workspace Aliases**: Internal package resolution
- **TypeScript Declarations**: Automatic .d.ts generation

### Build Formats

- **ESM Production** (`*.esm.js`): Optimized for production
- **ESM Bundler** (`*.bundler.js`): For bundler consumption  
- **UMD** (`*.umd.js`): Universal module for browsers

### Global Variables

Environment-specific code is controlled by compile-time constants:

```typescript
if (__DEV__) {
  console.log('Development mode')
}

console.log(`Version: ${__VERSION__}`)
```

## Package Dependencies

### Internal Dependencies

Packages can depend on each other using workspace references:

```json
{
  "dependencies": {
    "@remobj/shared": "workspace:*"
  }
}
```

### Core Package Strategy  

The `@remobj/core` package re-exports all other packages, providing a single entry point:

```typescript
export * from '@remobj/shared'
export * from '@remobj/add'  
export * from '@remobj/mul'
```

## TypeScript Configuration

### Isolated Declarations

RemObj uses TypeScript's `isolatedDeclarations` feature for:

- Fast parallel compilation
- Better type checking
- Reliable .d.ts generation

### Path Mapping

Workspace packages are mapped in `tsconfig.json`:

```json
{
  "paths": {
    "@remobj/shared": ["packages/shared/src"],
    "@remobj/add": ["packages/add/src"]
  }
}
```

## Testing

### Vitest Workspace

Each package has its own test suite using Vitest workspace configuration:

- Tests in `packages/*/__tests__/**/*.spec.ts`
- Shared test utilities
- Development environment enabled (`__DEV__` = true)