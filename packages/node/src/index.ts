/**
 * @fileoverview remobj/node - Node.js-specific adapters for cross-context communication
 * 
 * This package provides Node.js-specific adapters that convert server-side communication
 * mechanisms into standardized PostMessageEndpoint or StreamEndpoint interfaces,
 * enabling seamless integration with the remobj ecosystem in server environments.
 * 
 * ## Core Features
 * 
 * - **🚀 Node.js Integration**: Native support for Child Process, Worker Threads, and more
 * - **🔧 Universal Compatibility**: Works with TCP sockets, Unix domain sockets, streams
 * - **🛡️ Security First**: Built-in validation and error handling
 * - **📦 Modular Design**: Import only what you need for optimal bundle size
 * - **🔄 Stream Support**: Bidirectional communication through Node.js streams
 * 
 * @example Basic Child Process Communication
 * ```typescript
 * // === main.js (Parent Process) ===
 * import { fork } from 'child_process'
 * import { childProcessToPostMessage } from '@remobj/node'
 * import { consume } from '@remobj/core'
 * 
 * const child = fork('./worker.js')
 * const endpoint = childProcessToPostMessage(child)
 * const api = consume(endpoint)
 * 
 * const result = await api.processData({ input: 'large dataset' })
 * console.log('Result:', result)
 * 
 * // === worker.js (Child Process) ===
 * import { provide } from '@remobj/core'
 * 
 * const workerAPI = {
 *   processData: async (data) => {
 *     // CPU-intensive processing here
 *     return { processed: data.input.toUpperCase() }
 *   }
 * }
 * 
 * provide(workerAPI, process)
 * ```
 * 
 * @example Worker Thread Communication
 * ```typescript
 * // === main.js (Main Thread) ===
 * import { Worker } from 'worker_threads'
 * import { workerThreadToPostMessage } from '@remobj/node'
 * import { consume } from '@remobj/core'
 * 
 * const worker = new Worker('./worker.js')
 * const endpoint = workerThreadToPostMessage(worker)
 * const api = consume(endpoint)
 * 
 * const result = await api.computeIntensive({ data: 'computation' })
 * 
 * // === worker.js (Worker Thread) ===
 * import { provide } from '@remobj/core'
 * import { parentPort } from 'worker_threads'
 * 
 * const computeAPI = {
 *   computeIntensive: (params) => {
 *     // Heavy computation
 *     return { result: 42 }
 *   }
 * }
 * 
 * provide(computeAPI, parentPort)
 * ```
 * 
 * @example TCP Socket Communication
 * ```typescript
 * import { createConnection } from 'net'
 * import { socketToPostMessage } from '@remobj/node'
 * import { consume } from '@remobj/core'
 * 
 * const socket = createConnection({ port: 8080, host: 'localhost' })
 * const endpoint = socketToPostMessage(socket)
 * const api = consume(endpoint)
 * 
 * // JSON-serialized remote calls over TCP
 * const response = await api.serverMethod({ request: 'data' })
 * ```
 * 
 * @author remobj Team
 * @license MIT (non-commercial) / €50/month (commercial)
 * @version 1.0.0
 */

// ============================================================================
// Node.js API Adapters
// ============================================================================

/**
 * Node.js-specific adapters that convert server-side communication mechanisms
 * into standardized PostMessageEndpoint or StreamEndpoint interfaces.
 * 
 * Supported Node.js APIs:
 * - Child Process (child_process.fork, spawn with IPC)
 * - Worker Threads (worker_threads.Worker, MessagePort)
 * - TCP/Unix Domain Sockets with JSON serialization
 * - Node.js Streams to Web Streams conversion
 */
export {
  childProcessToPostMessage,
  workerThreadToPostMessage,
  nodeStreamsToStreamEndpoint,
  socketToPostMessage
} from './adapter/node'

// ============================================================================
// Note: Core Types and Functions
// ============================================================================

/**
 * This package provides only Node.js-specific adapters. 
 * For core functionality, import directly from the respective packages:
 * 
 * ```typescript
 * import { consume, provide } from '@remobj/core'
 * import { streamToPostMessage } from '@remobj/stream'
 * import { childProcessToPostMessage } from '@remobj/node'
 * ```
 */