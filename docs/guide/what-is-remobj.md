---
title: What is Remobj?
description: Understanding the core concepts and purpose of Remobj
---

# What is Remobj?

Remobj is a zero-dependency TypeScript library that makes communication between different JavaScript execution contexts feel like local function calls. Whether you're working with Web Workers, iframes, ServiceWorkers, WebRTC data channels, or Node.js worker threads, Remobj provides a unified, type-safe API.

## The Problem

Modern web applications often need to run code in multiple contexts:

- **Web Workers** for CPU-intensive tasks without blocking the UI
- **ServiceWorkers** for offline functionality and caching
- **Iframes** for sandboxed content or third-party widgets
- **WebRTC** for peer-to-peer communication
- **Node.js processes** for server-side parallelization

Traditionally, communicating between these contexts requires verbose message passing:

```javascript
// In main thread
worker.postMessage({
  type: 'CALCULATE',
  id: 'req_123',
  data: { operation: 'add', args: [5, 3] }
})

worker.onmessage = (event) => {
  if (event.data.type === 'RESULT' && event.data.id === 'req_123') {
    console.log(event.data.result) // Finally get the result!
  }
}

// In worker
self.onmessage = (event) => {
  if (event.data.type === 'CALCULATE') {
    const { operation, args } = event.data.data
    let result
    
    switch (operation) {
      case 'add':
        result = args[0] + args[1]
        break
      // ... more cases
    }
    
    self.postMessage({
      type: 'RESULT',
      id: event.data.id,
      result
    })
  }
}
```

This approach has several problems:

- **Verbose and error-prone** - lots of boilerplate code
- **No type safety** - easy to make mistakes with message structure
- **Manual request/response handling** - you need to manage correlation IDs
- **Inconsistent APIs** - different contexts have different message APIs

## The Remobj Solution

Remobj eliminates all this complexity with two simple functions:

```typescript
// In main thread
import { consume } from '@remobj/core'

const worker = new Worker('./worker.js')
const calc = consume<Calculator>(worker)

const result = await calc.add(5, 3) // Clean, type-safe, async!
```

```typescript
// In worker
import { provide } from '@remobj/core'

const calculator = {
  add: (a: number, b: number) => a + b,
  multiply: (a: number, b: number) => a * b
}

provide(calculator, self)
```

## Key Benefits

### 🎯 **Simple API**
Just two functions: `provide()` to expose objects and `consume()` to use them remotely.

### 🔒 **Type Safety**
Full TypeScript support with automatic type inference. Your IDE knows exactly what methods are available and their signatures.

### 🚀 **Zero Dependencies**
No external dependencies, only 2.7kb gzipped. Uses pure browser/Node.js APIs under the hood.

### 🌐 **Universal**
Works with any PostMessage-compatible API. The same code works with Workers, iframes, WebRTC, and more.

### 🛡️ **Secure**
Built-in validation and protection against prototype pollution and other security issues.

### ⚡ **Fast**
Minimal overhead with optimized serialization and efficient message routing.

## How It Works

Remobj uses JavaScript Proxies to intercept method calls on consumed objects and automatically:

1. **Serialize** the method call and arguments
2. **Send** the message through the appropriate channel (PostMessage, WebRTC, etc.)
3. **Wait** for the response asynchronously
4. **Deserialize** the result and return it

All of this happens transparently - you just call methods as if they were local!

## Ecosystem

Remobj is designed as a modular ecosystem:

- **[@remobj/core](/api/core/)** - The main library with `provide()` and `consume()`
- **[@remobj/web](/api/web/)** - Adapters for web APIs (WebRTC, WebSocket)
- **[@remobj/node](/api/node/)** - Adapters for Node.js (Worker Threads, Child Processes)
- **[@remobj/stream](/api/stream/)** - Stream utilities for data flow

This modular approach means you only include what you need, keeping bundle sizes minimal.

## When to Use Remobj

Remobj is perfect when you need to:

- **Offload work** to Web Workers without complex message passing
- **Communicate** with iframes in a type-safe way
- **Build** real-time applications with WebRTC
- **Scale** Node.js applications with worker processes
- **Create** consistent APIs across different execution contexts

## When Not to Use Remobj

Remobj might not be the right choice if you:

- **Need streaming data** (though [@remobj/stream](/api/stream/) can help)
- **Have simple, one-off messages** (raw PostMessage might be simpler)
- **Cannot use modern JavaScript** (Remobj requires Proxy support)
- **Need the absolute smallest bundle** (though 2.7kb is quite small!)

## Next Steps

Ready to get started? Head over to the [Getting Started](/guide/getting-started) guide to install Remobj and build your first cross-context application!