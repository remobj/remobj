# RemObj Library

[![CI Status](https://github.com/remobj/remobj/workflows/CI/badge.svg)](https://github.com/remobj/remobj/actions)
[![Coverage Status](https://coveralls.io/repos/github/remobj/remobj/badge.svg?branch=main)](https://coveralls.io/github/remobj/remobj?branch=main)
[![npm version](https://img.shields.io/npm/v/@remobj/core.svg)](https://www.npmjs.com/package/@remobj/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A modern monorepo library scaffolding based on Vue.js patterns, designed to support complex library architecture.

## 📦 Packages

| Package | Description |
|---------|-------------|
| [`@remobj/shared`](./packages/shared) | Shared utilities and helper functions |
| [`@remobj/add`](./packages/add) | Addition functionality |
| [`@remobj/mul`](./packages/mul) | Multiplication functionality |
| [`@remobj/core`](./packages/core) | Core package that re-exports all functionality |

## 🚀 Quick Start

```bash
# Install the core package
npm install @remobj/core

# Or install individual packages
npm install @remobj/shared @remobj/add @remobj/mul
```

```typescript
// Using the core package
import { isNumber, add, multiply } from '@remobj/core'

if (isNumber(5) && isNumber(3)) {
  console.log(add(5, 3)) // 8
  console.log(multiply(5, 3)) // 15
}

// Using individual packages
import { isNumber } from '@remobj/shared'
import { add } from '@remobj/add'
import { multiply } from '@remobj/mul'
```

## 🏗️ Architecture

This project implements modern monorepo patterns inspired by Vue.js:

- **Build System**: Rolldown-based with `__DEV__` variable support for tree-shaking
- **TypeScript**: Full type support with isolated declarations
- **Testing**: Vitest workspace configuration
- **Documentation**: VitePress v2 with auto-generated API docs from TypeDoc
- **Release**: Automated versioning and publishing
- **Development**: Hot reloading and watch mode support

### Tree-shaking Support

The library supports pure function annotations for optimal tree-shaking:

```typescript
// Functions marked with /*#__PURE__*/ will be eliminated if unused
export const getDefaultConfig = /*#__PURE__*/ () => ({
  debug: __DEV__,
  version: __VERSION__
})

## 🛠️ Development

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Build in development mode (includes __DEV__ code)
npm run dev

# Run tests
npm test

# Type checking
npm run typecheck

# Clean build artifacts
npm run clean

# Documentation
npm run docs:dev     # Start dev server
npm run docs:build   # Build documentation
npm run docs:full    # Full build + docs

# Testing with Coverage
npm run test:coverage # Run tests with coverage
npm run test:ui       # Interactive test UI
```

### Building Specific Packages

```bash
# Build specific package
npm run build shared

# Build multiple packages
npm run build shared add

# Build with specific formats
npm run build -- --formats esm,cjs
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests for specific package
npm test packages/shared
```

## 📋 Scripts

| Script | Description |
|--------|-------------|
| `build` | Build all packages in production mode with bundle analysis |
| `dev` | Build all packages in development mode |
| `test` | Run all tests |
| `test:coverage` | Run tests with code coverage report |
| `test:ui` | Run tests with interactive UI |
| `typecheck` | Run TypeScript type checking |
| `release` | Interactive release process |
| `clean` | Remove all build artifacts |
| `docs:generate` | Generate API documentation from TypeScript declarations |
| `docs:dev` | Start documentation development server |
| `docs:build` | Build documentation for production |
| `docs:full` | Build packages, generate docs, and build documentation |

## 🔄 Release Process

```bash
# Interactive release (recommended)
npm run release

# This will:
# 1. Check CI status
# 2. Run tests and build
# 3. Prompt for version bump
# 4. Update all package versions
# 5. Create git commit and tag
# 6. Generate changelog
```

## 🏛️ Project Structure

```
remobj/
├── packages/              # All packages
│   ├── shared/           # Shared utilities
│   ├── add/             # Addition functionality  
│   ├── mul/             # Multiplication functionality
│   └── core/            # Main package (re-exports)
├── scripts/             # Build and release scripts
├── docs/               # VitePress documentation
│   ├── .vitepress/     # VitePress configuration
│   ├── guide/          # User guides
│   └── api/            # Auto-generated API docs
├── .github/            # GitHub Actions workflows
└── CLAUDE.md           # AI assistant instructions
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run `npm test` and `npm run typecheck`
6. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🔒 Security

Please see [SECURITY.md](SECURITY.md) for our security policy and how to report vulnerabilities.

## 🙏 Acknowledgments

This project structure is inspired by [Vue.js](https://github.com/vuejs/core) and their excellent monorepo architecture patterns.