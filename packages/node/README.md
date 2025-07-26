# @remobj/node

**Node.js-specific adapters for remobj cross-context communication**

This package provides Node.js-specific adapters that convert server-side communication mechanisms into standardized PostMessageEndpoint or StreamEndpoint interfaces, enabling seamless integration with the remobj ecosystem in server environments.

[![npm version](https://badge.fury.io/js/@remobj/node.svg)](https://badge.fury.io/js/@remobj/node)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/@remobj/node)](https://bundlephobia.com/package/@remobj/node)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

## ⚡ Quick Start

```bash
npm install @remobj/node @remobj/core
```

**Basic Child Process Example:**

```typescript
// main.js
import { fork } from 'child_process'
import { childProcessToPostMessage } from '@remobj/node'
import { consume } from '@remobj/core'

const child = fork('./worker.js')
const endpoint = childProcessToPostMessage(child)
const api = consume(endpoint)

const result = await api.processData({ input: 'large dataset' })
```

```typescript
// worker.js
import { provide } from '@remobj/core'

const workerAPI = {
  processData: async (data) => {
    return { processed: data.input.toUpperCase() }
  }
}

provide(workerAPI, process)
```

## 🌟 Features

- **🚀 Node.js Integration** - Native support for Child Process, Worker Threads
- **🌐 Universal Compatibility** - Works with TCP sockets, Unix domain sockets, streams
- **🔒 Type-safe** - Complete TypeScript support with inference
- **🛡️ Secure** - Built-in validation and error handling
- **📦 Modular Design** - Import only what you need
- **🔄 Stream Support** - Bidirectional communication through Node.js streams

## 🚀 Installation

### NPM

```bash
npm install @remobj/node @remobj/core
```

### Yarn

```bash
yarn add @remobj/node @remobj/core
```

### PNPM

```bash
pnpm add @remobj/node @remobj/core
```

## 📖 Usage

### Child Process Communication

Perfect for CPU-intensive tasks in separate processes:

```typescript
// main.js
import { fork } from 'child_process'
import { childProcessToPostMessage } from '@remobj/node'
import { consume } from '@remobj/core'

const child = fork('./math-worker.js')
const endpoint = childProcessToPostMessage(child)
const math = consume(endpoint)

// Heavy computation without blocking main process
const primes = await math.calculatePrimes(10000)
const fibonacci = await math.fibonacci(40)
```

```typescript
// math-worker.js
import { provide } from '@remobj/core'

const mathAPI = {
  calculatePrimes(max) {
    const primes = []
    for (let i = 2; i <= max; i++) {
      if (this.isPrime(i)) primes.push(i)
    }
    return primes
  },

  isPrime(n) {
    if (n < 2) return false
    for (let i = 2; i <= Math.sqrt(n); i++) {
      if (n % i === 0) return false
    }
    return true
  },

  fibonacci(n) {
    if (n <= 1) return n
    return this.fibonacci(n - 1) + this.fibonacci(n - 2)
  }
}

provide(mathAPI, process)
```

### Worker Thread Communication

Use Worker Threads for parallel computation:

```typescript
// main.js
import { Worker } from 'worker_threads'
import { workerThreadToPostMessage } from '@remobj/node'
import { consume } from '@remobj/core'

const worker = new Worker('./compute-worker.js')
const endpoint = workerThreadToPostMessage(worker)
const compute = consume(endpoint)

const result = await compute.heavyComputation({ 
  dataset: largeDataArray,
  algorithm: 'ml-processing' 
})
```

```typescript
// compute-worker.js
import { provide } from '@remobj/core'
import { parentPort } from 'worker_threads'

const computeAPI = {
  async heavyComputation({ dataset, algorithm }) {
    // Intensive ML processing here
    const processed = await processWithML(dataset, algorithm)
    return { result: processed, metrics: getMetrics() }
  }
}

provide(computeAPI, parentPort)
```

### TCP Socket Communication

Enable communication over network sockets:

```typescript
// client.js
import { createConnection } from 'net'
import { socketToPostMessage } from '@remobj/node'
import { consume } from '@remobj/core'

const socket = createConnection({ port: 8080, host: 'localhost' })
const endpoint = socketToPostMessage(socket)
const serverAPI = consume(endpoint)

// JSON-serialized remote calls over TCP
const userData = await serverAPI.getUserData({ userId: 123 })
await serverAPI.updateUser(123, { name: 'Updated Name' })
```

```typescript
// server.js
import { createServer } from 'net'
import { socketToPostMessage } from '@remobj/node'
import { provide } from '@remobj/core'

const server = createServer((socket) => {
  const endpoint = socketToPostMessage(socket)
  
  const serverAPI = {
    async getUserData({ userId }) {
      return await database.users.findById(userId)
    },
    
    async updateUser(userId, updates) {
      return await database.users.update(userId, updates)
    }
  }
  
  provide(serverAPI, endpoint)
})

server.listen(8080)
```

### Node.js Streams

Convert Node.js streams to remobj-compatible interfaces:

```typescript
import { Readable, Writable } from 'stream'
import { nodeStreamsToStreamEndpoint } from '@remobj/node'
import { streamToPostMessage } from '@remobj/core'

const readable = new Readable({
  read() {
    this.push(`data-${Date.now()}`)
  }
})

const writable = new Writable({
  write(chunk, encoding, callback) {
    console.log('Received:', chunk.toString())
    callback()
  }
})

const streamEndpoint = nodeStreamsToStreamEndpoint(readable, writable)
const postMessageEndpoint = streamToPostMessage(streamEndpoint)
```

## 🔧 API Reference

### Core Functions

#### `childProcessToPostMessage(childProcess)`

Converts a Node.js Child Process to PostMessage interface.

```typescript
function childProcessToPostMessage(
  childProcess: ChildProcess
): PostMessageEndpoint
```

#### `workerThreadToPostMessage(worker)`

Converts a Node.js Worker Thread to PostMessage interface.

```typescript
function workerThreadToPostMessage(
  worker: Worker | MessagePort
): PostMessageEndpoint
```

#### `socketToPostMessage(socket)`

Converts a Node.js Socket to PostMessage interface with JSON serialization.

```typescript
function socketToPostMessage(
  socket: Socket
): PostMessageEndpoint
```

#### `nodeStreamsToStreamEndpoint(readable, writable)`

Converts Node.js streams to remobj StreamEndpoint.

```typescript
function nodeStreamsToStreamEndpoint(
  readable: Readable,
  writable: Writable
): StreamEndpoint
```

## 🔧 TypeScript Support

Full TypeScript support with automatic type inference:

```typescript
interface DatabaseAPI {
  getUser(id: number): Promise<User>
  createUser(data: CreateUserData): Promise<User>
  updateUser(id: number, updates: Partial<User>): Promise<User>
}

// Provider (Child Process)
const dbAPI: DatabaseAPI = {
  async getUser(id) { return await db.findById(id) },
  async createUser(data) { return await db.create(data) },
  async updateUser(id, updates) { return await db.update(id, updates) }
}
provide(dbAPI, process)

// Consumer (Main Process)
const child = fork('./db-worker.js')
const endpoint = childProcessToPostMessage(child)
const db = consume<DatabaseAPI>(endpoint) // ← Full type safety

const user = await db.getUser(123) // ✅ Type: Promise<User>
```

## 🌍 Node.js Support

| Node.js Version | Status |
|----------------|--------|
| 16.x | ✅ Full support |
| 18.x | ✅ Full support |
| 20.x | ✅ Full support |
| 22.x | ✅ Full support |

## 📚 Documentation

- **[Complete Documentation](https://remobj-docs.vercel.app)** - Comprehensive guides and API reference
- **[Node.js Guide](https://remobj-docs.vercel.app/guide/nodejs)** - Node.js-specific usage patterns
- **[Examples](https://remobj-docs.vercel.app/examples/nodejs)** - Real-world Node.js examples
- **[API Reference](https://remobj-docs.vercel.app/api/node)** - Complete API documentation

## 🤝 Contributing

We welcome contributions! See our [Contributing Guide](../../CONTRIBUTING.md) for details.

## 📄 License

MIT License - see [LICENSE](../../LICENSE) for details.

---

**@remobj/node** - Making Node.js cross-context communication simple and type-safe 🚀