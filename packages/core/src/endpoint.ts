/**
 * @fileoverview Core PostMessage endpoint types and functions
 * 
 * This module provides the fundamental PostMessage-based building blocks for remobj communication:
 * - PostMessageEndpoint: Event-driven interface compatible with Web Workers, MessagePorts, etc.
 * - Channel creation for isolated communication
 * - Connection utilities for bidirectional bridges
 * 
 * For stream-based functionality, see the stream module.
 * For logging capabilities, see the logging module.
 * For platform-specific adapters, see the adapter/ directory.
 */

import { createProxyEndpoint } from './devtools'

/**
 * Event listener type for PostMessage events
 * @internal
 */
type Listener<T> = (this: unknown, ev: MessageEvent<T>) => any

/**
 * Standard PostMessage-based communication interface compatible with:
 * @public
 * - Web Workers (Worker, SharedWorker)
 * - Message Ports (MessagePort)
 * - Broadcast Channels (BroadcastChannel) 
 * - Service Workers (ServiceWorkerGlobalScope)
 * - Windows (Window)
 * 
 * @template T - The message data type (defaults to any)
 * 
 * @example
 * ```typescript
 * const worker = new Worker('worker.js')
 * // Worker already implements PostMessageEndpoint
 * worker.postMessage('Hello')
 * worker.addEventListener('message', (e) => console.log(e.data))
 * ```
 */
export interface PostMessageEndpoint<T = any> {
  /**
   * Sends a message to the endpoint
   * @param data - The data to send
   */
  postMessage(data: any): void
  
  /**
   * Adds an event listener for incoming messages
   * @param type - The event type ('message')
   * @param listener - The message event listener
   */
  addEventListener(type: 'message', listener: Listener<T>): void;
  
  /**
   * Removes an event listener for incoming messages
   * @param type - The event type ('message')
   * @param listener - The message event listener to remove
   */
  removeEventListener(type: 'message', listener: Listener<T>): void;
}

/**
 * PostMessage endpoint specialized for string messages
 * @public
 */
export type PostMessageEndpointString = PostMessageEndpoint<string>;



/**
 * Creates an isolated communication channel over a shared PostMessageEndpoint.
 * @public
 * Messages are filtered by channel name, allowing multiple independent
 * communication streams over a single endpoint.
 * 
 * This is useful for:
 * - Creating separate APIs over one Worker connection
 * - Isolating different communication contexts
 * - Implementing multiplexed communication protocols
 * 
 * @param endpoint - The shared PostMessageEndpoint to create a channel on
 * @param channelName - Unique identifier for this channel (string or number)
 * @returns A new PostMessageEndpoint that only sends/receives messages for this channel
 * 
 * @example
 * ```typescript
 * const worker = new Worker('worker.js')
 * 
 * // Create separate channels for different APIs
 * const mathChannel = createChannel(worker, 'math')
 * const dbChannel = createChannel(worker, 'database')
 * 
 * // Each channel operates independently
 * mathChannel.postMessage({ operation: 'add', values: [1, 2] })
 * dbChannel.postMessage({ query: 'SELECT * FROM users' })
 * ```
 */
export function createChannel(endpoint: PostMessageEndpoint, channelName: string | number): PostMessageEndpoint {
  const wrappedEndpoint = createProxyEndpoint(endpoint)
  
  const channelListeners = new Set<Listener<any>>()
  
  // Listen for messages on the main endpoint and filter by channel
  const channelListener: Listener<any> = (event) => {
    if (event.data && typeof event.data === 'object' && event.data.channel === channelName) {
      // Create new event with unwrapped data
      const channelEvent = new MessageEvent('message', { data: event.data.payload })
      channelListeners.forEach(listener => listener(channelEvent))
    }
  }
  
  wrappedEndpoint.addEventListener('message', channelListener)
  
  return {
    postMessage(data) {
      // Wrap data with channel information
      wrappedEndpoint.postMessage({
        channel: channelName,
        payload: data
      })
    },
    addEventListener(type, listener) {
      if (type === 'message') {
        channelListeners.add(listener)
      }
    },
    removeEventListener(type, listener) {
      if (type === 'message') {
        channelListeners.delete(listener)
      }
    }
  }
}


/**
 * Establishes bidirectional communication between two PostMessageEndpoints.
 * @public
 * All messages sent to endpointA will be forwarded to endpointB and vice versa.
 * 
 * This creates a communication bridge, useful for:
 * - Connecting different communication contexts
 * - Creating proxy/relay patterns
 * - Bridging incompatible endpoint types
 * 
 * @param endpointA - First endpoint to connect
 * @param endpointB - Second endpoint to connect
 * @returns Cleanup function to disconnect the endpoints
 * 
 * @example
 * ```typescript
 * const workerA = new Worker('workerA.js')
 * const workerB = new Worker('workerB.js')
 * 
 * // Create bidirectional bridge between workers
 * const disconnect = connectEndpoints(workerA, workerB)
 * 
 * // Now workerA and workerB can communicate directly
 * // Clean up when done
 * disconnect()
 * ```
 */
export function connectEndpoints(endpointA: PostMessageEndpoint, endpointB: PostMessageEndpoint): () => void {
  const wrappedEndpointA = createProxyEndpoint(endpointA)
  const wrappedEndpointB = createProxyEndpoint(endpointB)
  
  // Create listeners for bidirectional communication
  const listenerA: Listener<any> = (event) => {
    wrappedEndpointB.postMessage(event.data)
  }
  
  const listenerB: Listener<any> = (event) => {
    wrappedEndpointA.postMessage(event.data)
  }
  
  // Connect the endpoints
  wrappedEndpointA.addEventListener('message', listenerA)
  wrappedEndpointB.addEventListener('message', listenerB)
  
  // Return cleanup function
  return () => {
    wrappedEndpointA.removeEventListener('message', listenerA)
    wrappedEndpointB.removeEventListener('message', listenerB)
  }
}



