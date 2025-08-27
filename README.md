# RemObj

[![CI Status](https://github.com/remobj/remobj/workflows/CI/badge.svg)](https://github.com/remobj/remobj/actions)
[![Coverage](https://github.com/remobj/remobj/workflows/Code%20Coverage/badge.svg)](https://github.com/remobj/remobj/actions/workflows/coverage.yml)
[![codecov](https://codecov.io/gh/remobj/remobj/branch/main/graph/badge.svg)](https://codecov.io/gh/remobj/remobj)
[![npm version](https://img.shields.io/npm/v/@remobj/core.svg)](https://www.npmjs.com/package/@remobj/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A powerful JavaScript library for transparent remote object access and RPC (Remote Procedure Call) communication. RemObj enables seamless interaction with remote objects as if they were local, supporting multiple transport layers and advanced features like multiplexing and DevTools integration.

## 📦 Packages

| Package | Description |
|---------|-------------|
| [`@remobj/core`](./packages/core) | Core RPC functionality, provider/consumer pattern, and multiplexing |
| [`@remobj/shared`](./packages/shared) | Shared utilities, type guards, and garbage collection helpers |
| [`@remobj/weakbimap`](./packages/weakbimap) | Bidirectional weak map implementation for memory-efficient caching |
| [`@remobj/web`](./packages/web) | Web-specific endpoints for WebSockets, Web Workers, and MessagePort |
| [`@remobj/node`](./packages/node) | Node.js-specific endpoints for child processes and worker threads |
| [`@remobj/devtools`](./packages/devtools) | DevTools integration for debugging and monitoring RPC communication |

## 🚀 Quick Start

```bash
# Install the core package
npm install @remobj/core

# Or install specific packages
npm install @remobj/core @remobj/web  # For web applications
npm install @remobj/core @remobj/node # For Node.js applications
```

### Basic Usage

```typescript
import { createProvider, createConsumer, createEndpoint } from '@remobj/core'

// Provider side - expose an object
const api = {
  greet: (name: string) => `Hello, ${name}!`,
  calculate: async (a: number, b: number) => a + b
}

const provider = createProvider(api, endpoint1)

// Consumer side - access the remote object
const remote = createConsumer<typeof api>(endpoint2)

await remote.greet('World') // "Hello, World!"
await remote.calculate(5, 3) // 8
```

### Web Worker Example

```typescript
// main.js
import { createConsumer } from '@remobj/core'
import { createWebWorkerEndpoint } from '@remobj/web'

const worker = new Worker('./worker.js')
const endpoint = createWebWorkerEndpoint(worker)
const api = createConsumer<WorkerAPI>(endpoint)

const result = await api.heavyComputation(data)

// worker.js
import { createProvider } from '@remobj/core'
import { createWebWorkerEndpoint } from '@remobj/web'

const api = {
  heavyComputation: async (data) => {
    // Perform CPU-intensive work
    return processData(data)
  }
}

createProvider(api, createWebWorkerEndpoint(self))
```

## ✨ Features

- **Transparent RPC**: Access remote objects as if they were local
- **Multiple Transports**: WebSocket, Web Worker, MessagePort, Node.js child processes
- **TypeScript Support**: Full type safety for remote APIs
- **Multiplexing**: Share a single connection for multiple RPC channels
- **Memory Efficient**: Automatic garbage collection and weak references
- **DevTools Integration**: Monitor and debug RPC communication
- **Tree-shaking**: Optimized builds with dead code elimination
- **Extensible**: Plugin system for custom type serialization

## 🏗️ Architecture

RemObj uses a provider-consumer pattern for RPC communication:

1. **Provider**: Exposes local objects/functions for remote access
2. **Consumer**: Creates proxies to interact with remote objects
3. **Endpoint**: Handles message transport between provider and consumer
4. **Multiplexer**: Enables multiple RPC channels over a single connection

### Key Concepts

- **Endpoints**: Abstract transport layer (WebSocket, Worker, MessagePort, etc.)
- **Wrapping**: Transform arguments/returns for serialization
- **Multiplexing**: Multiple logical channels over one physical connection
- **Garbage Collection**: Automatic cleanup of unused remote references

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
├── packages/            # All packages
│   ├── core/           # Core RPC functionality
│   ├── shared/         # Shared utilities
│   ├── weakbimap/      # Bidirectional weak map
│   ├── web/            # Web-specific endpoints
│   ├── node/           # Node.js-specific endpoints
│   └── devtools/       # DevTools integration
├── scripts/            # Build and release scripts
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