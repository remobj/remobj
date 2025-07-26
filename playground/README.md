# @remobj/playground

Interactive demonstration of the Remobj ecosystem showcasing cross-context communication across various JavaScript environments.

## Features

The playground demonstrates:

- **🧮 Web Worker Communication** - CPU-intensive calculations in workers
- **🖼️ Cross-Frame Communication** - Bidirectional iframe messaging
- **🌐 WebRTC Data Channels** - Peer-to-peer communication
- **📡 BroadcastChannel** - Cross-tab messaging
- **⚙️ ServiceWorker Integration** - Background processing and caching
- **🌊 Streaming Data** - Real-time data flow with @remobj/stream

## Development

```bash
# Install dependencies
rush update

# Start development server
cd packages/playground
npm run dev
```

Visit http://localhost:3000 to explore the interactive demos.

## Architecture

### Main Application (`src/main.ts`)
- Orchestrates all communication demos
- Provides unified UI for testing different contexts
- Demonstrates proper error handling and status management

### Workers
- `calculator.ts` - CPU-intensive mathematical operations
- `stream-worker.ts` - Data streaming demonstration
- `service-worker.ts` - Background processing and caching

### Cross-Frame Communication
- `iframe-child.html` - Embedded iframe with bidirectional communication
- Demonstrates theme switching and data exchange

### WebRTC Integration
- Local peer connection setup
- Data channel creation and management
- Message exchange demonstration

## Key Concepts Demonstrated

### Type Safety
All communication maintains full TypeScript type safety:

```typescript
interface WorkerAPI {
  add(a: number, b: number): Promise<number>
  fibonacci(n: number): Promise<number>
}

const workerAPI = consume<WorkerAPI>(worker)
const result = await workerAPI.add(5, 3) // Fully typed!
```

### Error Handling
Proper error handling across all communication channels:

```typescript
try {
  const result = await api.someMethod()
  // Handle success
} catch (error) {
  // Handle remote errors gracefully
}
```

### Bidirectional Communication
Both sides can provide and consume APIs:

```typescript
// Main thread
provide(mainAPI, worker)
const workerAPI = consume<WorkerAPI>(worker)

// Worker
provide(workerAPI, self)
const mainAPI = consume<MainAPI>(self)
```

### Streaming Data
Real-time data processing with streams:

```typescript
const stream = postMessageToStream(endpoint)
const reader = stream.getReader()

while (true) {
  const { done, value } = await reader.read()
  if (done) break
  
  // Process streamed data
  processData(value)
}
```

## Use Cases

This playground demonstrates solutions for:

- **CPU-intensive tasks** without blocking the UI
- **Real-time collaboration** between users
- **Cross-origin communication** in embedded content
- **Background data processing** with ServiceWorkers
- **Multi-tab coordination** with BroadcastChannels
- **Peer-to-peer applications** with WebRTC

## Browser Support

The playground works in all modern browsers that support:
- Web Workers
- PostMessage API
- WebRTC (for peer demos)
- ServiceWorkers (for SW demos)
- BroadcastChannel (for cross-tab demos)

## Educational Value

Perfect for:
- Learning cross-context communication patterns
- Understanding async/await with remote calls
- Exploring different JavaScript execution environments
- Testing remobj features in realistic scenarios
- Building proof-of-concepts for complex applications

Explore the code to see how remobj simplifies what would traditionally require complex message passing protocols!