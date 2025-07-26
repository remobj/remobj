---
title: "Node.js Support"
description: "Guide to using Remobj in Node.js environments"
---

# Node.js Support

Learn how to use Remobj for communication in Node.js applications with worker threads, child processes, and more.

## Worker Threads

Use Remobj with Node.js worker threads:

```typescript
import { Worker, isMainThread, parentPort } from 'worker_threads'
import { provide, consume } from '@remobj/core'
import { workerThreadToPostMessage } from '@remobj/node'

// Main thread
if (isMainThread) {
  const worker = new Worker(__filename)
  const endpoint = workerThreadToPostMessage(worker)
  
  const mainAPI = {
    logMessage: (message: string) => {
      console.log('Worker says:', message)
    },
    
    getConfig: async (): Promise<Config> => {
      return await loadConfig()
    }
  }
  
  provide(mainAPI, endpoint)
  
  interface WorkerAPI {
    processData(data: any[]): Promise<any[]>
    shutdown(): Promise<void>
  }
  
  const workerAPI = consume<WorkerAPI>(endpoint)
  
  // Use worker
  const result = await workerAPI.processData(largeDataset)
  await workerAPI.shutdown()
  
} else {
  // Worker thread
  const endpoint = workerThreadToPostMessage(parentPort!)
  
  const workerAPI = {
    processData: async (data: any[]): Promise<any[]> => {
      await mainAPI.logMessage('Processing started')
      const result = data.map(item => heavyComputation(item))
      await mainAPI.logMessage('Processing complete')
      return result
    },
    
    shutdown: async (): Promise<void> => {
      await mainAPI.logMessage('Shutting down')
      process.exit(0)
    }
  }
  
  provide(workerAPI, endpoint)
  
  interface MainAPI {
    logMessage(message: string): void
    getConfig(): Promise<Config>
  }
  
  const mainAPI = consume<MainAPI>(endpoint)
}
```

## Child Processes

Communicate with child processes:

```typescript
import { spawn } from 'child_process'
import { provide, consume } from '@remobj/core'
import { childProcessToPostMessage } from '@remobj/node'

// Parent process
const child = spawn('node', ['child-process.js'], {
  stdio: ['pipe', 'pipe', 'pipe', 'ipc']
})

const endpoint = childProcessToPostMessage(child)

const parentAPI = {
  handleResult: (result: ProcessResult) => {
    console.log('Child result:', result)
  },
  
  provideResource: async (resourceId: string): Promise<Resource> => {
    return await fetchResource(resourceId)
  }
}

provide(parentAPI, endpoint)

interface ChildAPI {
  processTask(task: Task): Promise<ProcessResult>
  getStatus(): Promise<ProcessStatus>
}

const childAPI = consume<ChildAPI>(endpoint)

// Use child process
const result = await childAPI.processTask({
  type: 'compute',
  data: complexData
})
```

## TCP Socket Communication

Use TCP sockets for inter-process communication:

```typescript
import { createServer, connect } from 'net'
import { provide, consume } from '@remobj/core'
import { socketToPostMessage } from '@remobj/node'

// Server
const server = createServer((socket) => {
  const endpoint = socketToPostMessage(socket)
  
  const serverAPI = {
    authenticateUser: async (credentials: Credentials): Promise<User> => {
      return await authenticate(credentials)
    },
    
    processRequest: async (request: Request): Promise<Response> => {
      return await handleRequest(request)
    }
  }
  
  provide(serverAPI, endpoint)
  
  interface ClientAPI {
    sendNotification(notification: Notification): void
    updateStatus(status: Status): void
  }
  
  const clientAPI = consume<ClientAPI>(endpoint)
})

server.listen(8080)

// Client
const socket = connect(8080, 'localhost')
const endpoint = socketToPostMessage(socket)

const clientAPI = {
  sendNotification: (notification: Notification) => {
    console.log('Notification:', notification)
  },
  
  updateStatus: (status: Status) => {
    console.log('Status update:', status)
  }
}

provide(clientAPI, endpoint)

interface ServerAPI {
  authenticateUser(credentials: Credentials): Promise<User>
  processRequest(request: Request): Promise<Response>
}

const serverAPI = consume<ServerAPI>(endpoint)
```

## Stream Integration

Combine with Node.js streams:

```typescript
import { Readable, Writable } from 'stream'
import { nodeStreamsToEndpoint } from '@remobj/node'

// Create duplex communication from Node streams
const readable = new Readable({ objectMode: true })
const writable = new Writable({ objectMode: true })

const endpoint = nodeStreamsToEndpoint(readable, writable)

const api = {
  processStream: async function* (dataStream: AsyncIterable<any>) {
    for await (const chunk of dataStream) {
      yield await processChunk(chunk)
    }
  }
}

provide(api, endpoint)
```

## Next Steps

- [Performance Optimization](./performance) - Optimize Node.js performance
- [Testing Strategies](./testing) - Test Node.js applications