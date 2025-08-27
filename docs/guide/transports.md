# Transport Types

RemObj supports various transport mechanisms for different environments and use cases.

## Web Transports

### Web Workers

The most common use case for offloading CPU-intensive tasks:

```typescript
import { provide, consume } from '@remobj/core'
import { createWebWorkerEndpoint } from '@remobj/web'

// In worker.js
const endpoint = createWebWorkerEndpoint(self)
provide(api, endpoint)

// In main thread
const worker = new Worker('./worker.js', { type: 'module' })
const endpoint = createWebWorkerEndpoint(worker)
const remote = consume(endpoint)
```

### Service Workers

For background processing and caching:

```typescript
import { createServiceWorkerEndpoint } from '@remobj/web'

// In service worker
const endpoint = createServiceWorkerEndpoint(self)
provide(cacheAPI, endpoint)

// In main app
const registration = await navigator.serviceWorker.register('./sw.js')
const endpoint = createServiceWorkerEndpoint(registration)
const cache = consume(endpoint)
```

### iFrames

For sandboxed execution:

```typescript
import { createWindowEndpoint } from '@remobj/web'

// In iframe
const endpoint = createWindowEndpoint(window.parent, '*')
provide(sandboxAPI, endpoint)

// In parent
const iframe = document.querySelector('iframe')
const endpoint = createWindowEndpoint(iframe.contentWindow, '*')
const sandbox = consume(endpoint)
```

### WebSockets

For client-server communication:

```typescript
import { createWebsocketEndpoint } from '@remobj/core'

// Client
const ws = new WebSocket('ws://localhost:8080')
const endpoint = createWebsocketEndpoint(ws)
const api = consume(endpoint)

// Server (Node.js)
import { WebSocketServer } from 'ws'

const wss = new WebSocketServer({ port: 8080 })
wss.on('connection', (ws) => {
  const endpoint = createWebsocketEndpoint(ws)
  provide(serverAPI, endpoint)
})
```

## Node.js Transports

### Child Processes

For CPU isolation and fault tolerance:

```typescript
import { fork } from 'child_process'
import { createChildProcessEndpoint } from '@remobj/node'

// Parent process
const child = fork('./child.js')
const endpoint = createChildProcessEndpoint(child)
const remote = consume(endpoint)

// Child process
const endpoint = createChildProcessEndpoint(process)
provide(childAPI, endpoint)
```

### Worker Threads

For true parallelism in Node.js:

```typescript
import { Worker } from 'worker_threads'
import { createWorkerThreadEndpoint } from '@remobj/node'

// Main thread
const worker = new Worker('./worker.js')
const endpoint = createWorkerThreadEndpoint(worker)
const remote = consume(endpoint)

// Worker thread
import { parentPort } from 'worker_threads'
const endpoint = createWorkerThreadEndpoint(parentPort)
provide(workerAPI, endpoint)
```

## Custom Endpoints

You can create custom endpoints for any message-passing interface:

```typescript
import { PostMessageEndpoint } from '@remobj/core'

class CustomEndpoint implements PostMessageEndpoint {
  addEventListener(event: 'message', listener: (event: MessageEvent) => void): void {
    // Implement message listening
  }
  
  removeEventListener(event: 'message', listener: (event: MessageEvent) => void): void {
    // Implement listener removal
  }
  
  postMessage(message: any): void {
    // Implement message sending
  }
}

const endpoint = new CustomEndpoint()
provide(api, endpoint)
```

## Connection Patterns

### One-to-One

Standard pattern where one provider serves one consumer:

```typescript
// Provider
provide(api, endpoint)

// Consumer
const remote = consume(endpoint)
```

### One-to-Many (Broadcast)

One provider serving multiple consumers:

```typescript
// Provider
provide(api, broadcastEndpoint)

// Multiple consumers
const remote1 = consume(endpoint1)
const remote2 = consume(endpoint2)
```

### Many-to-One (Load Balancing)

Multiple providers behind a single consumer interface:

```typescript
// Multiple workers
workers.forEach(worker => {
  const endpoint = createWebWorkerEndpoint(worker)
  provide(api, endpoint)
})

// Consumer with load balancer
const remote = consume(loadBalancerEndpoint)
```

## Choosing the Right Transport

| Transport | Use Case | Pros | Cons |
|-----------|----------|------|------|
| Web Worker | CPU-intensive tasks | True parallelism, no UI blocking | Limited API access |
| Service Worker | Background tasks, caching | Runs in background, intercepts requests | Complex lifecycle |
| iframe | Sandboxing, third-party code | Security isolation | Performance overhead |
| WebSocket | Real-time, bidirectional | Server communication | Network dependency |
| Child Process | System tasks, isolation | Full Node.js API, fault isolation | Memory overhead |
| Worker Thread | Parallel processing | Shared memory possible | Node.js only |

## Performance Considerations

### Serialization

RemObj automatically handles serialization, but be aware of limitations:

```typescript
// ✅ These work fine
const api = {
  processData: (data: number[]) => data.map(x => x * 2),
  getUserInfo: () => ({ name: 'John', age: 30 })
}

// ❌ These won't work (non-serializable)
const api = {
  returnFunction: () => () => 'Hello',  // Functions can't be serialized
  returnMap: () => new Map(),           // Maps need special handling
  returnSymbol: () => Symbol('test')    // Symbols can't be serialized
}
```

### Message Size

Large messages can impact performance:

```typescript
// Consider chunking for large data
const api = {
  processLargeData: async function* (data: ArrayBuffer) {
    const chunkSize = 1024 * 1024 // 1MB chunks
    for (let i = 0; i < data.byteLength; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize)
      yield await processChunk(chunk)
    }
  }
}
```

## Next Steps

- Learn about [multiplexing](./multiplexing) for multiple channels
- Explore [error handling](./error-handling) strategies
- Set up [DevTools](./devtools) for debugging