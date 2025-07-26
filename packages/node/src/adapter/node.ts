/**
 * @fileoverview Node.js API adapters for server-side communication mechanisms
 * 
 * This module provides adapters to convert various Node.js APIs into
 * standardized PostMessageEndpoint or StreamEndpoint interfaces,
 * enabling seamless integration with the remobj ecosystem in server environments.
 * 
 * Supported Node.js APIs:
 * - Child Process (child_process.fork, spawn with IPC)
 * - Worker Threads (worker_threads.Worker, MessagePort)
 * - HTTP/2 Streams
 * - TCP/Unix Domain Sockets
 * - Future: Cluster IPC, Process messaging, etc.
 * 
 * @example Child Process Usage
 * ```typescript
 * import { childProcessToPostMessage } from '@remobj/node/adapter/node'
 * import { fork } from 'child_process'
 * 
 * const child = fork('./worker.js')
 * const endpoint = childProcessToPostMessage(child)
 * const api = consume(endpoint)
 * ```
 * 
 * @example Worker Thread Usage
 * ```typescript
 * import { workerThreadToPostMessage } from '@remobj/node/adapter/node'
 * import { Worker } from 'worker_threads'
 * 
 * const worker = new Worker('./worker.js')
 * const endpoint = workerThreadToPostMessage(worker)
 * const api = consume(endpoint)
 * ```
 */

import type { PostMessageEndpoint } from '@remobj/core'
import type { StreamEndpoint } from '@remobj/stream'
import { createProxyEndpoint } from '@remobj/core'

// ============================================================================
// Node.js Child Process Adapters  
// ============================================================================

/**
 * Creates a PostMessageEndpoint from a Node.js Child Process with IPC enabled.
 * @public
 * 
 * This adapter converts a Node.js child process into a PostMessage-compatible interface,
 * enabling use with remobj's PostMessage-based APIs. Requires the child process to be
 * created with IPC enabled (fork() or spawn with stdio: 'ipc').
 * 
 * @param childProcess - The child process instance with IPC enabled
 * @returns A PostMessageEndpoint interface for the child process
 * 
 * @example
 * ```typescript
 * import { fork } from 'child_process'
 * import { childProcessToPostMessage } from '@remobj/node/adapter/node'
 * 
 * const child = fork('./worker.js')
 * const endpoint = childProcessToPostMessage(child)
 * endpoint.postMessage({ command: 'start', data: [1, 2, 3] })
 * ```
 */
export function childProcessToPostMessage(childProcess: any): PostMessageEndpoint {
  const listeners = new Set<(event: MessageEvent) => void>()
  
  // Handle incoming messages from child process
  childProcess.on('message', (data: any) => {
    const messageEvent = new MessageEvent('message', { data })
    listeners.forEach(listener => listener(messageEvent))
  })
  
  const endpoint: PostMessageEndpoint = {
    postMessage: (data) => {
      if (childProcess.connected) {
        childProcess.send(data)
      }
    },
    addEventListener: (type, listener) => {
      if (type === 'message') {
        listeners.add(listener)
      }
    },
    removeEventListener: (type, listener) => {
      if (type === 'message') {
        listeners.delete(listener)
      }
    }
  }
  
  return createProxyEndpoint(endpoint)
}

// ============================================================================
// Node.js Worker Thread Adapters
// ============================================================================

/**
 * Creates a PostMessageEndpoint from a Node.js Worker Thread.
 * @public
 */
export function workerThreadToPostMessage(worker: any): PostMessageEndpoint {
  const listeners = new Set<(event: MessageEvent) => void>()
  
  // Handle incoming messages from worker
  worker.on('message', (data: any) => {
    const messageEvent = new MessageEvent('message', { data })
    listeners.forEach(listener => listener(messageEvent))
  })
  
  const endpoint: PostMessageEndpoint = {
    postMessage: (data) => {
      worker.postMessage(data)
    },
    addEventListener: (type, listener) => {
      if (type === 'message') {
        listeners.add(listener)
      }
    },
    removeEventListener: (type, listener) => {
      if (type === 'message') {
        listeners.delete(listener)
      }
    }
  }
  
  return createProxyEndpoint(endpoint)
}

// ============================================================================
// Node.js Stream Adapters
// ============================================================================

/**
 * Converts Node.js readable/writable streams to a StreamEndpoint.
 * @public
 */
export function nodeStreamsToStreamEndpoint(readable: any, writable: any): StreamEndpoint {
  // Convert Node.js Readable to Web ReadableStream
  const outputStream = new ReadableStream({
    start(controller) {
      readable.on('data', (chunk: any) => {
        controller.enqueue(chunk)
      })
      
      readable.on('end', () => {
        controller.close()
      })
      
      readable.on('error', (error: any) => {
        controller.error(error)
      })
    }
  })
  
  // Convert Web WritableStream to Node.js Writable
  const inputStream = new WritableStream({
    write(chunk) {
      return new Promise((resolve, reject) => {
        writable.write(chunk, (error: Error | null) => {
          if (error) reject(error)
          else resolve()
        })
      })
    },
    
    close() {
      return new Promise((resolve) => {
        writable.end(resolve)
      })
    }
  })
  
  return {
    input: inputStream,
    output: outputStream
  }
}

// ============================================================================
// Node.js Socket Adapters
// ============================================================================

/**
 * Creates a PostMessageEndpoint from a Node.js Socket using line-delimited JSON.
 * @public
 */
export function socketToPostMessage(socket: any): PostMessageEndpoint {
  const listeners = new Set<(event: MessageEvent) => void>()
  let buffer = ''
  
  // Handle incoming data with line-delimited JSON protocol
  socket.on('data', (chunk: Buffer) => {
    buffer += chunk.toString()
    
    // Process complete lines (messages)
    const lines = buffer.split('\n')
    buffer = lines.pop() || '' // Keep incomplete line in buffer
    
    lines.forEach(line => {
      if (line.trim()) {
        try {
          const data = JSON.parse(line)
          const messageEvent = new MessageEvent('message', { data })
          listeners.forEach(listener => listener(messageEvent))
        } catch (error) {
          console.warn('Failed to parse socket message as JSON:', error)
        }
      }
    })
  })
  
  const endpoint: PostMessageEndpoint = {
    postMessage: (data) => {
      if (!socket.destroyed) {
        const message = JSON.stringify(data) + '\n'
        socket.write(message)
      }
    },
    addEventListener: (type, listener) => {
      if (type === 'message') {
        listeners.add(listener)
      }
    },
    removeEventListener: (type, listener) => {
      if (type === 'message') {
        listeners.delete(listener)
      }
    }
  }
  
  return createProxyEndpoint(endpoint)
}