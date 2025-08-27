# @remobj/node

Node.js specific implementations for RemObj. Provides endpoints for child processes, worker threads, and other Node.js communication patterns.

## Installation

```bash
npm install @remobj/node @remobj/core
```

**Requirements**: Node.js >= 18.0.0

## Key Features

- **Worker Thread Support**: Communication with Node.js worker threads
- **Child Process Support**: Communication with spawned child processes  
- **Generic Node Endpoint**: Works with any Node.js object that implements the message passing pattern
- **DevTools Integration**: Automatic debugging and tracing support
- **Memory Management**: Automatic cleanup of event listeners on garbage collection

## Basic Usage

### Worker Threads

```typescript
import { Worker } from 'worker_threads'
import { createNodeEndpoint } from '@remobj/node'
import { provide, consume } from '@remobj/core'

// Main thread - provide API to worker
const api = {
  processData: async (data: number[]) => {
    return data.map(x => x * 2)
  },
  getConfig: () => ({ version: '1.0', debug: true })
}

const worker = new Worker('./worker.js')
const endpoint = createNodeEndpoint(worker, 'main-to-worker')

provide(api, endpoint)

// In worker.js - consume main thread API
import { parentPort } from 'worker_threads'
import { createNodeEndpoint } from '@remobj/node'
import { consume } from '@remobj/core'

if (parentPort) {
  const endpoint = createNodeEndpoint(parentPort, 'worker-to-main')
  const mainAPI = consume<typeof api>(endpoint)
  
  // Use the remote API
  const result = await mainAPI.processData([1, 2, 3, 4])
  console.log(result) // [2, 4, 6, 8]
  
  const config = await mainAPI.getConfig()
  console.log(config) // { version: '1.0', debug: true }
}
```

### Child Processes

```typescript
import { spawn } from 'child_process'
import { createNodeEndpoint } from '@remobj/node'
import { provide, consume } from '@remobj/core'

// Parent process - communicate with child
const child = spawn('node', ['./child.js'], { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

const api = {
  calculate: (a: number, b: number) => a + b,
  getProcessInfo: () => ({ pid: process.pid, cwd: process.cwd() })
}

const endpoint = createNodeEndpoint(child, 'parent-to-child')
provide(api, endpoint)

// In child.js - consume parent API  
import { createNodeEndpoint } from '@remobj/node'
import { consume } from '@remobj/core'

if (process.send) {
  const endpoint = createNodeEndpoint(process, 'child-to-parent')
  const parentAPI = consume<typeof api>(endpoint)
  
  const result = await parentAPI.calculate(5, 3)
  console.log('Calculation result:', result) // 8
  
  const info = await parentAPI.getProcessInfo()
  console.log('Parent process info:', info)
}
```

### Bidirectional Communication

```typescript
import { Worker } from 'worker_threads'
import { createNodeEndpoint } from '@remobj/node'
import { provide, consume } from '@remobj/core'

// Main thread
const mainAPI = {
  log: (message: string) => console.log(`[MAIN] ${message}`),
  getTimestamp: () => Date.now()
}

const worker = new Worker('./bidirectional-worker.js')
const endpoint = createNodeEndpoint(worker, 'bidirectional')

// Both provide and consume on same endpoint
provide(mainAPI, endpoint)
const workerAPI = consume<WorkerAPI>(endpoint)

// Use worker's API
await workerAPI.heavyComputation(1000000)

// In bidirectional-worker.js
import { parentPort } from 'worker_threads'
import { createNodeEndpoint } from '@remobj/node'
import { provide, consume } from '@remobj/core'

interface WorkerAPI {
  heavyComputation: (iterations: number) => Promise<number>
  getWorkerInfo: () => { threadId: number }
}

const workerAPI: WorkerAPI = {
  heavyComputation: async (iterations) => {
    // Use main thread's logging
    await mainAPI.log(`Starting computation with ${iterations} iterations`)
    
    let result = 0
    for (let i = 0; i < iterations; i++) {
      result += Math.random()
    }
    
    await mainAPI.log(`Computation completed: ${result}`)
    return result
  },
  getWorkerInfo: () => ({ threadId: require('worker_threads').threadId })
}

if (parentPort) {
  const endpoint = createNodeEndpoint(parentPort, 'bidirectional')
  
  // Both provide and consume
  provide(workerAPI, endpoint)
  const mainAPI = consume<typeof mainAPI>(endpoint)
}
```

## Advanced Usage

### Custom Node Endpoints

The `createNodeEndpoint` function works with any object that implements the Node.js message pattern:

```typescript
import { createNodeEndpoint, type NodeEndpoint } from '@remobj/node'

// Any object with this interface can be used
interface NodeEndpoint {
  postMessage(message: any, transfer?: any[]): void
  on(type: string, listener: (data: any) => void): void
  off(type: string, listener: (data: any) => void): void
}

// Custom implementation
class CustomMessenger implements NodeEndpoint {
  private listeners = new Map<string, Set<Function>>()
  
  postMessage(message: any) {
    // Custom message handling
    this.emit('message', message)
  }
  
  on(event: string, listener: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(listener)
  }
  
  off(event: string, listener: Function) {
    this.listeners.get(event)?.delete(listener)
  }
  
  private emit(event: string, data: any) {
    this.listeners.get(event)?.forEach(listener => listener(data))
  }
}

const messenger = new CustomMessenger()
const endpoint = createNodeEndpoint(messenger, 'custom')
```

### Error Handling and Timeouts

```typescript
import { createNodeEndpoint } from '@remobj/node'
import { consume } from '@remobj/core'

const endpoint = createNodeEndpoint(worker, 'error-handling')
const api = consume(endpoint, { 
  timeout: 5000, // 5 second timeout
  name: 'WorkerAPI'
})

try {
  const result = await api.riskyOperation()
} catch (error) {
  if (error.message.includes('timeout')) {
    console.error('Operation timed out')
  } else {
    console.error('Remote error:', error)
  }
}
```

## Main Exports

### Functions
- `createNodeEndpoint(target, name?)` - Create endpoint from Node.js message-passing object

### Types  
- `NodeEndpoint` - Interface for Node.js message-passing objects

## Memory Management

The `createNodeEndpoint` function automatically handles cleanup:

- Event listeners are automatically removed when the endpoint is garbage collected
- Uses weak references to prevent memory leaks
- Integrates with RemObj's garbage collection utilities

## DevTools Integration

All Node endpoints automatically integrate with RemObj's DevTools:

- Message tracing and logging  
- Performance monitoring
- RPC call visualization
- Automatic trace ID generation

DevTools integration is enabled in development mode and can be enabled in production by setting the `__PROD_DEVTOOLS__` flag.

## Repository

Part of the [RemObj monorepo](https://github.com/remobj/remobj). For more information, examples, and documentation, visit the main repository.

## License

MIT