/**
 * @fileoverview Stream utilities and conversion functions for remobj communication
 * 
 * This module provides comprehensive stream functionality for remobj:
 * - StreamEndpoint interface definition
 * - Conversion functions between PostMessage and Stream interfaces
 * - Stream connection utilities for bidirectional bridges
 * - Stream-specific helper functions and utilities
 * 
 * All stream operations use the Web Streams API for maximum compatibility
 * and performance across different JavaScript environments.
 * 
 * @example Basic Stream Usage
 * ```typescript
 * import { streamToPostMessage, postMessageToStream } from '@remobj/stream'
 * 
 * const stream = { 
 *   input: new WritableStream(), 
 *   output: new ReadableStream() 
 * }
 * const endpoint = streamToPostMessage(stream)
 * ```
 */

import type { PostMessageEndpoint } from '@remobj/core'
import { createProxyEndpoint } from '@remobj/core'

type Listener<T> = (this: unknown, ev: MessageEvent<T>) => any

// ============================================================================
// Stream Interface Definition
// ============================================================================

/**
 * Stream-based communication interface using Web Streams API.
 * @public
 */
export interface StreamEndpoint<T = any> {
  input: WritableStream<T>
  output: ReadableStream<T>
}

// ============================================================================
// Stream ↔ PostMessage Conversion Functions
// ============================================================================

/**
 * Converts a StreamEndpoint to a PostMessageEndpoint using identity TransformStreams.
 * @public
 */
export function streamToPostMessage(ep: StreamEndpoint): PostMessageEndpoint {
  const event = new Set<Listener<any>>()
  const writer = ep.input.getWriter()

  const reader = ep.output.getReader()

  Promise.resolve().then(async () => {
    while (true) {
      const data = await reader.read()
      
      if(data.done) {
        break
      }

      const ev = new MessageEvent('message', {data: data.value})
      event.forEach(v => v(ev))
    }
  })

  const endpoint: PostMessageEndpoint = {
    postMessage(data) {
      writer.write(data)
    },
    addEventListener(type, listener) {
      if (type == 'message') {
        event.add(listener)
      }
    },
    removeEventListener(type, listener) {
      if (type == 'message') {
        event.delete(listener)
      }
    }
  }
  
  return createProxyEndpoint(endpoint)
}

/**
 * Converts a PostMessageEndpoint to a StreamEndpoint using identity TransformStreams.
 * @public
 */
export function postMessageToStream(endpoint: PostMessageEndpoint): StreamEndpoint {  
  const inputIdentity = new TransformStream()
  const outputIdentity = new TransformStream()
  
  const writer = outputIdentity.writable.getWriter()
  
  endpoint.addEventListener('message', (ev: MessageEvent<any>) => {
    writer.write(ev.data)
  })
  
  Promise.resolve().then(async () => {
    const reader = inputIdentity.readable.getReader()

    while (true) {
      const data = await reader.read()
      
      if(data.done) {
        break
      }

      endpoint.postMessage(data.value)
    }
  })
  
  return {
    input: inputIdentity.writable,
    output: outputIdentity.readable
  }
}

// ============================================================================
// Stream Connection Utilities
// ============================================================================

/**
 * Establishes bidirectional communication between two StreamEndpoints.
 * @public
 */
export function connectStreams(streamA: StreamEndpoint, streamB: StreamEndpoint): () => void {
  const pipeAtoB = streamA.output.pipeTo(streamB.input)
  const pipeBtoA = streamB.output.pipeTo(streamA.input)
  
  return () => {
    pipeAtoB.catch(() => {})
    pipeBtoA.catch(() => {})
  }
}

// ============================================================================
// Stream Helper Utilities
// ============================================================================

/**
 * Creates a duplex stream that can be used for bidirectional communication.
 * @public
 */
export function createDuplexStreams(): [StreamEndpoint, StreamEndpoint] {
  const transformAB = new TransformStream()
  const transformBA = new TransformStream()
  
  return [
    {
      input: transformAB.writable,
      output: transformBA.readable
    },
    {
      input: transformBA.writable,
      output: transformAB.readable
    }
  ]
}

/**
 * Creates a stream that multiplexes multiple streams into one.
 * @public
 */
export function multiplexStreams(streams: StreamEndpoint[], addChannelId = false): StreamEndpoint {
  const outputTransform = new TransformStream()
  const outputWriter = outputTransform.writable.getWriter()
  
  streams.forEach((stream, channelId) => {
    const reader = stream.output.getReader()
    
    const readStream = async () => {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        const data = addChannelId ? { channelId, data: value } : value
        await outputWriter.write(data)
      }
    }
    
    readStream().catch(console.error)
  })
  
  return {
    input: new WritableStream({
      write(chunk) {
        streams.forEach(stream => {
          const writer = stream.input.getWriter()
          writer.write(chunk).then(() => writer.releaseLock())
        })
      }
    }),
    output: outputTransform.readable
  }
}