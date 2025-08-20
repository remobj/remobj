# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RemObj is a modern monorepo library scaffolding inspired by Vue.js patterns. It demonstrates complex library architecture with proper TypeScript support, build system, and testing infrastructure.

## Architecture

- **Monorepo Structure**: PNPM workspace with packages in `packages/*`
- **Build System**: Rolldown-based with custom scripts supporting multiple formats (ESM, CJS, UMD)
- **TypeScript Compilation**: Uses `tsc` ONLY for typechecking (`npm run typecheck`). All builds use Rolldown with rolldown-plugin-dts
- **Global Variables**: Uses `__DEV__`, `__TEST__`, `__VERSION__`, `__BROWSER__` for environment-specific behavior
- **Package Dependencies**: Core package re-exports all functionality; shared utilities are used across packages
- **TypeScript**: Isolated declarations enabled with path mapping for workspace packages

## Key Commands

### Build Commands
- `npm run build` - Build all packages in production mode
- `npm run build <package>` - Build specific package (e.g., `npm run build shared`)
- `npm run build -- --formats esm,cjs` - Build with specific formats
- `npm run dev` - Build in development mode (enables `__DEV__` code)
- `npm run build:watch` - Build with watch mode

### Testing
- `npm test` - Run all tests using Vitest
- `npm run test:watch` - Run tests in watch mode
- `npm test packages/shared` - Run tests for specific package

### Type Checking
- `npm run typecheck` - Type check all packages
- `npm run typecheck:watch` - Type check with watch mode
- `npm run typecheck:build` - Type check build configuration

### Maintenance
- `npm run clean` - Remove all build artifacts
- `npm run release` - Interactive release process with version bumping

## Package Structure

Each package follows the same structure:
- `src/index.ts` - Main entry point
- `__tests__/index.spec.ts` - Test file
- `package.json` - Package configuration with optional `buildOptions`
- `dist/` - Generated build outputs

## Build System Details

The build system (`scripts/build.js`) supports:
- Multiple output formats (ESM, CJS, UMD) configurable per package
- Workspace alias resolution for internal package dependencies
- TypeScript declaration generation via rolldown-plugin-dts
- Environment-specific code paths using global variables
- Parallel building of packages and formats

## Testing Configuration

- Uses Vitest with workspace configuration (`vitest.workspace.ts`)
- Tests located in `packages/*/__tests__/**/*.spec.ts`
- Global test environment with workspace aliases
- Development mode enabled in tests (`__DEV__` and `__TEST__` true)
- Code coverage with V8 provider (80% thresholds)
- HTML, JSON, and text coverage reports

## Documentation System

The project uses VitePress v2 (alpha) with TypeDoc for auto-generated API documentation:

- **VitePress Configuration**: `docs/.vitepress/config.ts`
- **TypeDoc Configuration**: `typedoc.json`
- **API Documentation**: Automatically generated from TypeScript declarations
- **Navigation Generation**: `scripts/generate-vitepress-config.js` auto-updates VitePress sidebar

### Documentation Commands
- `npm run docs:generate` - Generate API docs from TypeScript declarations
- `npm run docs:dev` - Start VitePress development server
- `npm run docs:build` - Build documentation for production
- `npm run docs:full` - Complete build: packages → API docs → VitePress

### Testing Commands
- `npm test` - Run all tests
- `npm run test:coverage` - Run tests with coverage report (HTML + JSON + text)
- `npm run test:ui` - Interactive test UI with Vitest
- `npm run test:watch` - Watch mode for tests

### Bundle Analysis
- Build process automatically shows bundle sizes with Gzip/Brotli compression
- Displays per-package breakdown and total bundle sizes
- Insights on compression savings and format comparisons

### Tree-shaking Support

Pure functions can be annotated for elimination during bundling:

```typescript
// This function will be removed if its result is not used
export const config = /*#__PURE__*/ createConfig()
```

## Development Workflow

1. Install dependencies with `npm install` (uses PNPM workspaces)
2. Build packages with `npm run build` or `npm run dev`
3. Run type checking with `npm run typecheck`
4. Test with `npm test`
5. Use `npm run clean` to reset build state
6. Generate and view documentation with `npm run docs:dev`

## Adding New Functions/Features

When adding new functionality:

1. Add the implementation to the appropriate package in `packages/*/src/index.ts`
2. Ensure proper TypeScript types and JSDoc comments
3. Add corresponding tests in `packages/*/__tests__/`
4. Run `npm run build` to build all packages
5. Run `npm run docs:generate` to update API documentation
6. The VitePress navigation will be automatically updated

The documentation system will automatically discover and document new exports!

## Code Review Learnings & Architecture Decisions

### Performance Considerations
- The 5-minute provider timeout is intentional - supports long idle times, sporadic communication patterns, and various real-world scenarios
- WeakBiMap cleanup strategy uses operation counting (every 100 ops) to balance performance vs memory
- String-based property paths are used for RPC calls - consider caching for hot paths if performance issues arise
- DevTools integration should have feature flags for production builds to avoid performance impact
- Synchronous cleanup() in WeakBiMap size getter is intentional - correctness over performance

### Security & Input Validation
- **Origin validation is userland responsibility** - the library does not enforce origin checks
- Input validation needed: Add max length limits for strings/arrays in RPC messages to prevent memory exhaustion
- Property traversal attacks possible through prototype chain (`__proto__.constructor.constructor`) - needs recursive validation
- FORBIDDEN_PROPERTIES list prevents direct access but not indirect via prototypes
- pendingPromises has timeout mechanism - no DoS risk from unbounded growth

### Memory Management
- **Provider timeout (5 min) is by design** - many valid use cases require long-lived connections
- Circular references between proxy objects need careful handling with seen-sets to prevent infinite channel creation
- Event listeners in multiplexer may accumulate if channels aren't explicitly closed
- Race conditions possible in timeoutHandles cleanup - needs atomic operations
- The `registered` Set in provider only clears on gc-collect messages

### Developer Experience (DX)
- Error codes (E001-E011) are intentionally cryptic in production for size - consider exporting ERROR_CODES map for debugging
- Complex setup chains like `createArgumentWrappingEndpoint(createMultiplexedEndpoint(...))` provide flexibility but impact DX
- Plugin system exists but lacks documentation - see registerPlugin in rpc-wrapper.ts for extending type support
- Missing TypeScript support for dynamic property access in Remote<T> type

### Critical Issues to Fix
1. **Security**: Prototype chain traversal vulnerability  
2. **Memory**: Event listener accumulation in multiplexer
3. **Memory**: Circular proxy reference handling
4. ✅ **Race Condition**: timeoutHandles Map cleanup - Fixed with isSettled flag
5. **Performance**: Property path string splitting on every RPC call - Acceptable performance trade-off
6. **DX**: Error codes (E001-E011) - Keep cryptic for bundle size, document separately if needed
7. **Security**: Add input size validation for RPC messages