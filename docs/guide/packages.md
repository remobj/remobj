---
title: "Package Overview"
description: "Understanding the Remobj ecosystem and package structure"
---

# Package Overview

Remobj is designed as a modular ecosystem of packages, each serving a specific purpose. This guide explains the different packages and how they work together.

## Core Package

### [@remobj/core](/api/core/)

The foundation of the Remobj ecosystem, providing the core `provide()` and `consume()` functions.

**Size**: ~2.7KB gzipped  
**Dependencies**: Zero  
**Environments**: Browser, Node.js, Web Workers, ServiceWorkers

```bash
npm install @remobj/core
```

**Key Features:**
- Core `provide()` and `consume()` functions
- PostMessage endpoint abstraction
- Type-safe communication
- Error propagation
- Built-in security features

**Basic Usage:**
```typescript
import { provide, consume } from '@remobj/core'

// Provide an API
const api = { greet: (name: string) => `Hello, ${name}!` }
provide(api, worker)

// Consume an API
const remote = consume<typeof api>(worker)
const greeting = await remote.greet('World')
```

## Web Adapters

### [@remobj/web](/api/web/)

Adapters for web-specific APIs that don't natively support PostMessage.

**Size**: ~1.5KB gzipped  
**Dependencies**: @remobj/core  
**Environments**: Browser only

```bash
npm install @remobj/web
```

**Key Features:**
- WebRTC DataChannel adapter
- WebSocket adapter  
- Stream utilities for browser APIs

**WebRTC Example:**
```typescript
import { dataChannelToPostMessage } from '@remobj/web'
import { provide } from '@remobj/core'

// Convert WebRTC DataChannel to PostMessage endpoint
const peerConnection = new RTCPeerConnection()
const dataChannel = peerConnection.createDataChannel('remobj')
const endpoint = dataChannelToPostMessage(dataChannel)

// Now use it like any other endpoint
provide(api, endpoint)
```

**WebSocket Example:**
```typescript
import { webSocketToPostMessage } from '@remobj/web'
import { consume } from '@remobj/core'

const ws = new WebSocket('ws://localhost:8080')
const endpoint = webSocketToPostMessage(ws)

const remote = consume<RemoteAPI>(endpoint)
```

## Node.js Adapters

### [@remobj/node](/api/node/)

Adapters for Node.js-specific communication mechanisms.

**Size**: ~2.1KB gzipped  
**Dependencies**: @remobj/core  
**Environments**: Node.js only

```bash
npm install @remobj/node
```

**Key Features:**
- Worker Threads adapter
- Child Process adapter
- TCP Socket adapter
- Stream utilities for Node.js APIs

**Worker Threads Example:**
```typescript
import { workerThreadToPostMessage } from '@remobj/node'
import { provide } from '@remobj/core'
import { Worker } from 'worker_threads'

const worker = new Worker('./worker.js')
const endpoint = workerThreadToPostMessage(worker)

provide(api, endpoint)
```

**Child Process Example:**
```typescript
import { childProcessToPostMessage } from '@remobj/node'
import { consume } from '@remobj/core'
import { fork } from 'child_process'

const child = fork('./child.js')
const endpoint = childProcessToPostMessage(child)

const remote = consume<ChildAPI>(endpoint)
```

## Stream Utilities

### [@remobj/stream](/api/stream/)

Utilities for streaming data between contexts using ReadableStream/WritableStream APIs.

**Size**: ~1.8KB gzipped  
**Dependencies**: @remobj/core  
**Environments**: Browser, Node.js (with polyfill)

```bash
npm install @remobj/stream
```

**Key Features:**
- PostMessage to Stream conversion
- Stream multiplexing
- Backpressure handling
- Transform stream utilities

**Basic Streaming:**
```typescript
import { postMessageToStream, streamToPostMessage } from '@remobj/stream'

// Convert PostMessage endpoint to streams
const { readable, writable } = postMessageToStream(worker)

// Write data
const writer = writable.getWriter()
await writer.write({ type: 'data', payload: 'Hello' })

// Read data
const reader = readable.getReader()
const { value } = await reader.read()
```

**Stream Multiplexing:**
```typescript
import { multiplexStreams } from '@remobj/stream'

// Create multiple streams over single PostMessage channel
const streams = multiplexStreams(worker, ['channel1', 'channel2'])

// Use different channels for different data types
streams.channel1.writable.getWriter().write(userData)
streams.channel2.writable.getWriter().write(logData)
```

## Package Combinations

### Full Stack Application

For a complete web application with background processing:

```bash
npm install @remobj/core @remobj/web @remobj/stream
```

```typescript
// Main thread - handles UI and WebRTC
import { provide, consume } from '@remobj/core'
import { dataChannelToPostMessage } from '@remobj/web'
import { postMessageToStream } from '@remobj/stream'

// Web Worker - handles heavy computation
import { provide } from '@remobj/core'

// Service Worker - handles caching and offline
import { consume } from '@remobj/core'
```

### Node.js Microservices

For server-side applications with worker processes:

```bash
npm install @remobj/core @remobj/node @remobj/stream
```

```typescript
// Main process
import { provide } from '@remobj/core'
import { workerThreadToPostMessage, childProcessToPostMessage } from '@remobj/node'
import { multiplexStreams } from '@remobj/stream'

// Worker process
import { consume } from '@remobj/core'
```

### Browser-Only Application

For simple web applications without Node.js features:

```bash
npm install @remobj/core
# @remobj/web and @remobj/stream are optional
```

## Choosing the Right Packages

### Start with Core

Every Remobj application needs `@remobj/core`:

```typescript
import { provide, consume } from '@remobj/core'
```

This gives you everything needed for:
- Web Workers
- ServiceWorkers  
- iframes/windows
- MessageChannel/MessagePort

### Add Web Features

Install `@remobj/web` if you need:
- WebRTC peer-to-peer communication
- WebSocket connections
- Browser-specific streaming

### Add Node.js Support

Install `@remobj/node` if you're building:
- Node.js applications with Worker Threads
- Command-line tools with child processes
- Server applications with TCP sockets

### Add Streaming

Install `@remobj/stream` if you need:
- Large data transfers
- Real-time data streaming
- Backpressure handling
- Multiple data channels

## Bundle Size Considerations

Each package is designed to be tree-shakeable:

| Package | Size (gzipped) | Use Case |
|---------|----------------|----------|
| @remobj/core | ~2.7KB | Essential for all applications |
| @remobj/web | ~1.5KB | WebRTC, WebSocket adapters |
| @remobj/node | ~2.1KB | Node.js Worker Threads, processes |
| @remobj/stream | ~1.8KB | Streaming large datasets |

**Total for all packages**: ~8.1KB gzipped

This is still smaller than most single utility libraries, while providing comprehensive cross-context communication.

## Package Dependencies

```
@remobj/core (no dependencies)
├── @remobj/web (depends on @remobj/core)
├── @remobj/node (depends on @remobj/core)
└── @remobj/stream (depends on @remobj/core)
```

All non-core packages depend only on `@remobj/core`, so you can mix and match as needed.

## Version Compatibility

All packages follow semantic versioning and are released together:

- **Major versions** (1.x → 2.x): Breaking changes
- **Minor versions** (1.1 → 1.2): New features, backward compatible
- **Patch versions** (1.1.1 → 1.1.2): Bug fixes

**Recommendation**: Use the same version for all Remobj packages:

```json
{
  "dependencies": {
    "@remobj/core": "^1.0.0",
    "@remobj/web": "^1.0.0",
    "@remobj/node": "^1.0.0",
    "@remobj/stream": "^1.0.0"
  }
}
```

## Migration Between Packages

### From Core to Web

If you start with basic Web Workers and later need WebRTC:

```typescript
// Before - using core only
import { provide } from '@remobj/core'
provide(api, worker)

// After - adding WebRTC support
import { provide } from '@remobj/core'
import { dataChannelToPostMessage } from '@remobj/web'

provide(api, worker) // Existing worker still works
provide(api, dataChannelToPostMessage(dataChannel)) // New WebRTC
```

### From Core to Node.js

Moving from browser to Node.js:

```typescript
// Before - browser Web Worker
import { consume } from '@remobj/core'
const remote = consume<API>(worker)

// After - Node.js Worker Thread
import { consume } from '@remobj/core'
import { workerThreadToPostMessage } from '@remobj/node'
const remote = consume<API>(workerThreadToPostMessage(worker))
```

The API surface remains identical - only the endpoint creation changes.

## Next Steps

Now that you understand the package ecosystem:

- [Getting Started](./getting-started) - Install and set up your first project
- [API Reference](/api/core/) - Detailed documentation for each package
- [Examples](/examples/) - Real-world usage examples