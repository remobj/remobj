# RemObj

Modern monorepo library scaffolding inspired by Vue.js patterns.

## Features

- **Monorepo Structure**: PNPM workspace with packages in `packages/*`
- **TypeScript Support**: Full TypeScript support with isolated declarations
- **Multiple Build Formats**: ESM, CJS, and UMD builds
- **Development Tools**: Built-in testing, type checking, and build tools
- **Environment Variables**: Support for `__DEV__`, `__TEST__`, `__VERSION__`, `__BROWSER__`

## Quick Start

```bash
npm install
npm run build
npm test
```

## Packages

- **@remobj/core** - Main package that re-exports all functionality
- **@remobj/shared** - Shared utilities used across packages
- **@remobj/add** - Addition functionality
- **@remobj/mul** - Multiplication functionality

[Get Started](/guide/) | [API Reference](/api/README)