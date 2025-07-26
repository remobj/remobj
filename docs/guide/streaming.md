---
title: "Streaming Data"
description: "Guide to streaming data with Remobj"
---

# Streaming Data

Learn how to handle continuous data streams and real-time communication with Remobj.

## Stream Basics

Remobj provides utilities for working with Web Streams API:

```typescript
import { postMessageToStream, streamToPostMessage } from '@remobj/stream'

// Convert PostMessage to streams
const { readable, writable } = postMessageToStream(worker)

// Send data through writable stream
const writer = writable.getWriter()
await writer.write({ type: 'data', payload: largeDataset })
await writer.close()

// Read data from readable stream
const reader = readable.getReader()
while (true) {
  const { done, value } = await reader.read()
  if (done) break
  
  console.log('Received:', value)
}
```

## Real-time Data Processing

Stream large datasets in chunks:

```typescript
// Worker
const workerAPI = {
  processStreamData: async function* (dataStream: AsyncIterable<DataChunk>) {
    for await (const chunk of dataStream) {
      const processed = await processChunk(chunk)
      yield processed
    }
  }
}

// Main thread
async function processLargeDataset(data: any[]) {
  const chunks = chunkArray(data, 1000)
  
  const results = []
  for await (const processedChunk of workerAPI.processStreamData(chunks)) {
    results.push(processedChunk)
    updateProgress(results.length / chunks.length)
  }
  
  return results.flat()
}
```

## Bidirectional Streaming

Create duplex communication channels:

```typescript
import { createDuplexStreams } from '@remobj/stream'

// Create duplex streams
const [localStream, remoteStream] = createDuplexStreams()

// Provide streams to worker
provide({
  getInputStream: () => remoteStream.readable,
  getOutputStream: () => remoteStream.writable
}, worker)

// Use local streams
const writer = localStream.writable.getWriter()
const reader = localStream.readable.getReader()

// Send data
await writer.write({ command: 'start' })

// Receive responses
const response = await reader.read()
console.log('Worker response:', response.value)
```

## Stream Multiplexing

Handle multiple streams over a single connection:

```typescript
import { multiplexStreams } from '@remobj/stream'

// Create multiplexed streams
const { createChannel, readable, writable } = multiplexStreams()

// Create named channels
const dataChannel = createChannel('data')
const controlChannel = createChannel('control')
const logChannel = createChannel('logs')

// Send data to specific channels
const dataWriter = dataChannel.writable.getWriter()
await dataWriter.write({ payload: largeData })

// Receive from specific channels
const controlReader = controlChannel.readable.getReader()
const controlMessage = await controlReader.read()
```

## Next Steps

- [WebRTC Integration](./webrtc) - Stream over WebRTC data channels
- [Performance Optimization](./performance) - Optimize streaming performance