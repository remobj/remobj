# @remobj/stream

> Stream utilities for bidirectional communication using Web Streams API

[![npm version](https://img.shields.io/npm/v/@remobj/stream.svg)](https://www.npmjs.com/package/@remobj/stream)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/@remobj/stream.svg)](https://bundlephobia.com/package/@remobj/stream)

@remobj/stream provides stream-based communication utilities that convert between PostMessage and Web Streams APIs, enabling efficient bidirectional data flow, stream multiplexing, and complex data processing pipelines.

## ✨ Features

- **🌊 Web Streams API**: Built on modern Web Streams for maximum compatibility
- **🔄 Bidirectional Communication**: Convert between PostMessage and Stream interfaces
- **📡 Stream Multiplexing**: Combine multiple streams into unified channels
- **🔗 Stream Bridging**: Connect different stream endpoints seamlessly
- **⚡ Backpressure Handling**: Automatic flow control and memory management
- **🎯 Type-Safe**: Full TypeScript support with intelligent type inference

## 🚀 Quick Start

### Installation

```bash
npm install @remobj/stream @remobj/core
```

### Basic Usage

```typescript
import { streamToPostMessage, postMessageToStream } from '@remobj/stream'
import { consume, provide } from '@remobj/core'

// Create a stream endpoint
const stream = {
  input: new WritableStream(),
  output: new ReadableStream()
}

// Convert to PostMessage interface
const endpoint = streamToPostMessage(stream)
const api = consume<MyAPI>(endpoint)

// Or convert PostMessage to streams
const worker = new Worker('./worker.js')
const { input, output } = postMessageToStream(worker)
```

## 📖 Complete Examples

### Real-Time Data Processing Pipeline

```typescript
import { streamToPostMessage, createDuplexStreams } from '@remobj/stream'
import { consume, provide } from '@remobj/core'

interface DataProcessor {
  process(data: any[]): Promise<ProcessedData[]>
  setConfig(config: ProcessingConfig): void
  getStats(): Promise<ProcessingStats>
}

// Create duplex streams for bidirectional communication
const [clientStream, workerStream] = createDuplexStreams()

// Set up worker with stream endpoint
const workerEndpoint = streamToPostMessage(workerStream)
const processor = consume<DataProcessor>(workerEndpoint)

// Process data in chunks
const processDataStream = async (dataStream: ReadableStream) => {
  const reader = dataStream.getReader()
  const writer = clientStream.input.getWriter()
  
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      
      // Send data to worker for processing
      await writer.write(value)
      
      // Read processed result from worker
      const processedReader = clientStream.output.getReader()
      const { value: processed } = await processedReader.read()
      processedReader.releaseLock()
      
      console.log('Processed:', processed)
    }
  } finally {
    writer.releaseLock()
  }
}

// Configure processor
await processor.setConfig({ algorithm: 'ml-enhanced', batchSize: 100 })

// Process streaming data
const dataStream = new ReadableStream({
  start(controller) {
    // Generate streaming data
    setInterval(() => {
      controller.enqueue(generateDataBatch())
    }, 100)
  }
})

processDataStream(dataStream)
```

### File Transfer with Progress Tracking

```typescript
import { streamToPostMessage, createDuplexStreams } from '@remobj/stream'
import { consume, provide } from '@remobj/core'

interface FileTransferAPI {
  uploadFile(filename: string): Promise<void>
  downloadFile(filename: string): Promise<void>
  onProgress(transferred: number, total: number): void
}

const [clientStream, serverStream] = createDuplexStreams()
const endpoint = streamToPostMessage(serverStream)

// Client side
const fileAPI = consume<FileTransferAPI>(endpoint)

async function uploadFile(file: File) {
  const chunkSize = 64 * 1024 // 64KB chunks
  const totalChunks = Math.ceil(file.size / chunkSize)
  
  // Start upload
  await fileAPI.uploadFile(file.name)
  
  // Stream file in chunks
  const writer = clientStream.input.getWriter()
  
  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize
    const end = Math.min(start + chunkSize, file.size)
    const chunk = file.slice(start, end)
    const arrayBuffer = await chunk.arrayBuffer()
    
    await writer.write({
      type: 'chunk',
      data: arrayBuffer,
      index: i,
      total: totalChunks
    })
    
    // Track progress
    console.log(`Uploaded ${i + 1}/${totalChunks} chunks`)
  }
  
  writer.releaseLock()
}

// Server side implementation
const serverAPI: FileTransferAPI = {
  async uploadFile(filename) {
    console.log(`Starting upload for ${filename}`)
    // Initialize file upload
  },
  
  async downloadFile(filename) {
    // Stream file to client
    const fileStream = getFileStream(filename)
    const writer = serverStream.input.getWriter()
    
    const reader = fileStream.getReader()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      await writer.write(value)
    }
    
    writer.releaseLock()
  },
  
  onProgress(transferred, total) {
    console.log(`Progress: ${transferred}/${total} bytes`)
  }
}

provide(serverAPI, endpoint)
```

### Stream Multiplexing for Multiple APIs

```typescript
import { multiplexStreams, streamToPostMessage } from '@remobj/stream'
import { consume, provide, createChannel } from '@remobj/core'

// Create multiple stream endpoints
const authStream = { 
  input: new WritableStream(), 
  output: new ReadableStream() 
}
const dataStream = { 
  input: new WritableStream(), 
  output: new ReadableStream() 
}
const notificationStream = { 
  input: new WritableStream(), 
  output: new ReadableStream() 
}

// Multiplex streams with channel IDs
const multiplexed = multiplexStreams([authStream, dataStream, notificationStream], true)
const endpoint = streamToPostMessage(multiplexed)

// Create separate channels for each API
const authEndpoint = createChannel(endpoint, 'auth')
const dataEndpoint = createChannel(endpoint, 'data') 
const notificationEndpoint = createChannel(endpoint, 'notifications')

// Use separate APIs
const auth = consume<AuthAPI>(authEndpoint)
const data = consume<DataAPI>(dataEndpoint)
const notifications = consume<NotificationAPI>(notificationEndpoint)

// Each API operates independently
await auth.login('user', 'password')
const userData = await data.getUserProfile()
await notifications.subscribe('user-updates')
```

### Stream Processing with Transform Streams

```typescript
import { streamToPostMessage } from '@remobj/stream'

// Create data processing pipeline
const compressionStream = new CompressionStream('gzip')
const encryptionTransform = new TransformStream({
  transform(chunk, controller) {
    const encrypted = encrypt(chunk)
    controller.enqueue(encrypted)
  }
})

// Chain transforms
const processingPipeline = new TransformStream({
  start() {
    console.log('Processing pipeline started')
  },
  transform(chunk, controller) {
    // Custom processing logic
    const processed = processChunk(chunk)
    controller.enqueue(processed)
  }
})

// Create stream endpoint with processing pipeline
const stream = {
  input: compressionStream.writable
    .pipeThrough(encryptionTransform)
    .pipeThrough(processingPipeline),
  output: new ReadableStream({
    start(controller) {
      // Generate processed data
      setInterval(() => {
        controller.enqueue(generateProcessedData())
      }, 1000)
    }
  })
}

const endpoint = streamToPostMessage(stream)
```

## 🔧 API Reference

### Core Types

#### `StreamEndpoint<T>`
Bidirectional stream interface using Web Streams API.

```typescript
interface StreamEndpoint<T = any> {
  input: WritableStream<T>   // Data flowing into the endpoint
  output: ReadableStream<T>  // Data flowing out of the endpoint
}
```

### Conversion Functions

#### `streamToPostMessage(stream: StreamEndpoint): PostMessageEndpoint`

Converts a StreamEndpoint to PostMessage interface.

**Features:**
- Automatic message event creation
- Backpressure handling
- Error propagation

**Example:**
```typescript
const stream = { input: new WritableStream(), output: new ReadableStream() }
const endpoint = streamToPostMessage(stream)
const api = consume<MyAPI>(endpoint)
```

#### `postMessageToStream(endpoint: PostMessageEndpoint): StreamEndpoint`

Converts a PostMessage endpoint to stream interface.

**Features:**
- Transform stream based conversion
- Automatic flow control
- Memory efficient processing

**Example:**
```typescript
const worker = new Worker('./worker.js')
const { input, output } = postMessageToStream(worker)

// Write to worker
const writer = input.getWriter()
await writer.write('data')

// Read from worker  
const reader = output.getReader()
const { value } = await reader.read()
```

### Stream Utilities

#### `connectStreams(streamA: StreamEndpoint, streamB: StreamEndpoint): () => void`

Establishes bidirectional communication between two streams.

**Example:**
```typescript
const [streamA, streamB] = createDuplexStreams()
const disconnect = connectStreams(streamA, streamB)

// Later: disconnect()
```

#### `createDuplexStreams(): [StreamEndpoint, StreamEndpoint]`

Creates a pair of connected duplex streams.

**Features:**
- Bidirectional data flow
- Automatic backpressure
- Memory efficient

**Example:**
```typescript
const [clientStream, serverStream] = createDuplexStreams()

// Client writes to server
const writer = clientStream.input.getWriter()
await writer.write('Hello server')

// Server reads from client
const reader = serverStream.output.getReader()
const { value } = await reader.read() // 'Hello server'
```

#### `multiplexStreams(streams: StreamEndpoint[], addChannelId?: boolean): StreamEndpoint`

Combines multiple streams into a single multiplexed stream.

**Parameters:**
- `streams`: Array of StreamEndpoints to multiplex
- `addChannelId`: Whether to add channel ID to messages (default: false)

**Example:**
```typescript
const streams = [streamA, streamB, streamC]
const multiplexed = multiplexStreams(streams, true)

// All streams are now accessible through the multiplexed endpoint
const endpoint = streamToPostMessage(multiplexed)
```

## 🌊 Stream Patterns

### Backpressure Handling

```typescript
import { streamToPostMessage } from '@remobj/stream'

const slowProcessor = new TransformStream({
  async transform(chunk, controller) {
    // Simulate slow processing
    await new Promise(resolve => setTimeout(resolve, 100))
    controller.enqueue(processedChunk)
  }
}, {
  highWaterMark: 1  // Limit buffering for backpressure
})

const stream = {
  input: slowProcessor.writable,
  output: slowProcessor.readable
}

const endpoint = streamToPostMessage(stream)
```

### Error Handling

```typescript
const errorHandlingStream = new TransformStream({
  transform(chunk, controller) {
    try {
      const result = riskyOperation(chunk)
      controller.enqueue(result)
    } catch (error) {
      controller.error(error)
    }
  }
})

const stream = {
  input: errorHandlingStream.writable,
  output: errorHandlingStream.readable
}
```

### Data Validation

```typescript
const validationStream = new TransformStream({
  transform(chunk, controller) {
    if (isValid(chunk)) {
      controller.enqueue(chunk)
    } else {
      console.warn('Invalid data:', chunk)
      // Skip invalid data or transform it
    }
  }
})
```

## 🌍 Browser Support

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Web Streams API | ✅ 89+ | ✅ 102+ | ✅ 14.1+ | ✅ 89+ |
| Transform Streams | ✅ 67+ | ✅ 102+ | ✅ 14.1+ | ✅ 79+ |
| Readable/WritableStream | ✅ 52+ | ✅ 65+ | ✅ 10.1+ | ✅ 79+ |

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run coverage

# Development mode
npm run dev
```

## 📦 Related Packages

- **[@remobj/core](../core)**: Core communication library and PostMessage utilities
- **[@remobj/web](../web)**: Web API adapters that work with stream endpoints
- **[@remobj/node](../node)**: Node.js stream adapters and utilities

## 📄 License

ISC

---

Made with ❤️ by the remobj team