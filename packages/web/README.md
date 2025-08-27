# @remobj/web

Web browser specific implementations for RemObj. Provides ready-to-use endpoints for WebSockets, Web Workers, Service Workers, MessagePort, and WebRTC DataChannels.

## Installation

```bash
npm install @remobj/web @remobj/core
```

## Key Features

- **Window Endpoints**: Communication between different browser windows/frames
- **Service Worker Support**: Both internal (inside SW) and external (main thread) endpoints
- **WebRTC DataChannel**: Real-time communication endpoint
- **DevTools Integration**: Automatic debugging support for all endpoints
- **Type Safety**: Full TypeScript support for all web APIs

## Basic Usage

### Window Communication

```typescript
import { windowEndpoint } from '@remobj/web'
import { provide, consume } from '@remobj/core'

// In parent window - provide API
const api = {
  getData: () => fetch('/api/data').then(r => r.json()),
  calculate: (x: number, y: number) => x + y
}

const iframe = document.getElementById('myFrame') as HTMLIFrameElement
const endpoint = windowEndpoint(iframe.contentWindow!, 'parent-to-iframe')

provide(api, endpoint)

// In iframe - consume API
const parentEndpoint = windowEndpoint(window.parent, 'iframe-to-parent')
const parentAPI = consume<typeof api>(parentEndpoint)

const result = await parentAPI.calculate(5, 3)
```

### Service Worker Communication

```typescript
import { getServiceWorkerEndpoint, getServiceWorkerInternalEndpoint } from '@remobj/web'
import { provide, consume } from '@remobj/core'

// In main thread - communicate with Service Worker
const swEndpoint = getServiceWorkerEndpoint('cache-api')
const cacheAPI = consume(swEndpoint)

await cacheAPI.preloadData(['url1', 'url2'])

// Inside Service Worker - provide API to main thread
const api = {
  preloadData: async (urls: string[]) => {
    for (const url of urls) {
      await caches.open('v1').then(cache => cache.add(url))
    }
  },
  clearCache: () => caches.delete('v1')
}

const mainEndpoint = getServiceWorkerInternalEndpoint(
  self as ServiceWorkerGlobalScope, 
  'cache-api',
  { type: 'window' } // Target only window clients
)

provide(api, mainEndpoint)
```

### WebRTC DataChannel

```typescript
import { createRTCEndpoint } from '@remobj/web'
import { provide, consume } from '@remobj/core'

// Peer 1 - Setup RTC connection and provide API
const pc = new RTCPeerConnection()
const dataChannel = pc.createDataChannel('remobj')

const api = {
  sendMessage: (message: string) => console.log('Received:', message),
  getStatus: () => ({ connected: true, timestamp: Date.now() })
}

dataChannel.onopen = () => {
  const endpoint = createRTCEndpoint(dataChannel, 'peer1')
  provide(api, endpoint)
}

// Peer 2 - Consume remote API
pc.ondatachannel = (event) => {
  const channel = event.channel
  const endpoint = createRTCEndpoint(channel, 'peer2')
  const remoteAPI = consume<typeof api>(endpoint)
  
  // Use remote API
  await remoteAPI.sendMessage('Hello from peer 2!')
  const status = await remoteAPI.getStatus()
}
```

### Advanced Service Worker Targeting

```typescript
import { getServiceWorkerInternalEndpoint } from '@remobj/web'

// Target specific client types
const windowEndpoint = getServiceWorkerInternalEndpoint(
  self as ServiceWorkerGlobalScope,
  'window-only',
  { type: 'window' }
)

const workerEndpoint = getServiceWorkerInternalEndpoint(
  self as ServiceWorkerGlobalScope,
  'worker-only', 
  { type: 'worker' }
)

const allClientsEndpoint = getServiceWorkerInternalEndpoint(
  self as ServiceWorkerGlobalScope,
  'broadcast',
  { includeUncontrolled: true }
)
```

## Main Exports

### Window Communication
- `windowEndpoint(window, name?)` - Create endpoint for window/iframe communication

### Service Worker Communication  
- `getServiceWorkerEndpoint(name?)` - Get endpoint to communicate with Service Worker from main thread
- `getServiceWorkerInternalEndpoint(self, name?, options?)` - Create endpoint inside Service Worker to communicate with clients

### WebRTC Communication
- `createRTCEndpoint(dataChannel, name?)` - Create endpoint from RTCDataChannel

## Service Worker Client Options

The `getServiceWorkerInternalEndpoint` accepts standard `ClientQueryOptions`:

```typescript
interface ClientQueryOptions {
  includeUncontrolled?: boolean  // Include uncontrolled clients
  type?: 'window' | 'worker' | 'sharedworker' | 'all'  // Client type filter
}
```

## TypeScript Support

All endpoints are fully typed and integrate seamlessly with RemObj's type system:

```typescript
import { windowEndpoint } from '@remobj/web'
import { provide, consume } from '@remobj/core'

interface MyAPI {
  getUser: (id: string) => Promise<{ name: string; email: string }>
  updateUser: (id: string, data: Partial<{ name: string; email: string }>) => Promise<void>
}

// Provider side
const api: MyAPI = {
  getUser: async (id) => ({ name: 'John', email: 'john@example.com' }),
  updateUser: async (id, data) => { /* update logic */ }
}

const endpoint = windowEndpoint(targetWindow, 'user-api')
provide(api, endpoint)

// Consumer side  
const remoteAPI = consume<MyAPI>(endpoint)
const user = await remoteAPI.getUser('123') // Fully typed result
```

## Error Handling

All endpoints properly propagate errors across the communication boundary:

```typescript
const endpoint = windowEndpoint(targetWindow)
const api = consume(endpoint)

try {
  await api.riskyOperation()
} catch (error) {
  // Error from remote side is available here
  console.error('Remote operation failed:', error)
}
```

## Repository

Part of the [RemObj monorepo](https://github.com/remobj/remobj). For more information, examples, and documentation, visit the main repository.

## License

MIT