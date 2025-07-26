# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Rush monorepo containing the remobj TypeScript library ecosystem. Remobj (Remote Object) is a zero-dependency TypeScript library for seamless cross-context communication between Web Workers, iframes, ServiceWorkers, WebRTC, and more. It provides type-safe RPC-like functionality using PostMessage APIs.

The main package is `@remobj/core` located in `packages/core/`, which is the core TypeScript library that enables communication between different JavaScript execution contexts to feel like local function calls.

## Architecture

- **Monorepo Structure**: Uses Rush.js (v5.156.0) for monorepo management with pnpm (v8.15.8)
- **Package Organization**: Projects are organized under `packages/` directory
- **Core Library**: `@remobj/core` provides the foundational communication primitives
- **TypeScript First**: Full TypeScript support with automatic type inference
- **Zero Dependencies**: Pure browser APIs, no external runtime dependencies

Key architectural components:
- **PostMessage Endpoints**: Standardized interfaces for various communication mechanisms
- **Remote Object API**: High-level RPC with `provide()` and `consume()` functions  
- **Stream Utilities**: Bidirectional data flow through ReadableStream/WritableStream
- **Web API Adapters**: Converts WebRTC DataChannels, WebSockets to unified interfaces
- **Security Layer**: Input validation and prototype pollution protection
- **DevTools Integration**: Optional development and debugging tools via `@remobj/dev-core`

## Development Commands

### Repository-Level Commands (Rush)
```bash
# Install all dependencies and link packages
rush update

# Build all packages
rush build

# Rebuild all packages from scratch
rush rebuild

# Run tests across all packages
rush test
```

### Package-Level Commands (for @remobj/core)
```bash
# Navigate to core package
cd packages/core

# Development server with hot reload
npm run dev

# Build the library (includes TypeScript compilation, API extraction, and docs generation)
npm run build

# Run tests with Vitest
npm run test

# Generate API documentation
npm run api-extract
npm run api-docs
```

### Build Process
The build process for @remobj/core includes:
1. `vite build` - Bundles the library
2. `tsc --emitDeclarationOnly` - Generates TypeScript declarations
3. `api-extractor run` - Creates API documentation from TypeScript
4. `api-documenter markdown` - Generates markdown API docs

## Key Files and Structure

```
remobj/
├── rush.json              # Rush configuration and project inventory
├── common/                # Rush shared configuration
│   ├── config/rush/       # Rush-specific settings
│   └── scripts/           # Installation scripts
└── packages/
    └── core/              # Main @remobj/core package
        ├── src/           # TypeScript source code
        │   ├── index.ts   # Main entry point with exports
        │   ├── endpoint.ts       # PostMessage endpoint interfaces
        │   ├── remoteObject.ts   # Core provide/consume functionality
        │   ├── stream.ts         # Stream utilities
        │   ├── logging.ts        # Debug logging utilities
        │   └── adapter/          # Web API adapters
        ├── tests/         # Vitest test files
        ├── docs/api/      # Generated API documentation
        ├── dist/          # Built output
        └── lib/           # Generated TypeScript declarations
```

## Development Guidelines

### Code Style
- TypeScript is required for all source code
- Use ESM imports/exports exclusively
- Maintain strict type safety - avoid `any` types
- Follow existing naming conventions for consistency
- Include JSDoc comments for public APIs

### Testing
- Tests are written using Vitest and located in `tests/` directory
- Run tests with `npm run test` from the core package directory
- Tests cover both unit functionality and integration scenarios
- Focus on type safety, error handling, and cross-context communication

### API Documentation
- API documentation is auto-generated using Microsoft API Extractor
- Source code comments become part of the public API documentation
- Use TypeScript interfaces to define clear API contracts
- Update API docs with `npm run api-docs` after changes

### Security Considerations
- All communication uses structured clone serialization
- Input validation prevents malformed messages
- Prototype pollution protection is built-in
- Only explicitly exposed functions are callable remotely

This codebase focuses on providing developer-friendly, type-safe cross-context communication with zero runtime dependencies and comprehensive TypeScript support.

## DevTools Integration

The remobj ecosystem includes comprehensive development tools for debugging and monitoring PostMessage communication.

### Core DevTools (`packages/core/src/devtools.ts`)

DevTools are built directly into the core package and controlled by build flags:

- **`__DEV__`**: Automatically enabled in development mode (when `NODE_ENV !== 'production'`)
- **`__PROD_DEVTOOLS__`**: Explicitly enables devtools in production builds

**IMPORTANT: Build-Time Flags**
These flags work differently in development vs production:

**For Library Development (local):**
- During local development and testing, `__DEV__` is replaced with `true`
- This enables devtools and debugging features automatically

**For Library Users (npm package):**
- The npm package preserves `__DEV__` and `__PROD_DEVTOOLS__` as variables
- Users can control these flags in their own build process
- Common bundler configurations:
  - Webpack: Use `DefinePlugin`
  - Vite: Use `define` option
  - Rollup: Use `@rollup/plugin-replace`
- This allows users to enable/disable devtools based on their environment
- Users typically set `__DEV__: process.env.NODE_ENV !== 'production'`

### Enhanced Debugging Information

When enabled, all PostMessage communication includes comprehensive debugging data:

```typescript
interface ProxyMessage {
  type: `EP_EVENT_${'send' | 'receive'}`;
  id: string;           // Unique endpoint identifier
  timestamp: number;    // Message timestamp
  message: any;         // The actual message data
  stackTrace?: string;  // Captured stack trace for debugging
  messageId?: string;   // ID from the actual message for request/response tracking
  platform?: string;   // Browser UserAgent or Node/Deno/Bun version
  language?: string;    // Programming language (e.g., 'js', 'ts')
}
```

### Platform Detection

The devtools automatically detect the runtime environment:
- **Browser**: Uses `navigator.userAgent` for detailed browser information
- **Node.js**: Extracts version from `process.versions.node`
- **Deno**: Detects Deno runtime and version
- **Bun**: Detects Bun runtime and version

### Stack Trace Capture

Stack traces are captured for every message with intelligent filtering:
- Removes internal devtools calls (`forwardToMonitor`, `createProxyEndpoint`, etc.)
- Preserves meaningful application stack frames
- Gracefully handles environments where stack traces aren't available

### Monitor Endpoint Integration

```typescript
import { setMonitorEndpoint, createProxyEndpoint } from '@remobj/core';

// Set up monitoring endpoint (typically a BroadcastChannel)
const monitorChannel = new BroadcastChannel('remobj-devtools');
setMonitorEndpoint(monitorChannel);

// All endpoints are automatically wrapped when devtools are enabled
const worker = new Worker('./worker.js');
const api = consume<MyAPI>(worker); // Automatically monitored
```

### DevTools Monitoring Package (`@remobj/dev-core`)

Located in `devtools/core/`, this package provides Vue reactive monitoring:

```typescript
import { createMonitor } from '@remobj/dev-core';

const monitorChannel = new BroadcastChannel('remobj-devtools');
const monitor = createMonitor(monitorChannel);

// Reactive data automatically updates
console.log(monitor.connections.value); // All endpoint connections
console.log(monitor.messages.value);    // All intercepted messages
console.log(monitor.data.value);        // All raw event data
```

### Key Features

- **Zero Runtime Overhead**: Completely disabled when flags are off
- **Type-Safe Monitoring**: Full TypeScript support in monitoring APIs
- **Cross-Platform**: Works in browsers, Node.js, Deno, and Bun
- **Vue Reactive**: Monitor data is reactive for building debugging UIs
- **Stack Trace Preservation**: Maintains debugging context across RPC boundaries
- **Request/Response Correlation**: Links messages using message IDs

## TODO Workflow

- **TODO.md**: Contains tasks that need to be completed. The user adds new todos here, and Claude processes them
- **DONE.md**: Contains completed tasks. When a todo is finished, Claude moves it from TODO.md to DONE.md
- **Important**: Claude should not write to TODO.md or DONE.md files directly, only move completed items from TODO to DONE