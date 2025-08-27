# API Reference

Welcome to the RemObj API documentation. This reference covers all packages, functions, types, and interfaces available in RemObj.

## Core Packages

### [@remobj/core](/api/core/src/README)
The main package containing core RPC functionality:
- **[provide()](/api/core/src/functions/provide)** - Expose objects for remote access
- **[consume()](/api/core/src/functions/consume)** - Create proxies to remote objects
- **[createMultiplexedEndpoint()](/api/core/src/functions/createMultiplexedEndpoint)** - Share endpoints for multiple channels
- **[createWebsocketEndpoint()](/api/core/src/functions/createWebsocketEndpoint)** - WebSocket transport support

### [@remobj/web](/api/web/src/README)
Web-specific endpoints and utilities:
- **[windowEndpoint](/api/web/src/variables/windowEndpoint)** - PostMessage communication between windows
- **[createRTCEndpoint()](/api/web/src/functions/createRTCEndpoint)** - WebRTC data channel support
- **[getServiceWorkerEndpoint()](/api/web/src/functions/getServiceWorkerEndpoint)** - Service Worker communication

### [@remobj/node](/api/node/src/README)
Node.js-specific implementations:
- **[createNodeEndpoint()](/api/node/src/functions/createNodeEndpoint)** - Universal Node.js endpoint creation

## Utility Packages

### [@remobj/shared](/api/shared/src/README)
Shared utilities and type guards used across all packages:
- Type guards (`isObject`, `isFunction`, `isPromise`, etc.)
- String utilities (`camelize`, `hyphenate`, `capitalize`)
- Comparison utilities (`looseEqual`, `looseIndexOf`)
- Advanced TypeScript types

### [@remobj/weakbimap](/api/weakbimap/src/README)
Bidirectional weak map implementation:
- **[WeakBiMap](/api/weakbimap/src/classes/WeakBiMap)** - Memory-efficient bidirectional mapping

### [@remobj/devtools](/api/devtools/src/README)
Development tools and debugging:
- **[createDevToolsServer()](/api/devtools/src/functions/createDevToolsServer)** - Start DevTools server for RPC monitoring

## Quick Reference

### Basic Usage

```typescript
import { provide, consume } from '@remobj/core'

// Provider side
provide(api, endpoint)

// Consumer side
const remote = consume<APIType>(endpoint)
```

### Creating Endpoints

```typescript
// WebSocket
import { createWebsocketEndpoint } from '@remobj/core'
const endpoint = createWebsocketEndpoint(ws)

// Web Worker (from @remobj/web)
import { windowEndpoint } from '@remobj/web'
const endpoint = windowEndpoint(worker)

// Node.js
import { createNodeEndpoint } from '@remobj/node'
const endpoint = createNodeEndpoint(process)
```

### Type Definitions

Key types you'll work with:

- **[Remote\<T\>](/api/core/src/type-aliases/Remote)** - Type for remote proxy objects
- **[PostMessageEndpoint](/api/core/src/type-aliases/PostMessageEndpoint)** - Endpoint interface
- **[ConsumeConfig](/api/core/src/interfaces/ConsumeConfig)** - Consumer configuration
- **[ProvideConfig](/api/core/src/interfaces/ProvideConfig)** - Provider configuration

## Navigation Tips

- Use the sidebar to browse packages and their contents
- Each function/type page includes detailed documentation and examples
- Type definitions link to their dependencies for easy navigation
- Search functionality helps find specific APIs quickly

## Version Information

This documentation is generated from the source code and is always up-to-date with the latest version.