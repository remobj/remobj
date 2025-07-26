# @remobj/core

> Zero-dependency TypeScript library for seamless cross-context communication

[![npm version](https://img.shields.io/npm/v/@remobj/core.svg)](https://www.npmjs.com/package/@remobj/core)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/@remobj/core.svg)](https://bundlephobia.com/package/@remobj/core)

@remobj/core enables type-safe communication between Web Workers, iframes, ServiceWorkers, WebRTC DataChannels, and other JavaScript execution contexts. Experience remote function calls that feel like local ones, complete with TypeScript intellisense and error handling.

## ⚡ Quick Start

```bash
npm install @remobj/core
```

**Basic Example:**

```typescript
// main.ts
import { consume } from '@remobj/core'

const worker = new Worker('./worker.js')
const calc = consume(worker)

const result = await calc.add(5, 3) // 8
```

```typescript
// worker.ts
import { provide } from '@remobj/core'

const calculator = {
  add: (a: number, b: number) => a + b,
  multiply: (a: number, b: number) => a * b
}

provide(calculator, self)
```

## ✨ Features

- **🎯 Type-Safe RPC**: Full TypeScript support with intelligent autocomplete
- **🔧 Zero Dependencies**: Pure browser APIs, no external dependencies  
- **🌐 Universal Compatibility**: Works with Workers, MessagePorts, WebRTC, WebSockets
- **🛡️ Security First**: Built-in validation and prototype pollution protection
- **📦 Modular Design**: Import only what you need for optimal bundle size
- **🔄 Automatic Cleanup**: Memory management via FinalizationRegistry

## 🚀 Installation

### NPM

```bash
npm install @remobj/core
```

### Yarn

```bash
yarn add @remobj/core
```

### PNPM

```bash
pnpm add @remobj/core
```

### CDN

```html
<script type="module">
  import { provide, consume } from 'https://cdn.skypack.dev/@remobj/core'
</script>
```

## 📖 Usage

### Web Workers

Perfect for CPU-intensive tasks:

```typescript
// main.ts
import { consume } from '@remobj/core'

const worker = new Worker('./math-worker.js')
const math = consume(worker)

// Heavy computation without blocking UI
const primes = await math.calculatePrimes(10000)
const fibonacci = await math.fibonacci(40)
```

```typescript
// math-worker.ts
import { provide } from '@remobj/core'

const mathAPI = {
  calculatePrimes(max: number): number[] {
    const primes: number[] = []
    for (let i = 2; i <= max; i++) {
      if (this.isPrime(i)) primes.push(i)
    }
    return primes
  },

  isPrime(n: number): boolean {
    if (n < 2) return false
    for (let i = 2; i <= Math.sqrt(n); i++) {
      if (n % i === 0) return false
    }
    return true
  },

  fibonacci(n: number): number {
    if (n <= 1) return n
    return this.fibonacci(n - 1) + this.fibonacci(n - 2)
  }
}

provide(mathAPI, self)
```

### iframe Communication

Secure cross-frame communication:

```typescript
// parent.html
import { consume } from '@remobj/core'

const iframe = document.getElementById('widget') as HTMLIFrameElement
const widget = consume(iframe.contentWindow!)

await widget.setTheme('dark')
await widget.updateData({ users: 1250, revenue: 89000 })
```

```typescript
// widget.html (iframe)
import { provide } from '@remobj/core'

const widgetAPI = {
  setTheme(theme: 'light' | 'dark') {
    document.body.className = theme
  },
  
  updateData(data: { users: number; revenue: number }) {
    document.getElementById('users')!.textContent = data.users.toString()
    document.getElementById('revenue')!.textContent = `$${data.revenue}`
  }
}

provide(widgetAPI, window.parent)
```

### ServiceWorker Background Processing

```typescript
// main.ts
import { consume } from '@remobj/core'

const registration = await navigator.serviceWorker.register('./sw.js')
const sw = registration.active!
const backgroundAPI = consume(sw)

await backgroundAPI.queueForSync('user-data', userData)
const syncStatus = await backgroundAPI.getSyncStatus()
```

```typescript
// sw.ts (ServiceWorker)
import { provide } from '@remobj/core'

const syncQueue = new Map()

const backgroundAPI = {
  async queueForSync(type: string, data: any) {
    syncQueue.set(`${type}-${Date.now()}`, { type, data })
    await self.registration.sync.register(`sync-${type}`)
  },
  
  getSyncStatus() {
    return { pending: syncQueue.size, queued: Array.from(syncQueue.keys()) }
  }
}

provide(backgroundAPI, self)
```

### WebRTC Peer-to-Peer

```typescript
import { consume, dataChannelToPostMessage } from '@remobj/core'

// After WebRTC connection established
const dataChannel = peerConnection.createDataChannel('api')
const endpoint = dataChannelToPostMessage(dataChannel)
const peerAPI = consume(endpoint)

// Direct peer communication
await peerAPI.shareFile(fileData)
await peerAPI.syncGameState(gameState)
```

## 🔧 API Reference

### Core Functions

#### `provide(object, endpoint)`

Exposes an object's methods for remote access.

```typescript
function provide<T extends Record<string, any>>(
  obj: T,
  endpoint: PostMessageEndpoint
): () => void
```

**Parameters:**
- `obj` - Object with methods to expose
- `endpoint` - PostMessage-compatible endpoint

**Returns:** Cleanup function

**Example:**
```typescript
const api = { greet: (name: string) => `Hello, ${name}!` }
const cleanup = provide(api, worker)

// Later: cleanup() to remove listeners
```

#### `consume(endpoint)`

Creates a proxy for calling remote object methods.

```typescript
function consume<T = Record<string, unknown>>(
  endpoint: PostMessageEndpoint
): Wrapped<T>
```

**Parameters:**
- `endpoint` - PostMessage-compatible endpoint

**Returns:** Proxy object for remote calls

**Example:**
```typescript
const remote = consume<{ add(a: number, b: number): number }>(worker)
const result = await remote.add(2, 3) // 5
```

### Endpoint Utilities

#### `createChannel(endpoint, channelId)`

Creates an isolated communication channel.

```typescript
function createChannel(
  endpoint: PostMessageEndpoint,
  channelId: string
): PostMessageEndpoint
```

#### `streamToPostMessage(readable, writable)`

Converts streams to PostMessage interface.

```typescript
function streamToPostMessage(
  readable: ReadableStream,
  writable: WritableStream
): PostMessageEndpoint
```

#### `postMessageToStream(endpoint)`

Converts PostMessage interface to streams.

```typescript
function postMessageToStream(
  endpoint: PostMessageEndpoint
): [ReadableStream, WritableStream]
```

### Web API Adapters

#### `dataChannelToPostMessage(dataChannel)`

Adapts WebRTC DataChannel to PostMessage interface.

```typescript
function dataChannelToPostMessage(
  dataChannel: RTCDataChannel
): PostMessageEndpoint
```

#### `webSocketToPostMessage(webSocket)`

Adapts WebSocket to PostMessage interface with JSON serialization.

```typescript
function webSocketToPostMessage(
  webSocket: WebSocket
): PostMessageEndpoint
```

## 🔧 TypeScript Support

remobj provides complete TypeScript support with automatic type inference:

```typescript
interface CalculatorAPI {
  add(a: number, b: number): number
  divide(a: number, b: number): number | Error
}

// Provider
const calc: CalculatorAPI = {
  add: (a, b) => a + b,
  divide: (a, b) => b !== 0 ? a / b : new Error('Division by zero')
}
provide(calc, worker)

// Consumer - full type safety
const remote = consume<CalculatorAPI>(worker)
const result: number = await remote.add(10, 5) // ✅ Type-safe
// const invalid = await remote.subtract(1, 2) // ❌ TypeScript error
```

## 🛡️ Security Features

- **Input validation** - Ensures proper message format
- **Prototype pollution protection** - Secure object handling  
- **Function filtering** - Only exposed functions are callable
- **Error boundaries** - Remote errors don't crash host context
- **Serialization safety** - Uses structured clone algorithm

## ⚡ Performance

- **Minimal overhead** - Direct PostMessage usage
- **Efficient serialization** - Structured clone algorithm
- **Lazy evaluation** - Functions called only when needed
- **Memory management** - Automatic cleanup of references
- **Small bundle size** - 9.8kb minified, 2.7kb gzipped

## 🌍 Browser Support

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | 88+ | ✅ Full support |
| Firefox | 92+ | ✅ Full support |
| Safari | 15+ | ✅ Full support |
| Edge | 88+ | ✅ Full support |
| Node.js | 16+ | ⚠️ Limited (no DOM APIs) |

## 🔄 Migration from Comlink

remobj provides similar functionality to Comlink with enhanced TypeScript support:

```typescript
// Comlink
import * as Comlink from 'comlink'
Comlink.expose(api, self)
const remote = Comlink.wrap(worker)

// remobj
import { provide, consume } from '@remobj/core'
provide(api, self)
const remote = consume(worker)
```

Key differences:
- **Better TypeScript inference** - Full type safety out of the box
- **Smaller bundle size** - 2.7kb vs 4.2kb gzipped
- **More adapters** - WebRTC, WebSocket, custom endpoints
- **Enhanced security** - Built-in validation and protection

## 🧪 Testing

remobj is thoroughly tested with:
- **Unit tests** - 12 test suites with 95%+ coverage
- **E2E tests** - Real browser environment testing
- **Type tests** - TypeScript compilation and inference
- **Cross-browser testing** - Chrome, Firefox, Safari, Edge

Run tests:
```bash
npm test              # Unit tests in watch mode
npm run test:unit     # Unit tests once
npm run test:e2e      # E2E tests with Playwright
```

## 📚 Documentation

- **[Complete Documentation](https://remobj-docs.vercel.app)** - Comprehensive guides and API reference
- **[Quick Start](https://remobj-docs.vercel.app/guide/quick-start)** - Get started in 5 minutes
- **[Examples](https://remobj-docs.vercel.app/examples)** - Real-world use cases
- **[API Reference](https://remobj-docs.vercel.app/api)** - Complete API documentation

## 🤝 Contributing

We welcome contributions! See our [Contributing Guide](../../CONTRIBUTING.md) for details.

**Quick setup:**
```bash
git clone https://github.com/your-org/remobj-ecosystem
cd remobj-ecosystem
npm install -g @microsoft/rush
rush update && rush build
```

## 📄 License

MIT License - see [LICENSE](../../LICENSE) for details.

## 🙏 Related Projects

- **[Comlink](https://github.com/GoogleChromeLabs/comlink)** - Similar RPC library by Google
- **[Worker Utils](https://github.com/developit/workerize)** - Web Worker utilities
- **[Threads.js](https://threads.js.org/)** - Worker thread pool library

---

**remobj/core** - Making cross-context communication simple and type-safe 🚀